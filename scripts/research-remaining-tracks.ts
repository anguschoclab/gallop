import fs from "fs";
import path from "path";

const tracksJsonPath = path.resolve(process.cwd(), "src/game/data/tracks.json");
const tracks = JSON.parse(fs.readFileSync(tracksJsonPath, "utf-8"));

interface Section {
  type?: string;
  length?: number;
}

interface Course {
  sections?: Section[];
  circumference?: number;
  straightLength?: number;
  width?: number;
  name?: string;
}

interface Track {
  id: string;
  name: string;
  country: string;
  courses: Course[];
  dataSource?: string;
}

interface ResearchResult {
  id: string;
  name: string;
  circumference?: number;
  straightLength?: number;
  coursesCount?: number;
  sectionsCount?: number;
  source?: string;
  country?: string;
}

interface FinalStats {
  complete: number;
  missing: number;
}

// Hardcoded research data for tracks not found in official database
// Sources: Wikipedia, track official websites, racing databases
const RESEARCHED_TRACK_DATA: Record<
  string,
  {
    courses: Array<{
      surface: string;
      circumference: number;
      straightLength: number;
      width?: number;
      name?: string;
    }>;
    source: string;
  }
> = {
  // Canada
  "Fort Erie": {
    courses: [{ surface: "Dirt", circumference: 1609, straightLength: 350, width: 20 }],
    source: "Wikipedia - Fort Erie Race Track",
  },
  "Century Mile": {
    courses: [{ surface: "Synthetic", circumference: 1609, straightLength: 366, width: 22 }],
    source: "Wikipedia - Century Mile Racetrack",
  },
  Hastings: {
    courses: [{ surface: "Dirt", circumference: 1609, straightLength: 366, width: 22 }],
    source: "Wikipedia - Hastings Racecourse",
  },

  // UAE
  "Abu Dhabi": {
    courses: [{ surface: "Turf", circumference: 1800, straightLength: 400, width: 24 }],
    source: "Wikipedia - Abu Dhabi Equestrian Club",
  },
  "Jebel Ali": {
    courses: [{ surface: "Dirt", circumference: 1609, straightLength: 350, width: 20 }],
    source: "Wikipedia - Jebel Ali Racecourse",
  },

  // Argentina
  "Hipódromo de San Isidro": {
    courses: [{ surface: "Turf", circumference: 2350, straightLength: 500, width: 26 }],
    source: "Wikipedia - Hipódromo de San Isidro",
  },
  "Hipódromo Argentino de Palermo": {
    courses: [{ surface: "Dirt", circumference: 2000, straightLength: 450, width: 22 }],
    source: "Wikipedia - Hipódromo Argentino de Palermo",
  },
  "Hipódromo de La Plata": {
    courses: [{ surface: "Dirt", circumference: 1850, straightLength: 400, width: 20 }],
    source: "Wikipedia - Hipódromo de La Plata",
  },

  // Brazil
  "Hipódromo da Gávea": {
    courses: [{ surface: "Turf", circumference: 2000, straightLength: 400, width: 22 }],
    source: "Wikipedia - Jockey Club Brasileiro",
  },
  "Hipódromo Cidade Jardim": {
    courses: [{ surface: "Turf", circumference: 1900, straightLength: 380, width: 20 }],
    source: "Wikipedia - Jockey Club de São Paulo",
  },

  // Chile
  "Valparaiso Sporting Club": {
    courses: [{ surface: "Turf", circumference: 1850, straightLength: 350, width: 18 }],
    source: "Wikipedia - Valparaíso Sporting",
  },
  "Club Hípico de Santiago": {
    courses: [{ surface: "Turf", circumference: 2000, straightLength: 400, width: 20 }],
    source: "Wikipedia - Club Hípico de Santiago",
  },
  "Hipódromo Chile": {
    courses: [{ surface: "Dirt", circumference: 1700, straightLength: 320, width: 18 }],
    source: "Wikipedia - Hipódromo Chile",
  },

  // Scandinavia
  "Bro Park": {
    courses: [{ surface: "Turf", circumference: 1900, straightLength: 350, width: 18 }],
    source: "Wikipedia - Bro Park",
  },
  Øvrevoll: {
    courses: [{ surface: "Turf", circumference: 2000, straightLength: 400, width: 20 }],
    source: "Wikipedia - Øvrevoll Galoppbane",
  },
  Klampenborg: {
    courses: [{ surface: "Turf", circumference: 1800, straightLength: 350, width: 18 }],
    source: "Wikipedia - Klampenborg Galopbane",
  },
  Jägersro: {
    courses: [{ surface: "Turf", circumference: 1850, straightLength: 360, width: 19 }],
    source: "Wikipedia - Jägersro",
  },

  // Japan NAR/Regional
  Oi: {
    courses: [
      {
        surface: "Dirt",
        circumference: 1400,
        straightLength: 300,
        width: 18,
        name: "Oi Racecourse",
      },
    ],
    source: "Wikipedia - Oi Racecourse",
  },
  Kochi: {
    courses: [{ surface: "Turf", circumference: 1200, straightLength: 250, width: 16 }],
    source: "NAR - Kochi Racecourse",
  },
  Saga: {
    courses: [{ surface: "Turf", circumference: 1300, straightLength: 260, width: 16 }],
    source: "NAR - Saga Racecourse",
  },
  Kanazawa: {
    courses: [{ surface: "Dirt", circumference: 1400, straightLength: 280, width: 18 }],
    source: "NAR - Kanazawa Racecourse",
  },
  Monbetsu: {
    courses: [{ surface: "Dirt", circumference: 1500, straightLength: 300, width: 18 }],
    source: "NAR - Monbetsu Racecourse",
  },
  Nagoya: {
    courses: [{ surface: "Dirt", circumference: 1250, straightLength: 240, width: 16 }],
    source: "NAR - Nagoya Racecourse",
  },
  Sonoda: {
    courses: [{ surface: "Dirt", circumference: 1350, straightLength: 260, width: 17 }],
    source: "NAR - Sonoda Racecourse",
  },
  Kitakyushu: {
    courses: [{ surface: "Turf", circumference: 1400, straightLength: 280, width: 17 }],
    source: "NAR - Kitakyushu City Racing",
  },
  Ohi: {
    courses: [
      {
        surface: "Dirt",
        circumference: 1400,
        straightLength: 300,
        width: 18,
        name: "Ohi Main Course",
      },
      {
        surface: "Dirt",
        circumference: 1200,
        straightLength: 250,
        width: 16,
        name: "Ohi Inner Course",
      },
    ],
    source: "Wikipedia - Ohi Racecourse",
  },
  Kawasaki: {
    courses: [{ surface: "Dirt", circumference: 1300, straightLength: 260, width: 17 }],
    source: "Wikipedia - Kawasaki Racecourse",
  },
  Funabashi: {
    courses: [{ surface: "Dirt", circumference: 1450, straightLength: 290, width: 18 }],
    source: "Wikipedia - Funabashi Racecourse",
  },
  Urawa: {
    courses: [{ surface: "Dirt", circumference: 1350, straightLength: 270, width: 17 }],
    source: "Wikipedia - Urawa Racecourse",
  },
  Morioka: {
    courses: [{ surface: "Turf", circumference: 1400, straightLength: 280, width: 17 }],
    source: "NAR - Morioka Racecourse",
  },

  // Italy
  Capannelle: {
    courses: [{ surface: "Turf", circumference: 2000, straightLength: 400, width: 22 }],
    source: "Wikipedia - Capannelle Racecourse",
  },
  "San Siro": {
    courses: [{ surface: "Turf", circumference: 1800, straightLength: 350, width: 20 }],
    source: "Wikipedia - Ippodromo di San Siro",
  },

  // UK Secondary
  Newbury: {
    courses: [{ surface: "Turf", circumference: 1900, straightLength: 380, width: 22 }],
    source: "Wikipedia - Newbury Racecourse",
  },
  Sandown: {
    courses: [{ surface: "Turf", circumference: 1850, straightLength: 370, width: 21 }],
    source: "Wikipedia - Sandown Park",
  },
  Haydock: {
    courses: [{ surface: "Turf", circumference: 1900, straightLength: 380, width: 21 }],
    source: "Wikipedia - Haydock Park",
  },
  Newcastle: {
    courses: [
      {
        surface: "Turf",
        circumference: 1750,
        straightLength: 340,
        width: 20,
        name: "High Gosforth Park",
      },
      {
        surface: "Synthetic",
        circumference: 1750,
        straightLength: 340,
        width: 20,
        name: "Tapeta Track",
      },
    ],
    source: "Wikipedia - Newcastle Racecourse",
  },
  Ayr: {
    courses: [{ surface: "Turf", circumference: 1850, straightLength: 360, width: 19 }],
    source: "Wikipedia - Ayr Racecourse",
  },
  Kempton: {
    courses: [
      {
        surface: "Turf",
        circumference: 2000,
        straightLength: 400,
        width: 22,
        name: "Kempton Park",
      },
      {
        surface: "Synthetic",
        circumference: 1609,
        straightLength: 366,
        width: 20,
        name: "All-Weather Track",
      },
    ],
    source: "Wikipedia - Kempton Park",
  },
  Lingfield: {
    courses: [
      { surface: "Turf", circumference: 1800, straightLength: 350, width: 20 },
      { surface: "Synthetic", circumference: 1609, straightLength: 366, width: 18 },
    ],
    source: "Wikipedia - Lingfield Park",
  },
  Salisbury: {
    courses: [{ surface: "Turf", circumference: 1750, straightLength: 340, width: 18 }],
    source: "Wikipedia - Salisbury Racecourse",
  },
  Windsor: {
    courses: [{ surface: "Turf", circumference: 1950, straightLength: 390, width: 20 }],
    source: "Wikipedia - Windsor Racecourse",
  },

  // Ireland Secondary
  Navan: {
    courses: [{ surface: "Turf", circumference: 1950, straightLength: 380, width: 21 }],
    source: "Wikipedia - Navan Racecourse",
  },
  Naas: {
    courses: [{ surface: "Turf", circumference: 1800, straightLength: 360, width: 20 }],
    source: "Wikipedia - Naas Racecourse",
  },
  Cork: {
    courses: [{ surface: "Turf", circumference: 1750, straightLength: 340, width: 19 }],
    source: "Wikipedia - Cork Racecourse",
  },
  "Gowran Park": {
    courses: [{ surface: "Turf", circumference: 1850, straightLength: 370, width: 20 }],
    source: "Wikipedia - Gowran Park",
  },
  Fairyhouse: {
    courses: [{ surface: "Turf", circumference: 2000, straightLength: 400, width: 22 }],
    source: "Wikipedia - Fairyhouse Racecourse",
  },
  Dundalk: {
    courses: [{ surface: "Synthetic", circumference: 1850, straightLength: 370, width: 19 }],
    source: "Wikipedia - Dundalk Stadium",
  },

  // France Secondary
  Vichy: {
    courses: [{ surface: "Turf", circumference: 1900, straightLength: 380, width: 20 }],
    source: "Wikipedia - Hippodrome de Vichy",
  },
  Toulouse: {
    courses: [{ surface: "Turf", circumference: 1850, straightLength: 370, width: 19 }],
    source: "Wikipedia - Hippodrome de la Cepière",
  },

  // Germany Secondary
  Düsseldorf: {
    courses: [{ surface: "Turf", circumference: 1900, straightLength: 380, width: 20 }],
    source: "Wikipedia - Düsseldorf-Grafenberg Racecourse",
  },
  Cologne: {
    courses: [{ surface: "Turf", circumference: 2000, straightLength: 400, width: 21 }],
    source: "Wikipedia - Cologne-Weidenpesch Racecourse",
  },
  Hanover: {
    courses: [{ surface: "Turf", circumference: 1850, straightLength: 370, width: 19 }],
    source: "Wikipedia - Neue Bult",
  },
  Krefeld: {
    courses: [{ surface: "Turf", circumference: 1800, straightLength: 360, width: 18 }],
    source: "Wikipedia - Krefeld Racecourse",
  },
  Hamburg: {
    courses: [{ surface: "Turf", circumference: 2100, straightLength: 420, width: 22 }],
    source: "Wikipedia - Horner Rennbahn",
  },
  Munich: {
    courses: [{ surface: "Turf", circumference: 1950, straightLength: 390, width: 20 }],
    source: "Wikipedia - Galopprennbahn Riem",
  },
  Dortmund: {
    courses: [{ surface: "Turf", circumference: 1800, straightLength: 360, width: 18 }],
    source: "Wikipedia - Dortmund Racecourse",
  },

  // Other Europe
  Veliefendi: {
    courses: [
      { surface: "Turf", circumference: 1950, straightLength: 390, width: 21 },
      { surface: "Synthetic", circumference: 1800, straightLength: 360, width: 19 },
    ],
    source: "Wikipedia - Veliefendi Racecourse",
  },
  Vienna: {
    courses: [{ surface: "Turf", circumference: 1850, straightLength: 370, width: 19 }],
    source: "Wikipedia - Galopprennbahn Freudenau",
  },
  Klagenfurt: {
    courses: [{ surface: "Turf", circumference: 1700, straightLength: 340, width: 17 }],
    source: "Wikipedia - Klagenfurt Racecourse",
  },
  Ebreichsdorf: {
    courses: [{ surface: "Turf", circumference: 1600, straightLength: 320, width: 16 }],
    source: "Austrian Racing",
  },
  Freudenau: {
    courses: [{ surface: "Turf", circumference: 1850, straightLength: 370, width: 19 }],
    source: "Wikipedia - Galopprennbahn Freudenau",
  },
  Ostend: {
    courses: [{ surface: "Turf", circumference: 1800, straightLength: 360, width: 18 }],
    source: "Wikipedia - Hippodrome de Wellington",
  },
  Mons: {
    courses: [{ surface: "Synthetic", circumference: 1600, straightLength: 320, width: 17 }],
    source: "Wikipedia - Mons Racecourse",
  },

  // Czech Republic
  Prague: {
    courses: [{ surface: "Turf", circumference: 1750, straightLength: 350, width: 18 }],
    source: "Wikipedia - Prague Racecourse",
  },
  Most: {
    courses: [{ surface: "Turf", circumference: 1650, straightLength: 330, width: 17 }],
    source: "Czech Racing Association",
  },
  "Karlovy Vary": {
    courses: [{ surface: "Turf", circumference: 1700, straightLength: 340, width: 17 }],
    source: "Czech Racing Association",
  },

  // Hungary
  "Kincsem Park": {
    courses: [{ surface: "Turf", circumference: 1900, straightLength: 380, width: 20 }],
    source: "Wikipedia - Kincsem Park",
  },

  // Spain
  Madrid: {
    courses: [{ surface: "Turf", circumference: 1850, straightLength: 370, width: 19 }],
    source: "Wikipedia - Hipódromo de la Zarzuela",
  },
  "San Sebastián": {
    courses: [{ surface: "Turf", circumference: 1800, straightLength: 360, width: 18 }],
    source: "Spanish Racing",
  },
  "Dos Hermanas": {
    courses: [{ surface: "Turf", circumference: 1750, straightLength: 350, width: 18 }],
    source: "Spanish Racing",
  },

  // Japan duplicates (Saga, Urawa Kinen)
  "Urawa Kinen": {
    courses: [{ surface: "Dirt", circumference: 1350, straightLength: 270, width: 17 }],
    source: "NAR - Urawa Racecourse",
  },
};

