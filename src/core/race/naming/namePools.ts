// Regional name pools for race name generation
// Provides authentic naming patterns based on real-world racing conventions

import type { RegionalSystem } from "@/game/types";
import type { Rng } from "@/game/rng";

// Sponsor names for race naming
export const SPONSORS: Record<RegionalSystem, string[]> = {
  north_america: [
    "Kentucky", "Breeders' Cup", "Pegasus", "Travers", "Woodward", "Whitney",
    "Haskell", "Alfred G. Vanderbilt", "Jim Dandy", "Forego", "Cigar Mile",
    "Personal Ensign", "Beldame", "Ruffian", "Go for Wand", "John A. Morris",
    "Man o' War", "Secretariat", "Citation", "Seabiscuit", "Man O' War",
    "Arlington Million", "Pacific Classic", "Santa Anita Handicap", "Hollywood Gold Cup",
    "Jockey Club Gold Cup", "Suburban", "Metropolitan", "Acorn", "Mother Goose",
    "Coaching Club American Oaks", "Alabama", "Kentucky Oaks", "Ashland",
    "Fantasy Stakes", "Las Virgenes", "Santa Anita Derby", "Florida Derby",
    "Blue Grass Stakes", "Arkansas Derby", "Louisiana Derby", "Wood Memorial",
    "Withers", "Gotham", "Tampa Bay Derby", "Sunland Derby", " Spiral Stakes",
  ],
  europe: [
    "King George", "Queen Elizabeth", "Prince of Wales", "Duke of Edinburgh",
    "King's Stand", "Queen Anne", "Diamond Jubilee", "St James's Palace",
    "Coronation", "Commonwealth", "York", "Ebor", "Nunthorpe", "Lowther",
    "Middle Park", "Dewhurst", "Cheveley Park", "Falmouth", "Nassau",
    "July Cup", "Sussex", "International", "King George VI and Queen Elizabeth",
    "Champion", "St Leger", "Derby", "Oaks", "One Thousand Guineas", "Two Thousand Guineas",
    "Prix de l'Arc", "Prix du Jockey Club", "Prix Ganay", "Prix d'Ispahan",
    "Prix de Diane", "Prix Jean-Luc Lagardere", "Prix Morny", "Prix Marcel Boussac",
    "Prix Rothschild", "Grand Prix de Paris", "Prix de la Foret", "Prix de l'Abbaye",
    "Irish Derby", "Irish Oaks", "Irish Champion", "Tattersalls Gold Cup", "Prix de l'Opera",
  ],
  australia: [
    "Caulfield", "Flemington", "Moonee Valley", "Randwick", "Rosehill",
    "Warwick Farm", "Eagle Farm", "Doomben", "Morphettville", "Ascot",
    "Cox Plate", "Melbourne Cup", "Golden Slipper", "Caulfield Cup", "WS Cox Plate",
    "VRC Oaks", "VRC Derby", "AJC Derby", "AJC Oaks", "Doncaster Handicap",
    "Epsom Handicap", "Metropolitan", "Golden Rose", "The Galaxy", "The Everest",
    "Coolmore Stud Stakes", "Myer Classic", "Kingsford-Smith Cup", "All Aged Stakes",
    "Chipping Norton", "Ranvet Stakes", "Queen Elizabeth Stakes", "Sydney Cup",
    "Australian Cup", "Newmarket Handicap", "Lightning Stakes", "Oakleigh Plate",
    "Blake Stakes", "Rising Fast Stakes", "Champions Stakes", "The Galaxy",
  ],
  asia: [
    "Hong Kong", "Sha Tin", "Happy Valley", "Japan Cup", "Japan Dirt Derby",
    "Tenno Sho", "Arima Kinen", "Yasuda Kinen", "Mile Championship", "Takamatsunomi Kinen",
    "Victoria Mile", "Oka Sho", "Yushun Himba", "Kikuka Sho", "Satsuki Sho",
    "NHK Mile Cup", "Asahi Hai Futurity Stakes", "Hopeful Stakes", "Mainichi Okan",
    "Hong Kong Mile", "Hong Kong Vase", "Hong Kong Sprint", "Hong Kong Stewards' Cup",
    "Hong Kong Gold Cup", "Queen Elizabeth II Cup", "Chairman's Trophy",
    "Hong Kong Derby", "Centenary Sprint Cup", "Classic Mile", "Premier Cup",
    "Bayerische Zuchtrennen", "Grosser Preis von Baden", "Preis der Diana",
    "Deutsches Derby", "Grosser Preis von Berlin", "Olympia-Trophy",
  ],
  south_america: [
    "Carlos Pellegrini", "Latinoamericano", "Brasil", "Ensayo", "Jockey Club",
    "Republica Argentina", "Criadores", "25 de Mayo", "Miguel Alfredo Martinez de Hoz",
    "Gilberto Lerena", "Jorge de Atucha", "Ciudad de Buenos Aires", "Las Americas",
    "Polla de Potrillos", "Polla de Yeguas", "Grand Premio", "Clásico",
    "Premio", "José Pedro Ramírez", "Domingo Faustino Sarmiento", "Rivadavia",
    "Belgrano", "San Martín", "Mitre", "Roca", "Urquiza", "Moreno", "Guemes",
    "San Martín", "Brown", "Alvear", "Irigoyen", "Yrigoyen", "Pueyrredón",
    "Dorrego", "Viamonte", "Lavalle", "Las Heras", "Belgrano",
  ],
};

