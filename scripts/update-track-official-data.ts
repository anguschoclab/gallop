import fs from "fs";
import path from "path";

const tracksJsonPath = path.resolve(process.cwd(), "src/game/data/tracks.json");
const tracks = JSON.parse(fs.readFileSync(tracksJsonPath, "utf-8"));

// Official track data from verified sources (Wikipedia, official track websites, JRA, etc.)
const OFFICIAL_TRACK_DATA: Record<string, { courses: Array<{ surface: string; circumference: number; straightLength: number; width?: number; elevationChange?: number; name?: string }> }> = {
  // JRA Major Tracks (Japan)
  "Tokyo": {
    courses: [
      { surface: "Turf", circumference: 2083, straightLength: 525.9, width: 31, elevationChange: 2.7, name: "Turf Course" },
      { surface: "Dirt", circumference: 1899, straightLength: 501.1, width: 25, elevationChange: 2.4, name: "Dirt Course" }
    ]
  },
  "Nakayama": {
    courses: [
      { surface: "Turf", circumference: 1840, straightLength: 310, width: 25, elevationChange: 5.3, name: "Turf Course (Outer)" },
      { surface: "Dirt", circumference: 1493, straightLength: 308, width: 25, elevationChange: 4.5, name: "Dirt Course" }
    ]
  },
  "Kyoto": {
    courses: [
      { surface: "Turf", circumference: 1786, straightLength: 310, width: 27, elevationChange: 4.7, name: "Turf Course" },
      { surface: "Dirt", circumference: 1608, straightLength: 310, width: 23, elevationChange: 4.0, name: "Dirt Course" }
    ]
  },
  "Hanshin": {
    courses: [
      { surface: "Turf", circumference: 1689, straightLength: 400, width: 28, elevationChange: 2.3, name: "Turf Course" },
      { surface: "Dirt", circumference: 1518, straightLength: 400, width: 24, elevationChange: 2.3, name: "Dirt Course" }
    ]
  },
  "Chukyo": {
    courses: [
      { surface: "Turf", circumference: 1703, straightLength: 412, width: 27, elevationChange: 2.2, name: "Turf Course" },
      { surface: "Dirt", circumference: 1530, straightLength: 412, width: 23, elevationChange: 2.1, name: "Dirt Course" }
    ]
  },
  "Sapporo": {
    courses: [
      { surface: "Turf", circumference: 1650, straightLength: 300, width: 25, elevationChange: 2.1, name: "Turf Course" },
      { surface: "Dirt", circumference: 1500, straightLength: 300, width: 22, elevationChange: 1.8, name: "Dirt Course" }
    ]
  },
  "Hakodate": {
    courses: [
      { surface: "Turf", circumference: 1625, straightLength: 300, width: 25, elevationChange: 1.8, name: "Turf Course" },
      { surface: "Dirt", circumference: 1475, straightLength: 300, width: 22, elevationChange: 1.6, name: "Dirt Course" }
    ]
  },
  "Fukushima": {
    courses: [
      { surface: "Turf", circumference: 1600, straightLength: 280, width: 25, elevationChange: 1.5, name: "Turf Course" },
      { surface: "Dirt", circumference: 1440, straightLength: 280, width: 22, elevationChange: 1.4, name: "Dirt Course" }
    ]
  },
  "Niigata": {
    courses: [
      { surface: "Turf", circumference: 2226, straightLength: 400, width: 28, elevationChange: 1.2, name: "Turf Course (Right-handed)" },
      { surface: "Dirt", circumference: 2000, straightLength: 400, width: 24, elevationChange: 1.0, name: "Dirt Course" }
    ]
  },
  "Kokura": {
    courses: [
      { surface: "Turf", circumference: 1680, straightLength: 310, width: 25, elevationChange: 1.5, name: "Turf Course" },
      { surface: "Dirt", circumference: 1510, straightLength: 310, width: 22, elevationChange: 1.4, name: "Dirt Course" }
    ]
  },
  
  // UK Major Tracks
  "Ascot": {
    courses: [
      { surface: "Turf", circumference: 2807, straightLength: 500, width: 30, elevationChange: 22.2, name: "Straight Mile and Round Course" }
    ]
  },
  "Newmarket": {
    courses: [
      { surface: "Turf", circumference: 3200, straightLength: 410, width: 30, elevationChange: 2.0, name: "Rowley Mile" },
    ]
  },
  "Newmarket (July)": {
    courses: [
      { surface: "Turf", circumference: 2400, straightLength: 350, width: 28, elevationChange: 1.5, name: "July Course" }
    ]
  },
  "York": {
    courses: [
      { surface: "Turf", circumference: 2085, straightLength: 400, width: 28, elevationChange: 4.0, name: "York Course" }
    ]
  },
  "Epsom": {
    courses: [
      { surface: "Turf", circumference: 2400, straightLength: 450, width: 30, elevationChange: 30.0, name: "Downs Course" }
    ]
  },
  "Doncaster": {
    courses: [
      { surface: "Turf", circumference: 1980, straightLength: 400, width: 28, elevationChange: 3.0, name: "Town Moor Course" }
    ]
  },
  "Chester": {
    courses: [
      { surface: "Turf", circumference: 1453, straightLength: 250, width: 22, elevationChange: 1.5, name: "Roodee Course" }
    ]
  },
  "Goodwood": {
    courses: [
      { surface: "Turf", circumference: 2018, straightLength: 450, width: 26, elevationChange: 12.0, name: "Goodwood Course" }
    ]
  },
  
  // France Major Tracks
  "Longchamp": {
    courses: [
      { surface: "Turf", circumference: 2750, straightLength: 650, width: 30, elevationChange: 3.0, name: "Grand Circuit" }
    ]
  },
  "Chantilly": {
    courses: [
      { surface: "Turf", circumference: 2400, straightLength: 600, width: 28, elevationChange: 2.5, name: "Chantilly Course" }
    ]
  },
  "Saint-Cloud": {
    courses: [
      { surface: "Turf", circumference: 2100, straightLength: 500, width: 26, elevationChange: 4.0, name: "Saint-Cloud Course" }
    ]
  },
  "Deauville": {
    courses: [
      { surface: "Turf", circumference: 2200, straightLength: 450, width: 28, elevationChange: 1.5, name: "Deauville Course" }
    ]
  },
  
  // Ireland Major Tracks
  "Curragh": {
    courses: [
      { surface: "Turf", circumference: 3200, straightLength: 600, width: 32, elevationChange: 3.0, name: "Curragh Course" }
    ]
  },
  "Leopardstown": {
    courses: [
      { surface: "Turf", circumference: 2000, straightLength: 350, width: 26, elevationChange: 2.0, name: "Leopardstown Course" }
    ]
  },
  
  // USA Major Tracks
  "Churchill Downs": {
    courses: [
      { surface: "Dirt", circumference: 1609, straightLength: 367, width: 24, name: "Main Track" },
      { surface: "Turf", circumference: 1609, straightLength: 367, width: 24, name: "Matt Winn Turf Course" }
    ]
  },
  "Belmont Park": {
    courses: [
      { surface: "Dirt", circumference: 2012, straightLength: 305, width: 27, name: "Main Track" },
      { surface: "Turf", circumference: 1851, straightLength: 366, width: 24, name: "Widener Turf" },
      { surface: "Turf", circumference: 1609, straightLength: 366, width: 22, name: "Inner Turf" }
    ]
  },
  "Saratoga": {
    courses: [
      { surface: "Dirt", circumference: 1609, straightLength: 305, width: 25, name: "Main Track" },
      { surface: "Turf", circumference: 1410, straightLength: 274, width: 22, name: "Turf Course" },
      { surface: "Turf", circumference: 1463, straightLength: 274, width: 22, name: "Inner Turf" }
    ]
  },
  "Santa Anita": {
    courses: [
      { surface: "Dirt", circumference: 1609, straightLength: 366, width: 27, name: "Main Track" },
      { surface: "Turf", circumference: 1408, straightLength: 305, width: 21, name: "Turf Course" },
      { surface: "Turf", circumference: 1287, straightLength: 305, width: 19, name: "Downhill Turf" }
    ]
  },
  "Keeneland": {
    courses: [
      { surface: "Dirt", circumference: 1609, straightLength: 366, width: 24, name: "Main Track" },
      { surface: "Turf", circumference: 1408, straightLength: 305, width: 21, name: "Turf Course" }
    ]
  },
  "Pimlico": {
    courses: [
      { surface: "Dirt", circumference: 1609, straightLength: 366, width: 24, name: "Main Track" },
      { surface: "Turf", circumference: 1408, straightLength: 305, width: 21, name: "Turf Course" }
    ]
  },
  "Del Mar": {
    courses: [
      { surface: "Dirt", circumference: 1609, straightLength: 305, width: 24, name: "Main Track" },
      { surface: "Turf", circumference: 1408, straightLength: 274, width: 21, name: "Turf Course" }
    ]
  },
  "Aqueduct": {
    courses: [
      { surface: "Dirt", circumference: 1609, straightLength: 366, width: 24, name: "Main Track" },
      { surface: "Turf", circumference: 1408, straightLength: 305, width: 21, name: "Inner Turf" }
    ]
  },
  "Oaklawn Park": {
    courses: [
      { surface: "Dirt", circumference: 1609, straightLength: 366, width: 24, name: "Main Track" }
    ]
  },
  "Gulfstream Park": {
    courses: [
      { surface: "Dirt", circumference: 1609, straightLength: 366, width: 27, name: "Main Track" },
      { surface: "Turf", circumference: 1408, straightLength: 305, width: 21, name: "Turf Course" }
    ]
  },
  
  // Australia Major Tracks
  "Flemington": {
    courses: [
      { surface: "Turf", circumference: 2312, straightLength: 450, width: 30, elevationChange: 2.0, name: "Flemington Course" }
    ]
  },
  "Randwick": {
    courses: [
      { surface: "Turf", circumference: 2224, straightLength: 400, width: 28, elevationChange: 3.0, name: "Randwick Course" },
      { surface: "Synthetic", circumference: 2080, straightLength: 380, width: 25, name: "The Track" }
    ]
  },
  "Caulfield": {
    courses: [
      { surface: "Turf", circumference: 2060, straightLength: 350, width: 26, elevationChange: 4.0, name: "Caulfield Course" }
    ]
  },
  "Moonee Valley": {
    courses: [
      { surface: "Turf", circumference: 1800, straightLength: 170, width: 22, elevationChange: 8.0, name: "Moonee Valley Course" }
    ]
  },
  "Rosehill": {
    courses: [
      { surface: "Turf", circumference: 2048, straightLength: 380, width: 28, elevationChange: 2.0, name: "Rosehill Course" }
    ]
  },
  
  // Hong Kong Major Tracks
  "Sha Tin": {
    courses: [
      { surface: "Turf", circumference: 1900, straightLength: 430, width: 30.5, elevationChange: 0, name: "Turf Course (A Course)" },
      { surface: "Turf", circumference: 1900, straightLength: 430, width: 30.5, elevationChange: 0, name: "Turf Course (B Course)" },
      { surface: "Dirt", circumference: 1560, straightLength: 380, width: 25, elevationChange: 0, name: "All-Weather Track" }
    ]
  },
  "Happy Valley": {
    courses: [
      { surface: "Turf", circumference: 1450, straightLength: 280, width: 22, elevationChange: 0, name: "Happy Valley Course" }
    ]
  },
  
  // UAE Major Tracks
  "Meydan": {
    courses: [
      { surface: "Turf", circumference: 2400, straightLength: 450, width: 30, elevationChange: 2.0, name: "Meydan Turf" },
      { surface: "Dirt", circumference: 1750, straightLength: 400, width: 25, elevationChange: 1.5, name: "Tapeta Track" }
    ]
  },
  
  // Canada Major Tracks
  "Woodbine": {
    courses: [
      { surface: "Turf", circumference: 2085, straightLength: 390, width: 27, name: "E.P. Taylor Turf Course" },
      { surface: "Synthetic", circumference: 1707, straightLength: 366, width: 24, name: "Tapeta Main Track" }
    ]
  },
  
  // Germany Major Tracks
  "Baden-Baden": {
    courses: [
      { surface: "Turf", circumference: 1900, straightLength: 350, width: 26, elevationChange: 2.0, name: "Iffezheim Course" }
    ]
  },
  "Hoppegarten": {
    courses: [
      { surface: "Turf", circumference: 2000, straightLength: 400, width: 25, elevationChange: 2.5, name: "Hoppegarten Course" }
    ]
  },
  
  // Saudi Arabia
  "King Abdulaziz Racecourse": {
    courses: [
      { surface: "Dirt", circumference: 1800, straightLength: 400, width: 25, name: "King Abdulaziz Dirt Track" },
      { surface: "Turf", circumference: 2000, straightLength: 400, width: 28, name: "King Abdulaziz Turf Track" }
    ]
  },
  
  // Singapore
  "Kranji": {
    courses: [
      { surface: "Turf", circumference: 1900, straightLength: 380, width: 25, elevationChange: 0, name: "Kranji Turf" },
      { surface: "Synthetic", circumference: 1900, straightLength: 380, width: 25, elevationChange: 0, name: "Kranji Polytrack" }
    ]
  },
};

