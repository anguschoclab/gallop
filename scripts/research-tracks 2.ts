import fs from "fs";
import path from "path";

const tracksJsonPath = path.resolve(process.cwd(), "src/game/data/tracks.json");
const tracks = JSON.parse(fs.readFileSync(tracksJsonPath, "utf-8"));

interface Section {
  type: string;
  length: number;
  radius?: number;
}

interface Course {
  sections?: Section[];
  circumference?: number;
  straightLength?: number;
  width?: number;
}

interface Track {
  id: string;
  name: string;
  country: string;
  courses: Course[];
  dataSource?: string;
}

interface Specs {
  circumference?: number;
  straightLength?: number;
  width?: number;
  surface?: string;
  source?: string;
  [key: string]: unknown;
}

interface ResearchResult {
  id: string;
  name: string;
  circumference?: number;
  straightLength?: number;
  sectionsCount?: number;
  source?: string;
  country?: string;
  error?: string;
}

// Load tracks that weren't found in OSM, or process all empty ones
const tracksToResearch = (tracks as Track[]).filter((t) => {
  const hasEmptySections = t.courses.some((c) => !c.sections || c.sections.length === 0);
  return hasEmptySections;
});

console.log(`Tracks to research: ${tracksToResearch.length}`);

// Wikipedia search function
async function searchWikipedia(trackName: string, country: string) {
  const searchQueries = [
    `${trackName} racecourse`,
    `${trackName} horse racing`,
    `${trackName} race track`,
  ];

  for (const query of searchQueries) {
    try {
      // Use Wikipedia API
      const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*`;
      const response = await fetch(url);
      if (!response.ok) continue;

      const data = await response.json();
      if (data.query?.search?.length > 0) {
        // Get first result
        const title = data.query.search[0].title;

        // Fetch page content
        const pageUrl = `https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(title)}&prop=text&format=json&origin=*`;
        const pageResponse = await fetch(pageUrl);
        if (!pageResponse.ok) continue;

        const pageData = await pageResponse.json();
        const html = pageData.parse?.text?.["*"] || "";

        // Extract track specifications from HTML
        const specs = extractSpecsFromHTML(html, trackName);
        if (specs.circumference || specs.straightLength) {
          return { ...specs, source: `Wikipedia: ${title}` };
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(`  Wikipedia error: ${errorMessage}`);
    }
  }

  return null;
}

function extractSpecsFromHTML(html: string, trackName: string): Specs {
  const specs: Specs = {};

  // Common patterns for track specifications in Wikipedia
  const patterns = [
    {
      field: "circumference",
      regex: /(?:circumference|track length|course length)[^\d]*(\d{3,4})\s*m/i,
    },
    {
      field: "circumference",
      regex: /(?:circumference|track length|course length)[^\d]*(\d{1,2},\d{3})\s*m/i,
    },
    {
      field: "straightLength",
      regex: /(?:straight|home straight|finish straight)[^\d]*(\d{3,4})\s*m/i,
    },
    { field: "width", regex: /(?:width)[^\d]*(\d{1,3})\s*m/i },
  ];

  for (const { field, regex } of patterns) {
    const match = html.match(regex);
    if (match) {
      const value = parseInt(match[1].replace(",", ""));
      if (!isNaN(value)) {
        specs[field] = value;
      }
    }
  }

  // Try to find surface information
  if (html.match(/turf|grass/i)) specs.surface = "Turf";
  else if (html.match(/dirt|sand/i)) specs.surface = "Dirt";
  else if (html.match(/synthetic|polytrack|tapeta/i)) specs.surface = "Synthetic";

  return specs;
}

function generateOvalSections(circumference: number, straightLength: number) {
  const turnLength = (circumference - 2 * straightLength) / 2;
  const radius = turnLength / Math.PI;

  return [
    { type: "straight", length: straightLength },
    { type: "turn", length: Math.round(turnLength), radius: Math.round(radius) },
    { type: "straight", length: straightLength },
    { type: "turn", length: Math.round(turnLength), radius: Math.round(radius) },
  ];
}

async function run() {
  const results = {
    updated: [] as ResearchResult[],
    notFound: [] as ResearchResult[],
    errors: [] as ResearchResult[],
  };

  // Process in batches to avoid rate limiting
  const BATCH_SIZE = 5;
  const DELAY_BETWEEN_BATCHES = 2000; // 2 seconds

  for (let i = 0; i < tracksToResearch.length; i += BATCH_SIZE) {
    const batch = tracksToResearch.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(tracksToResearch.length / BATCH_SIZE);

    console.log(`\n=== Batch ${batchNum}/${totalBatches} ===`);

    for (const track of batch) {
      console.log(
        `\n[${i + batch.indexOf(track) + 1}/${tracksToResearch.length}] ${track.name} (${track.country})`,
      );

      try {
        const specs = await searchWikipedia(track.name, track.country);

        if (specs && specs.circumference) {
          // Apply to all courses at this track
          track.courses.forEach((c) => {
            c.circumference = specs.circumference;
            if (specs.straightLength) {
              c.straightLength = specs.straightLength;
            } else {
              // Estimate if not found
              c.straightLength = Math.round((specs.circumference || 0) * 0.25);
            }
            c.width = specs.width || c.width;

            // Generate sections
            c.sections = generateOvalSections(c.circumference || 0, c.straightLength || 0);
          });

          track.dataSource = "wikipedia";

          console.log(
            `  ✅ Found: ${specs.circumference}m circ, ${specs.straightLength || "estimated"}m straight`,
          );
          console.log(`  📄 Source: ${specs.source}`);

          results.updated.push({
            id: track.id,
            name: track.name,
            circumference: specs.circumference,
            straightLength: specs.straightLength,
            sectionsCount: 4,
            source: specs.source,
          });
        } else {
          console.log(`  ❌ No data found`);
          results.notFound.push({ id: track.id, name: track.name, country: track.country });
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error(`  💥 Error: ${errorMessage}`);
        results.errors.push({ id: track.id, name: track.name, error: errorMessage });
      }

      // Small delay between tracks in batch
      await new Promise((r) => setTimeout(r, 500));
    }

    // Delay between batches
    if (i + BATCH_SIZE < tracksToResearch.length) {
      console.log(`\n⏳ Waiting ${DELAY_BETWEEN_BATCHES}ms before next batch...`);
      await new Promise((r) => setTimeout(r, DELAY_BETWEEN_BATCHES));
    }
  }

  // Write updated tracks
  fs.writeFileSync(tracksJsonPath, JSON.stringify(tracks, null, 2));
  console.log(`\n✅ Updated tracks.json`);

  // Write results
  fs.writeFileSync("internet-research-results.json", JSON.stringify(results, null, 2));
  console.log(`✅ Results saved to internet-research-results.json`);

  // Summary
  console.log("\n=== Summary ===");
  console.log(`Updated: ${results.updated.length}`);
  console.log(`Not found: ${results.notFound.length}`);
  console.log(`Errors: ${results.errors.length}`);

  if (results.notFound.length > 0) {
    console.log("\n=== Still Missing (Manual Research Needed) ===");
    results.notFound.forEach((t) => {
      console.log(`  - ${t.name} (${t.country})`);
    });
  }
}

run();
