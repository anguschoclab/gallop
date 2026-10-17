import fs from "fs";
import path from "path";

interface OfficialCourse {
  surface: string;
  circumference: number;
  straightLength: number;
  width: number;
  elevationChange: number;
}

interface TrackCourse {
  surface: string;
  circumference: number;
  straightLength: number;
  width: number;
  sections?: {
    type: string;
    length: number;
    radius?: number;
    gradient: number;
    orientationDeg?: number;
    entryOrientationDeg?: number;
    exitOrientationDeg?: number;
  }[];
}

interface TrackData {
  name: string;
  courses: TrackCourse[];
}

const tracksJsonPath = path.resolve(process.cwd(), "src/data/tracks.json");
const tracks = JSON.parse(fs.readFileSync(tracksJsonPath, "utf-8")) as TrackData[];

const officialData: { name: string; courses: OfficialCourse[] }[] = [
  {
    name: "Tokyo",
    courses: [
      {
        surface: "Turf",
        circumference: 2083,
        straightLength: 525.9,
        width: 31,
        elevationChange: 2.7,
      },
      {
        surface: "Dirt",
        circumference: 1899,
        straightLength: 501.1,
        width: 25,
        elevationChange: 2.4,
      },
    ],
  },
  {
    name: "Nakayama",
    courses: [
      {
        surface: "Turf",
        circumference: 1840,
        straightLength: 310,
        width: 25,
        elevationChange: 5.3,
      },
      {
        surface: "Dirt",
        circumference: 1493,
        straightLength: 308,
        width: 25,
        elevationChange: 4.5,
      },
    ],
  },
  {
    name: "Ascot",
    courses: [
      {
        surface: "Turf",
        circumference: 2800,
        straightLength: 500,
        width: 30,
        elevationChange: 22.2,
      },
    ],
  },
  {
    name: "Sha Tin",
    courses: [
      {
        surface: "Turf",
        circumference: 1899,
        straightLength: 430,
        width: 30.5,
        elevationChange: 0,
      },
      { surface: "Dirt", circumference: 1560, straightLength: 380, width: 25, elevationChange: 0 },
    ],
  },
];

function generateOvalSections(
  circumference: number,
  straightLength: number,
  elevationChange: number,
) {
  const turnLength = (circumference - 2 * straightLength) / 2;
  const radius = turnLength / Math.PI;
  const grad = elevationChange ? (elevationChange / circumference) * 100 : 0; // simplistic gradient dist

  return [
    { type: "straight", length: straightLength, gradient: grad, orientationDeg: 270 },
    {
      type: "turn",
      length: turnLength,
      radius: radius,
      gradient: -grad,
      entryOrientationDeg: 270,
      exitOrientationDeg: 90,
    },
    { type: "straight", length: straightLength, gradient: grad, orientationDeg: 90 },
    {
      type: "turn",
      length: turnLength,
      radius: radius,
      gradient: -grad,
      entryOrientationDeg: 90,
      exitOrientationDeg: 270,
    },
  ];
}

officialData.forEach((data) => {
  const track = tracks.find((t) => t.name === data.name);
  if (track) {
    data.courses.forEach((offCourse) => {
      const course = track.courses.find((c) => c.surface === offCourse.surface);
      if (course) {
        course.circumference = offCourse.circumference;
        course.straightLength = offCourse.straightLength;
        course.width = offCourse.width;
        course.sections = generateOvalSections(
          offCourse.circumference,
          offCourse.straightLength,
          offCourse.elevationChange,
        );
      }
    });
  }
});

fs.writeFileSync(tracksJsonPath, JSON.stringify(tracks, null, 2));
console.log("Updated major tracks with official data.");
