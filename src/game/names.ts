const adjectives = [
  "Thunder",
  "Silver",
  "Midnight",
  "Royal",
  "Golden",
  "Wild",
  "Swift",
  "Iron",
  "Crimson",
  "Shadow",
  "Lucky",
  "Northern",
  "Whispering",
  "Velvet",
  "Stormy",
  "Brave",
  "Noble",
  "Mystic",
  "Blazing",
  "Quiet",
  "Diamond",
  "Emerald",
  "Roaring",
];
const nouns = [
  "Bullet",
  "Star",
  "Spirit",
  "Comet",
  "Dancer",
  "Arrow",
  "Knight",
  "Whisper",
  "Flame",
  "Tide",
  "Empress",
  "Legacy",
  "Dream",
  "Charger",
  "Echo",
  "Bandit",
  "Saint",
  "Reverie",
  "Tempest",
  "Mirage",
  "Halo",
  "Voyager",
  "Sonnet",
];

export function randomHorseName(rng: () => number = Math.random) {
  const a = adjectives[Math.floor(rng() * adjectives.length)];
  const n = nouns[Math.floor(rng() * nouns.length)];
  return `${a} ${n}`;
}

const silks = [
  "#dc2626",
  "#2563eb",
  "#16a34a",
  "#9333ea",
  "#ea580c",
  "#0891b2",
  "#db2777",
  "#ca8a04",
  "#475569",
  "#0d9488",
];

export function randomSilk(rng: () => number = Math.random) {
  return silks[Math.floor(rng() * silks.length)];
}

const raceNamePrefixes = [
  "Ascot",
  "Belmont",
  "Churchill",
  "Doncaster",
  "Epsom",
  "Flemington",
  "Goodwood",
  "Hialeah",
  "Irish",
  "Kentucky",
  "Longchamp",
  "Newmarket",
  "Oaklawn",
  "Pimlico",
  "Saratoga",
  "Tokyo",
];
const raceNameSuffixes = [
  "Cup",
  "Stakes",
  "Trophy",
  "Classic",
  "Handicap",
  "Plate",
  "Mile",
  "Sprint",
];

export function randomRaceName(rng: () => number = Math.random) {
  const a = raceNamePrefixes[Math.floor(rng() * raceNamePrefixes.length)];
  const b = raceNameSuffixes[Math.floor(rng() * raceNameSuffixes.length)];
  return `${a} ${b}`;
}
