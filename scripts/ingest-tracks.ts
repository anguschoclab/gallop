import fs from "fs";
import path from "path";

const tracksJsonPath = path.resolve(process.cwd(), "src/game/data/tracks.json");
const tracks = JSON.parse(fs.readFileSync(tracksJsonPath, "utf-8"));

interface GeometryNode {
  id: number;
  lat: number;
  lon: number;
}

interface Section {
  type: "turn" | "straight";
  length: number;
  totalAngle?: number;
  radius?: number;
}

interface Course {
  sections?: Section[];
  circumference?: number;
  straightLength?: number;
}

interface Track {
  name: string;
  country: string;
  courses: Course[];
}

const headers = {
  "User-Agent": "GallopTrackIngestor/1.0 (https://github.com/anguschoclab/gallop)",
};

async function queryOverpass(query: string) {
  const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
  const response = await fetch(url, { headers });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Overpass query failed: ${response.status} ${response.statusText} - ${text}`);
  }
  return response.json();
}

async function getTrackGeometry(name: string, country: string) {
  // Try to find the track way by name and sport
  const query = `
    [out:json][timeout:25];
    (
      way["leisure"="track"]["sport"="horse_racing"]["name"~"${name}",i];
      way["leisure"="track"]["sport"="horse_racing"]["name:en"~"${name}",i];
    );
    out body;
    >;
    out skel qt;
  `;

  try {
    const data = await queryOverpass(query);
    if (!data.elements || data.elements.length === 0) {
      console.log(`No results for ${name} in ${country}`);
      return null;
    }

    // Find the way element
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const way = data.elements.find((e: any) => e.type === "way");
    if (!way) return null;

    // Get nodes for the way
    const nodeMap = new Map<number, GeometryNode>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data.elements.filter((e: any) => e.type === "node").forEach((n: any) => nodeMap.set(n.id, n));

    const nodes = way.nodes.map((id: number) => nodeMap.get(id)).filter(Boolean) as GeometryNode[];
    return nodes;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error(`Error fetching ${name}:`, errorMessage);
    return null;
  }
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const dPhi = ((lat2 - lat1) * Math.PI) / 180;
  const dLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dPhi / 2) * Math.sin(dPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) * Math.sin(dLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function calculateSections(nodes: GeometryNode[]): Section[] {
  if (nodes.length < 3) return [];

  const sections: Section[] = [];
  let currentSection: Section | null = null;

  for (let i = 0; i < nodes.length - 1; i++) {
    const n1 = nodes[i];
    const n2 = nodes[i + 1];
    const n3 = nodes[i + 2] || nodes[0];

    const dist = calculateDistance(n1.lat, n1.lon, n2.lat, n2.lon);

    // Calculate curvature at n2
    // We look at the angle between (n1,n2) and (n2,n3)
    const bearing1 = Math.atan2(n2.lon - n1.lon, n2.lat - n1.lat);
    const bearing2 = Math.atan2(n3.lon - n2.lon, n3.lat - n2.lat);
    let angleDiff = Math.abs(bearing2 - bearing1);
    if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;

    const isTurn = angleDiff > 0.05; // ~3 degrees threshold

    const type = isTurn ? "turn" : "straight";

    if (!currentSection || currentSection.type !== type) {
      if (currentSection) sections.push(currentSection);
      currentSection = { type, length: 0 };
      if (isTurn) {
        // Estimate radius: R = length / angleChange
        currentSection.totalAngle = 0;
      }
    }

    currentSection.length += dist;
    if (isTurn) {
      currentSection.totalAngle = (currentSection.totalAngle || 0) + angleDiff;
    }
  }
  if (currentSection) sections.push(currentSection);

  // Post-process sections: combine adjacent same-types, calculate radii
  const processed: Section[] = [];
  for (const s of sections) {
    if (s.type === "turn") {
      s.radius = s.length / (s.totalAngle || 0.1);
      delete s.totalAngle;
    }
    processed.push(s);
  }

  return processed;
}

async function run() {
  for (const track of tracks as Track[]) {
    console.log(`Processing ${track.name}...`);
    const nodes = await getTrackGeometry(track.name, track.country);
    if (nodes) {
      const sections = calculateSections(nodes);
      // For simplicity, we apply these sections to all courses at the venue
      // In a real scenario, we'd distinguish between multiple ways on OSM
      track.courses.forEach((c) => {
        c.sections = sections;
        c.circumference = Math.round(
          sections.reduce((acc: number, s: Section) => acc + s.length, 0),
        );
        // Find longest straight for home straight
        const straights = sections.filter((s) => s.type === "straight");
        c.straightLength =
          straights.length > 0 ? Math.round(Math.max(...straights.map((s) => s.length))) : 400;
      });
      console.log(`  Found ${sections.length} sections.`);
    }
    // Rate limiting for Overpass
    await new Promise((r) => setTimeout(r, 1000));
  }

  fs.writeFileSync(tracksJsonPath, JSON.stringify(tracks, null, 2));
  console.log("Ingestion complete.");
}

run();
