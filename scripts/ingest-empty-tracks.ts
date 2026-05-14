import fs from "fs";
import path from "path";
import https from "https";
import type { OverpassElement, OverpassWay, OverpassNode } from "./types/overpass";

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
  id: string;
  name: string;
  country: string;
  courses: Course[];
  osmId?: string;
  dataSource?: string;
}

interface IngestionResult {
  id: string;
  name: string;
  sectionsCount?: number;
  circumference?: number;
  osmId?: string;
  matchedName?: string;
  country?: string;
  reason?: string;
  error?: string;
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
  // Try name variations for better matching
  const nameVariations = [
    name,
    name.replace("Hipódromo de ", ""),
    name.replace("Hipódromo ", ""),
    name.replace("Hipódromo Argentino de ", ""),
    name.replace("Hipódromo da ", ""),
    name.normalize("NFD").replace(/[\u0300-\u036f]/g, ""), // Remove accents
  ];

  for (const tryName of nameVariations) {
    const query = `
      [out:json][timeout:25];
      (
        way["leisure"="track"]["sport"="horse_racing"]["name"~"${tryName}",i];
        way["leisure"="track"]["sport"="horse_racing"]["name:en"~"${tryName}",i];
      );
      out body;
      >;
      out skel qt;
    `;

    try {
      const data = await queryOverpass(query);
      if (data.elements && data.elements.length > 0) {
        const way = data.elements.find((e: OverpassElement): e is OverpassWay => e.type === "way");
        if (way) {
          const nodeMap = new Map<number, GeometryNode>();
          data.elements
            .filter((e: OverpassElement): e is OverpassNode => e.type === "node")
            .forEach((n: OverpassNode) => nodeMap.set(n.id, { id: n.id, lat: n.lat, lon: n.lon }));
          const nodes = way.nodes
            .map((id: number) => nodeMap.get(id))
            .filter(Boolean) as GeometryNode[];
          return { nodes, osmId: way.id.toString(), matchedName: tryName };
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(`  Error querying "${tryName}":`, errorMessage);
    }
  }

  return null;
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

function calculateSections(nodes: GeometryNode[]): Section[] {
  if (nodes.length < 3) return [];

  const sections: Section[] = [];
  let currentSection: Section | null = null;

  for (let i = 0; i < nodes.length - 1; i++) {
    const n1 = nodes[i];
    const n2 = nodes[i + 1];
    const n3 = nodes[i + 2] || nodes[0];

    const dist = calculateDistance(n1.lat, n1.lon, n2.lat, n2.lon);
    const bearing1 = Math.atan2(n2.lon - n1.lon, n2.lat - n1.lat);
    const bearing2 = Math.atan2(n3.lon - n2.lon, n3.lat - n2.lat);
    let angleDiff = Math.abs(bearing2 - bearing1);
    if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;

    const isTurn = angleDiff > 0.05;
    const type = isTurn ? "turn" : "straight";

    if (!currentSection || currentSection.type !== type) {
      if (currentSection) sections.push(currentSection);
      currentSection = { type, length: 0, totalAngle: 0 };
    }

    currentSection.length += dist;
    if (isTurn) currentSection.totalAngle = (currentSection.totalAngle || 0) + angleDiff;
  }
  if (currentSection) sections.push(currentSection);

  return sections.map((s) => {
    if (s.type === "turn") {
      s.radius = Math.round(s.length / (s.totalAngle || 0.1));
    }
    delete s.totalAngle;
    s.length = Math.round(s.length);
    return s;
  });
}

async function run() {
  // Create backup
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = `tracks.json.backup.${timestamp}`;
  fs.writeFileSync(backupPath, JSON.stringify(tracks, null, 2));
  console.log(`Backup created: ${backupPath}\n`);

  const results = {
    updated: [] as IngestionResult[],
    notFound: [] as IngestionResult[],
    skipped: [] as IngestionResult[],
    errors: [] as IngestionResult[],
  };

  let processed = 0;
  const total = (tracks as Track[]).length;

  for (const track of tracks as Track[]) {
    processed++;
    console.log(`[${processed}/${total}] ${track.name} (${track.country})`);

    // Check if already has sections
    const hasExistingData = track.courses.some((c) => c.sections && c.sections.length > 0);
    if (hasExistingData) {
      console.log(`  ⏭️  Skipped - already has section data`);
      results.skipped.push({ id: track.id, name: track.name, reason: "Has existing sections" });
      continue;
    }

    try {
      const geometry = await getTrackGeometry(track.name, track.country);

      if (geometry) {
        const sections = calculateSections(geometry.nodes);

        track.courses.forEach((c) => {
          c.sections = sections;
          c.circumference = Math.round(
            sections.reduce((acc: number, s: Section) => acc + s.length, 0),
          );
          const straights = sections.filter((s) => s.type === "straight");
          c.straightLength =
            straights.length > 0
              ? Math.round(Math.max(...straights.map((s) => s.length)))
              : Math.round((c.circumference || 0) * 0.25);
        });

        track.osmId = geometry.osmId;
        track.dataSource = "osm";

        console.log(
          `  ✅ Updated - ${sections.length} sections, matched as "${geometry.matchedName}"`,
        );
        results.updated.push({
          id: track.id,
          name: track.name,
          sectionsCount: sections.length,
          circumference: track.courses[0]?.circumference,
          osmId: geometry.osmId,
          matchedName: geometry.matchedName,
        });
      } else {
        console.log(`  ❌ Not found in OSM`);
        results.notFound.push({ id: track.id, name: track.name, country: track.country });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(`  💥 Error: ${errorMessage}`);
      results.errors.push({ id: track.id, name: track.name, error: errorMessage });
    }

    // Rate limiting
    await new Promise((r) => setTimeout(r, 1000));
  }

  // Write updated tracks
  fs.writeFileSync(tracksJsonPath, JSON.stringify(tracks, null, 2));
  console.log(`\n✅ Updated tracks.json`);

  // Write results
  fs.writeFileSync("ingestion-results.json", JSON.stringify(results, null, 2));
  console.log(`✅ Results saved to ingestion-results.json`);

  // Summary
  console.log("\n=== Summary ===");
  console.log(`Updated: ${results.updated.length}`);
  console.log(`Skipped (already had data): ${results.skipped.length}`);
  console.log(`Not found in OSM: ${results.notFound.length}`);
  console.log(`Errors: ${results.errors.length}`);

  if (results.notFound.length > 0) {
    fs.writeFileSync("tracks-not-found-in-osm.json", JSON.stringify(results.notFound, null, 2));
    console.log(`\n📄 tracks-not-found-in-osm.json created for Phase 4 (internet research)`);
    console.log(`Run: npx tsx scripts/research-tracks.ts`);
  }
}

run();
