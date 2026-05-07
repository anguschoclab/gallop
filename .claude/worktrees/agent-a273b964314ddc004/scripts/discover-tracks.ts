import fs from "fs";
import path from "path";
import crypto from "crypto";

const tracksJsonPath = path.resolve(process.cwd(), "src/game/data/tracks.json");
const existingTracks = JSON.parse(fs.readFileSync(tracksJsonPath, "utf-8"));
const existingNames = new Set(existingTracks.map((t: any) => t.name.toLowerCase()));

const headers = {
  "User-Agent": "GallopTrackExpertDiscoverer/1.0 (https://github.com/anguschoclab/gallop)",
};

const servers = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.nchc.org.tw/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];
let currentServerIndex = 0;

async function queryOverpass(query: string) {
  let attempts = 0;
  while (attempts < servers.length) {
    const url = `${servers[currentServerIndex]}?data=${encodeURIComponent(query)}`;
    try {
      const response = await fetch(url, { headers });
      if (response.status === 429 || response.status >= 500) {
        console.warn(`Server ${servers[currentServerIndex]} busy/limiting. Rotating...`);
        currentServerIndex = (currentServerIndex + 1) % servers.length;
        attempts++;
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    } catch (e) {
      console.warn(`Server ${servers[currentServerIndex]} error: ${e.message}. Rotating...`);
      currentServerIndex = (currentServerIndex + 1) % servers.length;
      attempts++;
    }
  }
  throw new Error("All Overpass servers failed.");
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const dPhi = ((lat2 - lat1) * Math.PI) / 180;
  const dLambda = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dPhi / 2) * Math.sin(dPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) * Math.sin(dLambda / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function calculateSections(geom: any[]) {
  if (geom.length < 3) return [];
  const sections: any[] = [];
  let current: any = null;

  for (let i = 0; i < geom.length - 1; i++) {
    const n1 = geom[i],
      n2 = geom[i + 1],
      n3 = geom[i + 2] || geom[0];
    const dist = calculateDistance(n1.lat, n1.lon, n2.lat, n2.lon);
    const b1 = Math.atan2(n2.lon - n1.lon, n2.lat - n1.lat);
    const b2 = Math.atan2(n3.lon - n2.lon, n3.lat - n2.lat);
    let diff = Math.abs(b2 - b1);
    if (diff > Math.PI) diff = 2 * Math.PI - diff;

    const isTurn = diff > 0.04;
    const type = isTurn ? "turn" : "straight";

    if (!current || current.type !== type) {
      if (current) sections.push(current);
      current = { type, length: 0, totalAngle: 0 };
    }
    current.length += dist;
    if (isTurn) current.totalAngle += diff;
  }
  if (current) sections.push(current);

  return sections.map((s) => {
    if (s.type === "turn") s.radius = Math.round(s.length / (s.totalAngle || 0.1));
    delete s.totalAngle;
    s.length = Math.round(s.length);
    return s;
  });
}

async function discoverCountry(countryName: string) {
  console.log(`Expert Discovery for ${countryName}...`);
  const query = `
    [out:json][timeout:120];
    area[name="${countryName}"]->.searchArea;
    (
      way(area.searchArea)["leisure"="track"]["sport"="horse_racing"](if:length() > 500);
    );
    out geom;
  `;

  try {
    const data = await queryOverpass(query);
    const ways = data.elements.filter((e: any) => e.type === "way" && e.geometry);
    let added = 0;
    for (const way of ways) {
      const name = way.tags.name || way.tags["name:en"] || `Track ${way.id}`;
      if (existingNames.has(name.toLowerCase())) continue;

      const sections = calculateSections(way.geometry);
      const circumference = Math.round(sections.reduce((acc, s) => acc + s.length, 0));
      const straightLength = Math.round(
        Math.max(...sections.filter((s) => s.type === "straight").map((s) => s.length), 300),
      );

      existingTracks.push({
        id: crypto.randomUUID(),
        name,
        country: countryName,
        osmId: way.id.toString(),
        courses: [
          {
            surface: way.tags.surface?.includes("dirt") ? "Dirt" : "Turf",
            circumference,
            straightLength,
            sections,
          },
        ],
      });
      existingNames.add(name.toLowerCase());
      added++;
    }
    console.log(`  Added ${added} tracks from ${countryName}.`);
  } catch (err) {
    console.error(`  Failed ${countryName}: ${err.message}`);
  }
}

async function run() {
  const countries = [
    "United Kingdom",
    "Ireland",
    "France",
    "United States",
    "Australia",
    "Japan",
    "United Arab Emirates",
    "Hong Kong",
    "South Africa",
  ];
  for (const country of countries) {
    await discoverCountry(country);
    await new Promise((r) => setTimeout(r, 5000));
  }
  fs.writeFileSync(tracksJsonPath, JSON.stringify(existingTracks, null, 2));
  console.log(`Expert discovery complete. Total: ${existingTracks.length}`);
}

run();