// Geographic/Location names for race naming
export const LOCATIONS: Record<RegionalSystem, string[]> = {
  north_america: [
    "Blue Grass", "Woodbine", "Gulfstream", "Santa Anita", "Del Mar",
    "Saratoga", "Belmont", "Churchill", "Keeneland", "Fair Grounds",
    "Oaklawn", "Pimlico", "Laurel", "Monmouth", "Parx",
    "Gulfstream Park", "Aqueduct", "Tampa Bay", "Golden Gate", "Emerald Downs",
    "Remington", "Fair Grounds", "Turfway", "Hawthorne", "Arlington",
    "Kentucky", "Florida", "California", "New York", "Maryland",
    "Louisiana", "Texas", "Illinois", "Pennsylvania", "Washington",
  ],
  europe: [
    "Epsom", "Newmarket", "Ascot", "Doncaster", "York", "Goodwood",
    "Haydock", "Chester", "Sandown", "Epsom Downs", "Longchamp",
    "Chantilly", "Deauville", "Saint-Cloud", "Maisons-Laffitte", "Chantilly",
    "The Curragh", "Leopardstown", "Navan", "Naas", "Punchestown",
    "Kempton", "Windsor", "Newbury", "Exeter", "Lingfield",
    "Nottingham", "Ripon", "York", "Newcastle", "Carlisle",
    "Ayr", "Hamilton", "Perth", "Musselburgh", "Kelso",
    "Fontwell", "Plumpton", "Hexham", "Catterick", "Southwell",
    "Wolverhampton", "Kempton Park", "Sandown Park", "Epsom Downs",
  ],
  australia: [
    "Flemington", "Caulfield", "Moonee Valley", "Randwick", "Rosehill",
    "Warwick Farm", "Eagle Farm", "Doomben", "Morphettville", "Ascot",
    "Flemington Racecourse", "Caulfield Racecourse", "Moonee Valley Racecourse",
    "Royal Randwick", "Rosehill Gardens", "Warwick Farm Racecourse",
    "Eagle Farm Racecourse", "Doomben Racecourse", "Morphettville Racecourse",
    "Ascot Racecourse", "Sydney", "Melbourne", "Brisbane", "Adelaide",
    "Perth", "Gold Coast", "Hobart", "Launceston", "Canberra",
  ],
  asia: [
    "Tokyo", "Kyoto", "Nakayama", "Hanshin", "Chukyo",
    "Sha Tin", "Happy Valley", "Fuchu", "Niigata", "Kokura",
    "Kasamatsu", "Mizunami", "Sonoda", "Monbetsu", "Nagoya",
    "Kanazawa", "Funabashi", "Ohi", "Nigata", "Hakodate",
    "Sapporo", "Narita", "Kasamatsu", "Kokura", "Niigata",
  ],
  south_america: [
    "San Isidro", "Palermo", "La Plata", "Gávea", "Cidade Jardim",
    "Valparaiso", "Santiago", "Hipódromo Chile", "San Isidro",
    "Palermo", "La Plata", "Gávea", "Cidade Jardim", "Valparaiso",
    "Santiago", "Hipódromo Chile", "Buenos Aires", "Rio de Janeiro",
    "São Paulo", "Valparaíso", "Santiago de Chile", "Montevideo", "Lima",
  ],
};

