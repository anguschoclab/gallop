import type { Grade } from "@/game/gradedRaces";

export type RegionId =
  | "canada"
  | "usa"
  | "uk"
  | "ireland"
  | "france"
  | "germany"
  | "scandinavia"
  | "uae"
  | "japan"
  | "hong-kong"
  | "australia"
  | "south-america"
  | "italy"
  | "spain";

export interface RegionConfig {
  id: RegionId;
  name: string;
  title: string;
  subtitle: string;
  tracks: string[];
  /** Optional set of special race keys for highlighting (e.g., Triple Crown) */
  specialRaceKeys?: Set<string>;
  /** Special filter name to display (e.g., "Triple Crown") */
  specialFilterName?: string;
  /** Continent for additional filtering if needed */
  continent?: "north_america" | "europe" | "asia_pacific" | "south_america";
}

// Canadian Triple Crown races
const CANADIAN_TRIPLE_CROWN = new Set([
  "ca-kings-plate",
  "ca-prince-of-wales",
  "ca-breeders-stakes",
]);

// USA Triple Crown races
const USA_TRIPLE_CROWN = new Set([
  "usa-kentucky-derby",
  "usa-preakness",
  "usa-belmont-stakes",
]);

// UK Triple Crown races (Guineas, Derby, St Leger)
const UK_TRIPLE_CROWN = new Set([
  "uk-2000-guineas",
  "uk-1000-guineas",
  "uk-derby",
  "uk-oaks",
  "uk-st-leger",
]);

export const REGIONS: Record<RegionId, RegionConfig> = {
  canada: {
    id: "canada",
    name: "Canada",
    title: "Canadian Flat Racing Calendar",
    subtitle: "Grade 1, 2, and 3 stakes races across Canada",
    tracks: ["Woodbine", "Fort Erie", "Century Mile", "Hastings"],
    specialRaceKeys: CANADIAN_TRIPLE_CROWN,
    specialFilterName: "Triple Crown",
    continent: "north_america",
  },
  usa: {
    id: "usa",
    name: "USA",
    title: "United States Racing Calendar",
    subtitle: "Triple Crown and major graded stakes across America",
    tracks: [
      "Churchill Downs",
      "Pimlico",
      "Belmont Park",
      "Saratoga",
      "Santa Anita",
      "Keeneland",
      "Del Mar",
      "Aqueduct",
      "Oaklawn Park",
      "Gulfstream Park",
      "Monmouth Park",
      "Fair Grounds",
      "Tampa Bay Downs",
      "Lone Star Park",
      "Belmont at the Big A",
    ],
    specialRaceKeys: USA_TRIPLE_CROWN,
    specialFilterName: "Triple Crown",
    continent: "north_america",
  },
  uk: {
    id: "uk",
    name: "UK",
    title: "Great Britain Racing Calendar",
    subtitle: "Classic races and prestigious stakes from Newmarket to Ascot",
    tracks: [
      "Newmarket",
      "Newmarket (July)",
      "Newbury",
      "Epsom",
      "Ascot",
      "Sandown",
      "York",
      "Haydock",
      "Chester",
      "Doncaster",
      "Goodwood",
    ],
    specialRaceKeys: UK_TRIPLE_CROWN,
    specialFilterName: "Classics",
    continent: "europe",
  },
  ireland: {
    id: "ireland",
    name: "Ireland",
    title: "Irish Racing Calendar",
    subtitle: "Classic and graded stakes from the Curragh to Leopardstown",
    tracks: ["Curragh", "Leopardstown", "Navan", "Naas"],
    continent: "europe",
  },
  france: {
    id: "france",
    name: "France",
    title: "French Racing Calendar",
    subtitle: "Prestigious stakes including the Prix de l'Arc de Triomphe",
    tracks: ["Saint-Cloud", "Longchamp", "Deauville", "Chantilly", "Vichy", "Toulouse"],
    continent: "europe",
  },
  germany: {
    id: "germany",
    name: "Germany",
    title: "German Racing Calendar",
    subtitle: "Grade stakes across Germany's historic racecourses",
    tracks: ["Düsseldorf", "Cologne", "Baden-Baden", "Hanover", "Krefeld", "Hoppegarten"],
    continent: "europe",
  },
  scandinavia: {
    id: "scandinavia",
    name: "Scandinavia",
    title: "Scandinavian Racing Calendar",
    subtitle: "Grade stakes from Sweden, Norway, and Denmark",
    tracks: ["Bro Park", "Øvrevoll", "Klampenborg", "Jägersro"],
    continent: "europe",
  },
  uae: {
    id: "uae",
    name: "UAE",
    title: "UAE Racing Calendar",
    subtitle: "Winter racing at Meydan and Abu Dhabi",
    tracks: ["Meydan", "Abu Dhabi", "Jebel Ali"],
    continent: "europe",
  },
  japan: {
    id: "japan",
    name: "Japan",
    title: "Japanese Racing Calendar",
    subtitle: "Major JRA and NAR graded stakes across Japan",
    tracks: [
      "Tokyo",
      "Chukyo",
      "Hanshin",
      "Nakayama",
      "Kyoto",
      "Kanazawa",
      "Monbetsu",
      "Nagoya",
      "Sonoda",
      "Kawasaki",
      "Funabashi",
      "Ohi",
      "Urawa",
      "Morioka",
      "Saga",
      "Kochi",
      "Oi",
    ],
    continent: "asia_pacific",
  },
  "hong-kong": {
    id: "hong-kong",
    name: "Hong Kong",
    title: "Hong Kong Racing Calendar",
    subtitle: "Premier racing at Sha Tin and Happy Valley",
    tracks: ["Sha Tin", "Happy Valley"],
    continent: "asia_pacific",
  },
  australia: {
    id: "australia",
    name: "Australia",
    title: "Australian Racing Calendar",
    subtitle: "Major stakes including the Melbourne Cup carnival",
    tracks: [
      "Flemington",
      "Randwick",
      "Caulfield",
      "Moonee Valley",
      "Rosehill",
      "Eagle Farm",
      "Morphettville",
    ],
    continent: "asia_pacific",
  },
  "south-america": {
    id: "south-america",
    name: "South America",
    title: "South American Racing Calendar",
    subtitle: "Graded stakes from Argentina, Brazil, and Chile",
    tracks: [
      "Hipódromo de San Isidro",
      "Hipódromo Argentino de Palermo",
      "Hipódromo de La Plata",
      "Hipódromo da Gávea",
      "Hipódromo Cidade Jardim",
      "Valparaiso Sporting Club",
      "Club Hípico de Santiago",
      "Hipódromo Chile",
    ],
    continent: "south_america",
  },
  italy: {
    id: "italy",
    name: "Italy",
    title: "Italian Racing Calendar",
    subtitle: "Historic stakes at Capannelle and San Siro",
    tracks: ["Capannelle", "San Siro"],
    continent: "europe",
  },
  spain: {
    id: "spain",
    name: "Spain",
    title: "Spanish Racing Calendar",
    subtitle: "Graded stakes across Spain's racecourses",
    tracks: ["Madrid", "San Sebastián", "Dos Hermanas"],
    continent: "europe",
  },
};

export const REGION_LIST = Object.values(REGIONS);

/** Get region by ID, returns undefined if not found */
export function getRegion(id: string): RegionConfig | undefined {
  return REGIONS[id as RegionId];
}

/** Check if a region ID is valid */
export function isValidRegion(id: string): id is RegionId {
  return id in REGIONS;
}
