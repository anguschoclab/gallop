// Curated dataset of famous thoroughbred sires and dams
// Sources: Wikipedia (Leading Sire in North America), TBHeritage.com (Foundation Sires)

export type AptitudinalGroup = "Brilliant" | "Intermediate" | "Classic" | "Solid" | "Professional";

export interface PedigreeHorse {
  name: string;
  sire?: string;
  dam?: string;
  era?: "foundation" | "19th-century" | "early-20th" | "mid-20th" | "modern";
  notes?: string;
  dosageGroups?: [AptitudinalGroup] | [AptitudinalGroup, AptitudinalGroup]; // Chef-de-race classification
}

// Foundation sires - the three Arabian stallions that founded the Thoroughbred breed
const foundationSires: PedigreeHorse[] = [
  { name: "Byerley Turk", era: "foundation", notes: "One of three foundation sires of the Thoroughbred" },
  { name: "Darley Arabian", era: "foundation", notes: "One of three foundation sires of the Thoroughbred" },
  { name: "Godolphin Arabian", era: "foundation", notes: "One of three foundation sires of the Thoroughbred" },
];

// 19th century leading sires (from Wikipedia Leading Sire in North America)
const nineteenthCenturySires: PedigreeHorse[] = [
  { name: "Sir Charles", sire: "unknown", dam: "unknown", era: "19th-century", notes: "Leading sire 1830-1832, 1836" },
  { name: "Monsieur Tonson", sire: "unknown", dam: "unknown", era: "19th-century", notes: "Leading sire 1834" },
  { name: "Bertrand", sire: "unknown", dam: "unknown", era: "19th-century", notes: "Leading sire 1835" },
  { name: "Leviathan", sire: "unknown", dam: "unknown", era: "19th-century", notes: "Leading sire 1837-1839, 1843, 1848" },
  { name: "Medoc", sire: "unknown", dam: "unknown", era: "19th-century", notes: "Leading sire 1840-1841" },
  { name: "Priam", sire: "unknown", dam: "unknown", era: "19th-century", notes: "Leading sire 1842, 1844-1846" },
  { name: "Glencoe", sire: "unknown", dam: "unknown", era: "19th-century", notes: "Leading sire 1847, 1849, 1854-1858" },
  { name: "Boston", sire: "unknown", dam: "unknown", era: "19th-century", notes: "Leading sire 1851-1853" },
  { name: "Albion", sire: "unknown", dam: "unknown", era: "19th-century", notes: "Leading sire 1859" },
  { name: "Revenue", sire: "unknown", dam: "unknown", era: "19th-century", notes: "Leading sire 1860" },
  { name: "Lexington", sire: "Boston", dam: "Alice Carneal", era: "19th-century", notes: "Leading sire 1861-1874, 1876, 1878 - Most dominant sire of 19th century" },
  { name: "Leamington", sire: "unknown", dam: "unknown", era: "19th-century", notes: "Leading sire 1875, 1877, 1879, 1881" },
  { name: "Bonnie Scotland", sire: "unknown", dam: "unknown", era: "19th-century", notes: "Leading sire 1880, 1882" },
  { name: "Billet", sire: "unknown", dam: "unknown", era: "19th-century", notes: "Leading sire 1883" },
  { name: "Glenelg", sire: "unknown", dam: "unknown", era: "19th-century", notes: "Leading sire 1884, 1886" },
  { name: "Virgil", sire: "unknown", dam: "unknown", era: "19th-century", notes: "Leading sire 1885" },
];

// Early 20th century leading sires
const early20thSires: PedigreeHorse[] = [
  { name: "Hamburg", sire: "Hanover", dam: "Lady Margaret", era: "early-20th", notes: "Leading sire early 1900s" },
  { name: "Peter Pan", sire: "St. Florian", dam: "Lady Reel", era: "early-20th", notes: "Leading sire early 1900s" },
  { name: "Broomstick", sire: "Ben Brush", dam: "Bonnie Gal", era: "early-20th", notes: "Sire of Regret (first filly to win Kentucky Derby 1915)" },
  { name: "Ben Brush", sire: "Bramble", dam: "Bonnie Scotland", era: "early-20th", notes: "1896 Kentucky Derby winner" },
  { name: "Black Toney", sire: "Black Servant", dam: "Bonne Belle", era: "early-20th", notes: "Sired Black Gold (1924) and Brokers Tip (1933) Kentucky Derby winners" },
  { name: "Sir Gallahad III", sire: "Rabelais", dam: "Plucky Liege", era: "early-20th", notes: "Leading broodmare sire 12 times" },
];