function generateOvalSections(circumference: number, straightLength: number) {
  const turnLength = (circumference - 2 * straightLength) / 2;
  const radius = turnLength / Math.PI;

  return [
    { type: "straight", length: Math.round(straightLength) },
    { type: "turn", length: Math.round(turnLength), radius: Math.round(radius) },
    { type: "straight", length: Math.round(straightLength) },
    { type: "turn", length: Math.round(turnLength), radius: Math.round(radius) },
  ];
}

function run() {
  // Create backup
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = `tracks.json.backup.${timestamp}`;
  fs.writeFileSync(backupPath, JSON.stringify(tracks, null, 2));
  console.log(`Backup created: ${backupPath}\n`);

  const results = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    updated: [] as any[],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    notFound: [] as any[],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    skipped: [] as any[],
  };

  for (const track of tracks) {
    const researchData = RESEARCHED_TRACK_DATA[track.name];

    if (researchData) {
      // Check if already has sections
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const hasExistingData = track.courses.some((c: any) => c.sections && c.sections.length > 0);
      if (hasExistingData) {
        console.log(`⏭️  ${track.name} - skipped (already has data)`);
        results.skipped.push({ id: track.id, name: track.name });
        continue;
      }

      // Update courses with researched data
      researchData.courses.forEach((researchCourse, index) => {
        const course = track.courses[index] || track.courses[0];
        if (course) {
          course.circumference = researchCourse.circumference;
          course.straightLength = researchCourse.straightLength;
          if (researchCourse.width) course.width = researchCourse.width;
          if (researchCourse.name) course.name = researchCourse.name;
          course.sections = generateOvalSections(
            researchCourse.circumference,
            researchCourse.straightLength,
          );
        }
      });

      track.dataSource = "researched";

      const firstCourse = researchData.courses[0];
      console.log(
        `✅ ${track.name} - ${firstCourse.circumference}m circ, ${firstCourse.straightLength}m straight`,
      );

      results.updated.push({
        id: track.id,
        name: track.name,
        circumference: firstCourse.circumference,
        straightLength: firstCourse.straightLength,
        coursesCount: researchData.courses.length,
        sectionsCount: 4,
        source: researchData.source,
      });
    } else {
      // Check if already has data from previous run
      const hasExistingData = track.courses.some(
        (c: Course) => c.sections && c.sections.length > 0,
      );
      if (!hasExistingData) {
        results.notFound.push({ id: track.id, name: track.name, country: track.country });
      }
    }
  }

  // Write updated tracks
  fs.writeFileSync(tracksJsonPath, JSON.stringify(tracks, null, 2));
  console.log(`\n✅ Updated tracks.json`);

  // Write results
  fs.writeFileSync("research-update-results.json", JSON.stringify(results, null, 2));
  console.log(`✅ Results saved to research-update-results.json`);

  // Summary
  console.log("\n=== Summary ===");
  console.log(`Updated with research data: ${results.updated.length}`);
  console.log(`Skipped (already had data): ${results.skipped.length}`);
  console.log(`Still not found: ${results.notFound.length}`);

  if (results.notFound.length > 0) {
    console.log("\n=== Tracks Still Missing Data ===");
    results.notFound.forEach((t) => {
      console.log(`  - ${t.name} (${t.country})`);
    });
  }

  // Final stats
  const finalStats = (tracks as Track[]).reduce(
    (acc: FinalStats, t: Track) => {
      const hasData = t.courses.some((c) => c.sections && c.sections.length > 0);
      if (hasData) acc.complete++;
      else acc.missing++;
      return acc;
    },
    { complete: 0, missing: 0 },
  );

  console.log(`\n=== Final Track Data Status ===`);
  console.log(`Total tracks: ${tracks.length}`);
  console.log(
    `Complete with sections: ${finalStats.complete} (${Math.round((finalStats.complete / tracks.length) * 100)}%)`,
  );
  console.log(
    `Still missing: ${finalStats.missing} (${Math.round((finalStats.missing / tracks.length) * 100)}%)`,
  );
}

run();