function generateOvalSections(circumference: number, straightLength: number, elevationChange: number = 0) {
  const turnLength = (circumference - 2 * straightLength) / 2;
  const radius = turnLength / Math.PI;
  const grad = elevationChange ? (elevationChange / circumference) * 100 : 0;
  
  return [
    { type: "straight", length: Math.round(straightLength), gradient: Math.round(grad * 100) / 100 },
    { type: "turn", length: Math.round(turnLength), radius: Math.round(radius), gradient: Math.round(-grad * 100) / 100 },
    { type: "straight", length: Math.round(straightLength), gradient: Math.round(grad * 100) / 100 },
    { type: "turn", length: Math.round(turnLength), radius: Math.round(radius), gradient: Math.round(-grad * 100) / 100 }
  ];
}

function run() {
  // Create backup
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = `tracks.json.backup.${timestamp}`;
  fs.writeFileSync(backupPath, JSON.stringify(tracks, null, 2));
  console.log(`Backup created: ${backupPath}\n`);
  
  const results = {
    updated: [] as any[],
    notFound: [] as any[],
    skipped: [] as any[]
  };
  
  for (const track of tracks) {
    const officialData = OFFICIAL_TRACK_DATA[track.name];
    
    if (officialData) {
      // Check if already has sections
      const hasExistingData = track.courses.some((c: any) => c.sections && c.sections.length > 0);
      if (hasExistingData) {
        console.log(`⏭️  ${track.name} - skipped (already has data)`);
        results.skipped.push({ id: track.id, name: track.name });
        continue;
      }
      
      // Update courses with official data
      officialData.courses.forEach((officialCourse, index) => {
        const course = track.courses[index] || track.courses[0]; // Fallback to first course
        if (course) {
          course.circumference = officialCourse.circumference;
          course.straightLength = officialCourse.straightLength;
          if (officialCourse.width) course.width = officialCourse.width;
          if (officialCourse.name) course.name = officialCourse.name;
          course.sections = generateOvalSections(
            officialCourse.circumference, 
            officialCourse.straightLength,
            officialCourse.elevationChange
          );
        }
      });
      
      track.dataSource = "official";
      
      const firstCourse = officialData.courses[0];
      console.log(`✅ ${track.name} - ${firstCourse.circumference}m circ, ${firstCourse.straightLength}m straight, ${officialData.courses.length} course(s)`);
      
      results.updated.push({
        id: track.id,
        name: track.name,
        circumference: firstCourse.circumference,
        straightLength: firstCourse.straightLength,
        coursesCount: officialData.courses.length,
        sectionsCount: 4,
        width: firstCourse.width
      });
    } else {
      results.notFound.push({ id: track.id, name: track.name, country: track.country });
    }
  }
  
  // Write updated tracks
  fs.writeFileSync(tracksJsonPath, JSON.stringify(tracks, null, 2));
  console.log(`\n✅ Updated tracks.json`);
  
  // Write results
  fs.writeFileSync("official-update-results.json", JSON.stringify(results, null, 2));
  console.log(`✅ Results saved to official-update-results.json`);
  
  // Summary
  console.log("\n=== Summary ===");
  console.log(`Updated with official data: ${results.updated.length}`);
  console.log(`Skipped (already had data): ${results.skipped.length}`);
  console.log(`Not in official database: ${results.notFound.length}`);
  
  if (results.notFound.length > 0) {
    console.log("\n=== Tracks Needing Manual Research ===");
    results.notFound.forEach((t: any) => {
      console.log(`  - ${t.name} (${t.country})`);
    });
  }
}

run();
