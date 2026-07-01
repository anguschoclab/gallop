/**
 * regions.ts - Regional calendar configuration
 *
 * This file provides region configurations for racing calendars worldwide, including
 * region IDs, names, tracks, special race keys (Triple Crown, Classics), and continent
 * classifications.
 *
 * Dependencies: @/game/gradedRaces (Grade)
 * Related files: None
 */

import type { Grade } from "@/data/gradedRaces";

export type RegionId =
  | "canada"
  | "usa"
  | "uk"
  | "ireland"
  | "france"
  | "germany"
  | "scandinavia"
  | "uae"
  | "saudi-arabia"
  | "japan"
  | "hong-kong"
  | "australia"
  | "south-america"
  | "italy"
  | "spain"
  | "austria"
  | "belgium"
  | "czech-republic"
  | "hungary"
  | "turkey"
  | "singapore";

/**
 * Region configuration interface.
 */
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

// Canadian Triple Tiara races (fillies)
const CANADIAN_TRIPLE_TIARA = new Set([
  "ca-woodbine-oaks",
  "ca-bison-city-stakes",
  "ca-wonder-where-stakes",
]);

// USA Triple Crown races
const USA_TRIPLE_CROWN = new Set(["usa-kentucky-derby", "usa-preakness", "usa-belmont-stakes"]);

// USA Triple Tiara races (fillies)
const USA_TRIPLE_TIARA = new Set([
  "usa-kentucky-oaks",
  "usa-black-eyed-susan-stakes",
  "usa-acorn-stakes",
]);

// UK Classics (Guineas, Derby, Oaks, St Leger) - using gb- prefix from gradedRaces.ts
const UK_CLASSICS = new Set([
  "gb-2000-guineas-stakes",
  "gb-1000-guineas-stakes",
  "gb-derby-stakes",
  "gb-oaks-stakes",
  "gb-st-leger-stakes",
]);

// Ireland Triple Crown races
const IRELAND_TRIPLE_CROWN = new Set([
  "ie-irish-2-000-guineas",
  "ie-irish-derby",
  "ie-irish-st-leger",
]);

// France Triple Crown races
const FRANCE_TRIPLE_CROWN = new Set([
  "fr-poule-d-essai-des-poulains",
  "fr-prix-du-jockey-club",
  "fr-grand-prix-de-paris",
]);

// Italy Triple Crown races
const ITALY_TRIPLE_CROWN = new Set([
  "it-premio-parioli",
  "it-derby-italiano",
  "it-st-leger-italiano",
]);

// Argentina Triple Crown races
const ARGENTINA_TRIPLE_CROWN = new Set([
  "argentina-gran-premio-polla-de-potrillos",
  "argentina-gran-premio-jockey-club",
  "argentina-gran-premio-nacional",
]);

// Hong Kong Triple Crown races
const HONG_KONG_TRIPLE_CROWN = new Set([
  "hk-stewards-cup",
  "hk-hong-kong-gold-cup",
  "hk-champions-chater-cup",
]);

// Hungary Triple Crown races
const HUNGARY_TRIPLE_CROWN = new Set(["hu-nemzeti-dij", "hu-magyar-derby", "hu-magyar-st-leger"]);

// Japan Triple Crown races
const JAPAN_TRIPLE_CROWN = new Set(["jp-satsuki-sho", "jp-tokyo-yushun", "jp-kikuka-sho"]);

// Japan Triple Tiara races (fillies)
const JAPAN_TRIPLE_TIARA = new Set(["jp-oka-sho", "jp-yushun-himba", "jp-shuka-sho"]);

// Australia Triple Crown races
const AUSTRALIA_TRIPLE_CROWN = new Set([
  "au-randwick-guineas",
  "au-rosehill-guineas",
  "au-victoria-derby",
]);

// Germany Triple Crown races
const GERMANY_TRIPLE_CROWN = new Set([
  "de-mehl-mulhens-rennen",
  "de-deutsches-derby",
  "de-deutsches-st-leger",
]);

// Brazil Triple Crown races (males)
const BRAZIL_TRIPLE_CROWN = new Set([
  "brazil-grande-pr-mio-estado-do-rio-de-janeiro",
  "brazil-grande-pr-mio-francisco-eduardo-e-linneo-eduardo-de-p",
  "brazil-grande-pr-mio-cruzeiro-do-sul-brazilian-derby",
]);

// Brazil Triple Tiara races (fillies)
const BRAZIL_TRIPLE_TIARA = new Set([
  "brazil-grande-pr-mio-henrique-possollo",
  "brazil-grande-pr-mio-diana",
  "brazil-grande-pr-mio-z-lia-gonzaga-peixoto-de-castro",
]);

// Chile Triple Crown races
const CHILE_TRIPLE_CROWN = new Set([
  "chile-cl-sico-el-ensayo",
  "chile-cl-sico-st-leger",
  "chile-cl-sico-el-derby",
]);