// Event/race type suffixes
export const EVENTS: Record<RegionalSystem, string[]> = {
  north_america: [
    "Stakes", "Handicap", "Cup", "Trophy", "Classic", "Mile", "Sprint",
    "Invitational", "Championship", "Memorial", "Derby", "Oaks",
    "Plate", "Breeders' Cup", "Futurity", "Juvenile", "Distaff",
  ],
  europe: [
    "Stakes", "Handicap", "Cup", "Trophy", "Classic", "Mile", "Sprint",
    "Championship", "Derby", "Oaks", "Guineas", "Plate",
    "Conditions", "Maiden", "Novice", "Seller", "Claimer",
  ],
  australia: [
    "Stakes", "Handicap", "Cup", "Trophy", "Classic", "Mile", "Sprint",
    "Plate", "Breeders' Cup", "Futurity", "Juvenile", "Distaff",
    "Benchmark", "Class", "Quality", "Progressive", "Maiden",
  ],
  asia: [
    "Stakes", "Handicap", "Cup", "Trophy", "Classic", "Mile", "Sprint",
    "Invitational", "Championship", "Memorial", "Derby", "Oaks",
    "Plate", "Futurity", "Juvenile", "Distaff",
  ],
  south_america: [
    "Stakes", "Handicap", "Cup", "Trophy", "Classic", "Mile", "Sprint",
    "Gran Premio", "Clásico", "Premio", "Derby", "Oaks",
    "Plate", "Futurity", "Juvenile", "Distaff",
  ],
};

// Adjectives for descriptive naming
export const ADJECTIVES: Record<RegionalSystem, string[]> = {
  north_america: [
    "Golden", "Silver", "Bronze", "Royal", "Imperial", "Grand",
    "Great", "Big", "Little", "Southern", "Northern", "Eastern", "Western",
    "Central", "Pacific", "Atlantic", "Gulf", "Mountain", "Valley",
    "River", "Lake", "Ocean", "Sky", "Star", "Moon", "Sun",
    "Thunder", "Lightning", "Storm", "Rain", "Wind", "Fire", "Ice",
    "Diamond", "Emerald", "Ruby", "Sapphire", "Pearl", "Jade",
  ],
  europe: [
    "Royal", "Imperial", "Grand", "Great", "Little", "Southern", "Northern",
    "Eastern", "Western", "Central", "Gold", "Silver", "Bronze",
    "Diamond", "Emerald", "Ruby", "Sapphire", "Pearl", "Jade",
    "Thunder", "Lightning", "Storm", "Rain", "Wind", "Fire", "Ice",
    "Sky", "Star", "Moon", "Sun", "Cloud", "Mist", "Fog",
  ],
  australia: [
    "Golden", "Silver", "Bronze", "Royal", "Imperial", "Grand",
    "Great", "Big", "Little", "Southern", "Northern", "Eastern", "Western",
    "Central", "Pacific", "Gold", "Silver", "Bronze",
    "Diamond", "Emerald", "Ruby", "Sapphire", "Pearl", "Jade",
  ],
  asia: [
    "Golden", "Silver", "Bronze", "Royal", "Imperial", "Grand",
    "Great", "Big", "Little", "Southern", "Northern", "Eastern", "Western",
    "Central", "Pacific", "Gold", "Silver", "Bronze",
    "Diamond", "Emerald", "Ruby", "Sapphire", "Pearl", "Jade",
  ],
  south_america: [
    "Gran", "Gran Premio", "Clásico", "Premio", "Golden", "Silver", "Bronze",
    "Royal", "Imperial", "Grand", "Great", "Big", "Little",
    "Southern", "Northern", "Eastern", "Western", "Central",
    "Diamond", "Emerald", "Ruby", "Sapphire", "Pearl", "Jade",
  ],
};

// Get a random element from an array
export function randomFromArray<T>(arr: T[], rng?: Rng): T {
  const r = rng ? rng.next() : Math.random();
  return arr[Math.floor(r * arr.length)];
}

// Get a random sponsor name for a region
export function getRandomSponsor(region: RegionalSystem, rng?: Rng): string {
  return randomFromArray(SPONSORS[region] || SPONSORS.north_america, rng);
}

// Get a random location name for a region
export function getRandomLocation(region: RegionalSystem, rng?: Rng): string {
  return randomFromArray(LOCATIONS[region] || LOCATIONS.north_america, rng);
}

// Get a random event name for a region
export function getRandomEvent(region: RegionalSystem, rng?: Rng): string {
  return randomFromArray(EVENTS[region] || EVENTS.north_america, rng);
}

// Get a random adjective for a region
export function getRandomAdjective(region: RegionalSystem, rng?: Rng): string {
  return randomFromArray(ADJECTIVES[region] || ADJECTIVES.north_america, rng);
}