// Mid 20th century famous sires
const mid20thSires: PedigreeHorse[] = [
  { name: "Bull Lea", sire: "Bull Dog", dam: "Rose Leaves", era: "mid-20th", notes: "Leading sire 1940s-1950s", dosageGroups: ["Classic"] },
  { name: "Count Fleet", sire: "Reigh Count", dam: " Quickly", era: "mid-20th", notes: "1943 Triple Crown winner", dosageGroups: ["Classic"] },
  { name: "Citation", sire: "Bull Lea", dam: "Alaq", era: "mid-20th", notes: "1948 Triple Crown winner", dosageGroups: ["Classic"] },
  { name: "Nasrullah", sire: "Nearco", dam: "Mumtaz Mahal", era: "mid-20th", notes: "Champion sire in England/Ireland 1951, leading sire in North America 5 times", dosageGroups: ["Brilliant", "Intermediate"] },
  { name: "Nearco", sire: "Pharos", dam: "Nogara", era: "mid-20th", notes: " undefeated champion, influential sire line", dosageGroups: ["Classic"] },
  { name: "Princequillo", sire: "Quadrangle", dam: "Cosquilla", era: "mid-20th", notes: "Leading sire multiple times", dosageGroups: ["Solid", "Professional"] },
  { name: "Bold Ruler", sire: "Nasrullah", dam: "Miss Disco", era: "mid-20th", notes: "Sire of Secretariat, leading sire 1958", dosageGroups: ["Brilliant", "Classic"] },
  { name: "Round Table", sire: "Princequillo", dam: "Knight's Daughter", era: "mid-20th", notes: "Champion racehorse and sire", dosageGroups: ["Classic"] },
];

// Modern famous sires (late 20th century to present)
const modernSires: PedigreeHorse[] = [
  { name: "Northern Dancer", sire: "Nearctic", dam: "Natalma", era: "modern", notes: "1964 Kentucky Derby winner, most influential sire of modern era", dosageGroups: ["Brilliant", "Classic"] },
  { name: "Nearctic", sire: "Nearco", dam: "Lady Angela", era: "modern", notes: "Sire of Northern Dancer", dosageGroups: ["Classic"] },
  { name: "Mr. Prospector", sire: "Raise a Native", dam: "Gold Digger", era: "modern", notes: "Leading broodmare sire, influential sire line", dosageGroups: ["Brilliant", "Intermediate"] },
  { name: "Raise a Native", sire: "Native Dancer", dam: "Raise You", era: "modern", notes: "Sire of Mr. Prospector and Majestic Prince", dosageGroups: ["Brilliant"] },
  { name: "Native Dancer", sire: "Polynesian", dam: "Geisha", era: "modern", notes: "1954 Horse of the Year, undefeated except for one loss", dosageGroups: ["Classic"] },
  { name: "Seattle Slew", sire: "Bold Reasoning", dam: "My Charmer", era: "modern", notes: "1977 Triple Crown winner (only undefeated Triple Crown winner)", dosageGroups: ["Classic"] },
  { name: "Bold Reasoning", sire: "Boldnesian", dam: "Reason to Win", era: "modern", notes: "Sire of Seattle Slew", dosageGroups: ["Classic"] },
  { name: "Affirmed", sire: "Exclusive Native", dam: "Won't Tell You", era: "modern", notes: "1978 Triple Crown winner", dosageGroups: ["Classic"] },
  { name: "Exclusive Native", sire: "Raise a Native", dam: "Exclusive", era: "modern", notes: "Sire of Affirmed", dosageGroups: ["Brilliant", "Classic"] },
  { name: "Secretariat", sire: "Bold Ruler", dam: "Somethingroyal", era: "modern", notes: "1973 Triple Crown winner, set track records still standing", dosageGroups: ["Brilliant", "Intermediate"] },
  { name: "A.P. Indy", sire: "Seattle Slew", dam: "Weekend Surprise", era: "modern", notes: "1992 Horse of the Year, leading sire", dosageGroups: ["Classic"] },
  { name: "Storm Cat", sire: "Storm Bird", dam: "Terlingua", era: "modern", notes: "Leading sire, influential in modern breeding", dosageGroups: ["Brilliant", "Intermediate"] },
  { name: "Storm Bird", sire: "Northern Dancer", dam: "South Ocean", era: "modern", notes: "Sire of Storm Cat", dosageGroups: ["Brilliant"] },
  { name: "Danzig", sire: "Northern Dancer", dam: "Pas de Nom", era: "modern", notes: "Leading sire, sire of Chief's Crown", dosageGroups: ["Brilliant", "Intermediate"] },
  { name: "Sadler's Wells", sire: "Northern Dancer", dam: "Fairy Bridge", era: "modern", notes: "Leading sire in Europe multiple times", dosageGroups: ["Classic", "Solid"] },
  { name: "Galileo", sire: "Sadler's Wells", dam: "Urban Sea", era: "modern", notes: "Leading sire in Europe multiple times", dosageGroups: ["Classic", "Solid"] },
  { name: "Urban Sea", sire: "Miswaki", dam: "Allegretta", era: "modern", notes: "Dam of Galileo and Sea the Stars" },
  { name: "Sea the Stars", sire: "Galileo", dam: "Urban Sea", era: "modern", notes: "2009 Horse of the Year, won 2000 Guineas, Derby, Arc" },
  { name: "Dubawi", sire: "Dubai Millennium", dam: "Zomarad", era: "modern", notes: "Leading sire in Europe", dosageGroups: ["Brilliant", "Classic"] },
  { name: "Frankel", sire: "Galileo", dam: "Kind", era: "modern", notes: "Undefeated champion, leading sire", dosageGroups: ["Brilliant", "Classic"] },
  { name: "Tapit", sire: "Pulpit", dam: "Unbridled Elaine", era: "modern", notes: "Leading North American sire multiple times", dosageGroups: ["Brilliant", "Classic"] },
  { name: "Pulpit", sire: "A.P. Indy", dam: "Prospectors Delite", era: "modern", notes: "Sire of Tapit", dosageGroups: ["Classic"] },
  { name: "American Pharoah", sire: "Pioneerof the Nile", dam: "Littleprincessemma", era: "modern", notes: "2015 Triple Crown winner, first in 37 years" },
  { name: "Pioneerof the Nile", sire: "Empire Maker", dam: "Lady Linda", era: "modern", notes: "Sire of American Pharoah" },
  { name: "Justify", sire: "Scat Daddy", dam: "Stage Magic", era: "modern", notes: "2018 Triple Crown winner" },
  { name: "Scat Daddy", sire: "Johannesburg", dam: "Love Style", era: "modern", notes: "Sire of Justify", dosageGroups: ["Brilliant", "Intermediate"] },
  { name: "Flightline", sire: "Tapit", dam: "Baby Zip", era: "modern", notes: "Undefeated champion, set track record in Pacific Classic" },
];