export const REGIONS: Record<RegionId, RegionConfig> = {
  canada: {
    id: "canada",
    name: "Canada",
    title: "Canadian Flat Racing Calendar",
    subtitle: "Grade 1, 2, and 3 stakes races across Canada",
    tracks: ["Woodbine", "Fort Erie", "Century Mile", "Hastings"],
    specialRaceKeys: new Set([...CANADIAN_TRIPLE_CROWN, ...CANADIAN_TRIPLE_TIARA]),
    specialFilterName: "Triple Crown & Tiara",
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
    specialRaceKeys: new Set([...USA_TRIPLE_CROWN, ...USA_TRIPLE_TIARA]),
    specialFilterName: "Triple Crown & Tiara",
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
      "Newcastle",
      "Ayr",
      "Kempton",
      "Lingfield",
      "Salisbury",
      "Windsor",
    ],
    specialRaceKeys: UK_CLASSICS,
    specialFilterName: "Classics",
    continent: "europe",
  },
  ireland: {
    id: "ireland",
    name: "Ireland",
    title: "Irish Racing Calendar",
    subtitle: "Classic and graded stakes from the Curragh to Leopardstown",
    tracks: ["Curragh", "Leopardstown", "Navan", "Naas", "Cork", "Gowran Park", "Fairyhouse", "Dundalk"],
    specialRaceKeys: IRELAND_TRIPLE_CROWN,
    specialFilterName: "Triple Crown",
    continent: "europe",
  },
  france: {
    id: "france",
    name: "France",
    title: "French Racing Calendar",
    subtitle: "Prestigious stakes including the Prix de l'Arc de Triomphe",
    tracks: ["Saint-Cloud", "Longchamp", "Deauville", "Chantilly", "Vichy", "Toulouse"],
    specialRaceKeys: FRANCE_TRIPLE_CROWN,
    specialFilterName: "Triple Crown",
    continent: "europe",
  },
  germany: {
    id: "germany",
    name: "Germany",
    title: "German Racing Calendar",
    subtitle: "Grade stakes across Germany's historic racecourses",
    tracks: ["Düsseldorf", "Cologne", "Baden-Baden", "Hanover", "Krefeld", "Hoppegarten", "Hamburg", "Munich", "Dortmund"],
    specialRaceKeys: GERMANY_TRIPLE_CROWN,
    specialFilterName: "Triple Crown",
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
      "Sapporo",
      "Kokura",
      "Fukushima",
      "Niigata",
      "Hakodate",
      "Kitakyushu",
      "Various",
      "Urawa Kinen",
    ],
    specialRaceKeys: new Set([...JAPAN_TRIPLE_CROWN, ...JAPAN_TRIPLE_TIARA]),
    specialFilterName: "Triple Crown & Tiara",
    continent: "asia_pacific",
  },
  "hong-kong": {
    id: "hong-kong",
    name: "Hong Kong",
    title: "Hong Kong Racing Calendar",
    subtitle: "Premier racing at Sha Tin and Happy Valley",
    tracks: ["Sha Tin", "Happy Valley"],
    specialRaceKeys: HONG_KONG_TRIPLE_CROWN,
    specialFilterName: "Triple Crown",
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
    specialRaceKeys: AUSTRALIA_TRIPLE_CROWN,
    specialFilterName: "Triple Crown",
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
    specialRaceKeys: new Set([
      ...ARGENTINA_TRIPLE_CROWN,
      ...BRAZIL_TRIPLE_CROWN,
      ...BRAZIL_TRIPLE_TIARA,
      ...CHILE_TRIPLE_CROWN,
    ]),
    specialFilterName: "Triple Crown & Tiara",
    continent: "south_america",
  },
  italy: {
    id: "italy",
    name: "Italy",
    title: "Italian Racing Calendar",
    subtitle: "Historic stakes at Capannelle and San Siro",
    tracks: ["Capannelle", "San Siro"],
    specialRaceKeys: ITALY_TRIPLE_CROWN,
    specialFilterName: "Triple Crown",
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
  "saudi-arabia": {
    id: "saudi-arabia",
    name: "Saudi Arabia",
    title: "Saudi Arabian Racing Calendar",
    subtitle: "Winter racing at King Abdulaziz Racecourse in Riyadh",
    tracks: ["King Abdulaziz Racecourse"],
    continent: "europe",
  },
  austria: {
    id: "austria",
    name: "Austria",
    title: "Austrian Racing Calendar",
    subtitle: "Flat racing across Austria's historic racecourses",
    tracks: ["Vienna", "Klagenfurt", "Ebreichsdorf", "Freudenau"],
    continent: "europe",
  },
  belgium: {
    id: "belgium",
    name: "Belgium",
    title: "Belgian Racing Calendar",
    subtitle: "Flat racing in Ostend and Mons",
    tracks: ["Ostend", "Mons"],
    continent: "europe",
  },
  "czech-republic": {
    id: "czech-republic",
    name: "Czech Republic",
    title: "Czech Racing Calendar",
    subtitle: "Flat racing across the Czech Republic",
    tracks: ["Prague", "Most", "Karlovy Vary"],
    continent: "europe",
  },
  hungary: {
    id: "hungary",
    name: "Hungary",
    title: "Hungarian Racing Calendar",
    subtitle: "Flat racing at Kincsem Park, Budapest",
    tracks: ["Kincsem Park"],
    specialRaceKeys: HUNGARY_TRIPLE_CROWN,
    specialFilterName: "Triple Crown",
    continent: "europe",
  },
  turkey: {
    id: "turkey",
    name: "Turkey",
    title: "Turkish Racing Calendar",
    subtitle: "Flat racing at Veliefendi, Istanbul",
    tracks: ["Veliefendi"],
    continent: "europe",
  },
  singapore: {
    id: "singapore",
    name: "Singapore",
    title: "Singapore Racing Calendar",
    subtitle: "Flat racing at Kranji",
    tracks: ["Kranji"],
    continent: "asia_pacific",
  },
};

export const REGION_LIST = Object.values(REGIONS);

/**
 * Get region by ID.
 *
 * @param id - Region ID
 * @returns Region config or undefined if not found
 *
 * @example
 * const region = getRegion("usa");
 */
export function getRegion(id: string): RegionConfig | undefined {
  return REGIONS[id as RegionId];
}

/**
 * Check if a region ID is valid.
 *
 * @param id - Region ID to check
 * @returns True if valid region ID
 *
 * @example
 * const valid = isValidRegion("usa"); // true
 */
export function isValidRegion(id: string): id is RegionId {
  return id in REGIONS;
}
