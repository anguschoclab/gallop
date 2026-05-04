import fs from "fs";
import path from "path";

const tracksJsonPath = path.resolve(process.cwd(), "src/game/data/tracks.json");
const existingTracks = JSON.parse(fs.readFileSync(tracksJsonPath, "utf-8"));
const existingNames = new Set(existingTracks.map((t: any) => t.name.toLowerCase()));

const headers = {
  "User-Agent": "GallopTrackDiscoverer/1.0 (https://github.com/anguschoclab/gallop)",
};

const servers = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.nchc.org.tw/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter"
];
let currentServerIndex = 0;

async function queryOverpass(query: string) {
  let attempts = 0;
  while (attempts < servers.length) {
    const url = `${servers[currentServerIndex]}?data=${encodeURIComponent(query)}`;
    const response = await fetch(url, { headers });
    
    if (response.status === 429 || response.status >= 500) {
      console.warn(`Server ${servers[currentServerIndex]} busy (${response.status}). Rotating...`);
      currentServerIndex = (currentServerIndex + 1) % servers.length;
      attempts++;
      await new Promise(r => setTimeout(r, 1000));
      continue;
    }

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Overpass query failed: ${response.status} ${response.statusText} - ${text}`);
    }
    return response.json();
  }
  throw new Error("All Overpass servers are currently rate-limiting or down.");
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // meters
  const phi1 = lat1 * Math.PI / 180;
  const phi2 = lat2 * Math.PI / 180;
  const dPhi = (lat2 - lat1) * Math.PI / 180;
  const dLambda = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(dPhi / 2) * Math.sin(dPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(dLambda / 2) * Math.sin(dLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function calculateSections(nodes: any[]) {
  if (nodes.length < 3) return [];
  const sections: any[] = [];
  let currentSection: any = null;

  for (let i = 0; i < nodes.length - 1; i++) {
    const n1 = nodes[i];
    const n2 = nodes[i + 1];
    const n3 = nodes[i + 2] || nodes[0];

    const dist = calculateDistance(n1.lat, n1.lon, n2.lat, n2.lon);
    const bearing1 = Math.atan2(n2.lon - n1.lon, n2.lat - n1.lat);
    const bearing2 = Math.atan2(n3.lon - n2.lon, n3.lat - n2.lat);
    let angleDiff = Math.abs(bearing2 - bearing1);
    if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;

    const isTurn = angleDiff > 0.04; // threshold
    const type = isTurn ? "turn" : "straight";

    if (!currentSection || currentSection.type !== type) {
      if (currentSection) sections.push(currentSection);
      currentSection = { type, length: 0, totalAngle: 0 };
    }
    currentSection.length += dist;
    if (isTurn) currentSection.totalAngle += angleDiff;
  }
  if (currentSection) sections.push(currentSection);

  return sections.map(s => {
    if (s.type === "turn") {
      s.radius = Math.round(s.length / (s.totalAngle || 0.1));
    }
    delete s.totalAngle;
    s.length = Math.round(s.length);
    return s;
  });
}

async function discoverGlobal() {
  console.log("Performing lightweight global discovery (CSV mode)...");
  const query = `
    [out:csv(::id, name, "name:en", "addr:country", surface; true; "|")][timeout:120];
    way["leisure"="track"]["sport"="horse_racing"];
    out body;
  `;

  try {
    const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
    const response = await fetch(url, { headers });
    const text = await response.text();
    const lines = text.split("\n").slice(1); // Skip header

    const newTracksMeta = [];
    for (const line of lines) {
      if (!line.trim()) continue;
      const [id, name, nameEn, country, surface] = line.split("|");
      const bestName = name || nameEn || `Track ${id}`;
      
      if (!existingNames.has(bestName.toLowerCase())) {
        newTracksMeta.push({ id, name: bestName, country, surface });
      }
    }

    console.log(`Found ${newTracksMeta.length} new tracks globally. Fetching geometry for a sample of 200...`);

    // Only fetch geometry for a limited batch to be a good citizen
    const batch = newTracksMeta.slice(0, 200);
    for (const meta of batch) {
      console.log(`  Fetching geometry for ${meta.name}...`);
      const geomQuery = `
        [out:json][timeout:30];
        way(${meta.id});
        out body;
        >;
        out skel qt;
      `;
      
      try {
        const data = await queryOverpass(geomQuery);
        const way = data.elements.find((e: any) => e.type === "way");
        const nodeMap = new Map();
        data.elements.filter((e: any) => e.type === "node").forEach((n: any) => nodeMap.set(n.id, n));

        const nodes = way.nodes.map((id: number) => nodeMap.get(id)).filter(Boolean);
        if (nodes.length < 5) continue;

        const sections = calculateSections(nodes);
        const circumference = sections.reduce((acc, s) => acc + s.length, 0);
        if (circumference < 500) continue;

        const straights = sections.filter(s => s.type === "straight");
        const straightLength = straights.length > 0 ? Math.max(...straights.map(s => s.length)) : 300;

        existingTracks.push({
          id: crypto.randomUUID(),
          name: meta.name,
          country: meta.country || "International",
          osmId: meta.id,
          courses: [{
            surface: meta.surface?.includes("dirt") ? "Dirt" : "Turf",
            circumference,
            straightLength,
            sections
          }]
        });
        existingNames.add(meta.name.toLowerCase());
      } catch (e) {
        console.error(`    Failed to fetch ${meta.name}: ${e.message}`);
      }
      await new Promise(r => setTimeout(r, 2000)); // Gentle 2s delay
    }

  } catch (err) {
    console.error(`Global discovery failed: ${err.message}`);
  }
}

async function run() {
  await discoverGlobal();
  fs.writeFileSync(tracksJsonPath, JSON.stringify(existingTracks, null, 2));
  console.log(`Process complete. Total tracks in database: ${existingTracks.length}`);
}

run();