// Famous dams (broodmares)
const famousDams: PedigreeHorse[] = [
  { name: "Somethingroyal", sire: "Princequillo", dam: "Imperial Gesture", era: "modern", notes: "Dam of Secretariat" },
  { name: "Weekend Surprise", sire: "Secretariat", dam: "Lassie Dear", era: "modern", notes: "Dam of A.P. Indy and Summer Squall" },
  { name: "Lassie Dear", sire: "Buckpasser", dam: "Dear Damsel", era: "modern", notes: "Dam of Weekend Surprise" },
  { name: "Terlingua", sire: "Crimson Satan", dam: "Crimson Saint", era: "modern", notes: "Dam of Storm Cat" },
  { name: "Personal Ensign", sire: "Private Account", dam: "Grecian Banner", era: "modern", notes: "Undefeated champion mare, dam of My Flag" },
  { name: "Zenyatta", sire: "Street Cry", dam: "Vertigineux", era: "modern", notes: "Undefeated except for one loss, Hall of Fame mare" },
  { name: "Rags to Riches", sire: "A.P. Indy", dam: "Better Than Honour", era: "modern", notes: "First filly to win Belmont Stakes in 102 years" },
  { name: "Rachel Alexandra", sire: "Medaglia d'Oro", dam: "Dolphin Girl", era: "modern", notes: "2009 Horse of the Year, first filly to win Preakness in 85 years" },
  { name: "Winx", sire: "Street Boss", dam: "Vegas Show Girl", era: "modern", notes: "Australian champion, 33 consecutive wins" },
];

// Combine all horses into a single dataset
export const pedigreeDataset: PedigreeHorse[] = [
  ...foundationSires,
  ...nineteenthCenturySires,
  ...early20thSires,
  ...mid20thSires,
  ...modernSires,
  ...famousDams,
];

// Create a map for quick lookup by name
export const pedigreeMap = new Map<string, PedigreeHorse>(
  pedigreeDataset.map((horse) => [horse.name.toLowerCase(), horse])
);

// Function to find a horse by name (case-insensitive)
export function findHorseByName(name: string): PedigreeHorse | undefined {
  return pedigreeMap.get(name.toLowerCase());
}

// Function to get sire of a horse by name
export function getSireByName(horseName: string): string | undefined {
  const horse = findHorseByName(horseName);
  return horse?.sire;
}

// Function to get dam of a horse by name
export function getDamByName(horseName: string): string | undefined {
  const horse = findHorseByName(horseName);
  return horse?.dam;
}

// Function to get random horse from a specific era
export function getRandomHorseFromEra(era: PedigreeHorse["era"]): PedigreeHorse | undefined {
  const horses = pedigreeDataset.filter((h) => h.era === era);
  if (horses.length === 0) return undefined;
  return horses[Math.floor(Math.random() * horses.length)];
}

// Function to get random sire from the dataset
export function getRandomSire(): PedigreeHorse | undefined {
  const sires = pedigreeDataset.filter((h) => h.sire !== undefined || h.era === "foundation");
  if (sires.length === 0) return undefined;
  return sires[Math.floor(Math.random() * sires.length)];
}

// Function to get random dam from the dataset
export function getRandomDam(): PedigreeHorse | undefined {
  const dams = pedigreeDataset.filter((h) => h.dam !== undefined);
  if (dams.length === 0) return undefined;
  return dams[Math.floor(Math.random() * dams.length)];
}
