/**
 * jockey/proceduralNaming.ts - Procedural jockey name generation
 *
 * This file provides regional jockey name pools and procedural name generation
 * for different racing regions.
 *
 * Dependencies: @/game/rng (Rng), @/game/types (RegionalSystem)
 * Related files: types.ts (provides jockey types)
 */

import type { Rng } from "@/core/common/rng";
import type { RegionalSystem } from "@/game/types";

export interface JockeyNamePool {
  first: string[];
  last: string[];
}

const REGIONAL_POOLS: Record<RegionalSystem, JockeyNamePool> = {
  north_america: {
    first: [
      "Mike",
      "John",
      "Tyler",
      "Joel",
      "Irad",
      "Jose",
      "Flavien",
      "Victor",
      "Kent",
      "Corey",
      "Julien",
      "Luis",
      "Rafael",
      "Javier",
      "Junior",
      "Gary",
      "Angel",
      "Jerry",
      "Laffit",
      "Bill",
      "Michelle",
      "Julie",
      "Rosie",
      "Chantal",
      "Donna",
    ],
    last: [
      "Smith",
      "Velazquez",
      "Gaffalione",
      "Rosario",
      "Ortiz",
      "Prat",
      "Espinoza",
      "Desormeaux",
      "Nakatani",
      "Leparoux",
      "Saez",
      "Bejarano",
      "Castellano",
      "Alvarado",
      "Stevens",
      "Cordero",
      "Bailey",
      "Sellers",
      "Krone",
      "Sutherland",
      "Napravnik",
      "Sutherland",
      "Baze",
      "Pincay",
      "Shoemaker",
    ],
  },
  europe: {
    first: [
      "Frankie",
      "Ryan",
      "Lester",
      "Christophe",
      "William",
      "James",
      "Oisin",
      "Tom",
      "Ben",
      "Lanfranco",
      "Olivier",
      "Gerald",
      "Pat",
      "Ruby",
      "Davy",
      "Paul",
      "Rachael",
      "Hollie",
      "Hayley",
      "Nicola",
      "Josephine",
      "Marie",
      "Mickael",
      "Pierre-Charles",
      "Bauyrzhan",
    ],
    last: [
      "Dettori",
      "Moore",
      "Piggott",
      "Soumillon",
      "Buick",
      "McDonald",
      "Murphy",
      "Marquand",
      "Doyle",
      "Curtis",
      "Peslier",
      "Mosse",
      "Eddery",
      "Walsh",
      "Russell",
      "Townend",
      "Blackmore",
      "Doyle",
      "Turner",
      "Currie",
      "Gordon",
      "Velon",
      "Barzalona",
      "Boudot",
      "Murzabayev",
    ],
  },
  australia: {
    first: [
      "James",
      "Kerrin",
      "Hugh",
      "Zac",
      "Damian",
      "Craig",
      "Glen",
      "Nash",
      "Mark",
      "Blake",
      "Jamie",
      "Michelle",
      "Linda",
      "Stephanie",
      "Rachel",
      "Kathy",
      "Damien",
      "Luke",
      "Brett",
      "Glyn",
    ],
    last: [
      "McDonald",
      "McEvoy",
      "Bowman",
      "Purton",
      "Lane",
      "Williams",
      "Boss",
      "Rawiller",
      "Zahra",
      "Shinn",
      "Kah",
      "Payne",
      "Meech",
      "Thornton",
      "King",
      "O'Hara",
      "Oliver",
      "Nolen",
      "Prebble",
      "Schofield",
    ],
  },
  asia: {
    first: [
      "Yutaka",
      "Mirco",
      "Christophe",
      "Joao",
      "Zac",
      "Karis",
      "Vincent",
      "Derek",
      "Matthew",
      "Keith",
      "Karis",
      "Alexis",
      "Lyle",
      "Silvestre",
      "Neil",
      "Mickael",
      "Kenichi",
      "Norihiro",
      "Hiroyuki",
      "Takeshi",
    ],
    last: [
      "Take",
      "Demuro",
      "Lemaire",
      "Moreira",
      "Purton",
      "Teetan",
      "Ho",
      "Leung",
      "Chadwick",
      "Yeung",
      "Teetan",
      "Badel",
      "Hewitson",
      "De Sousa",
      "Callan",
      "Barzalona",
      "Ikezoe",
      "Yokoyama",
      "Uchida",
      "Yokoyama",
    ],
  },
  south_america: {
    first: [
      "Jorge",
      "Francisco",
      "Goncalo",
      "Altair",
      "Tiago",
      "Wilson",
      "Marcelo",
      "Fausto",
      "Pablo",
      "Everton",
      "Valdinei",
      "Wesley",
      "Leandro",
      "Bruno",
      "Jose",
      "Carlos",
      "Luis",
      "Eduardo",
      "Juan",
      "Hector",
    ],
    last: [
      "Ricardo",
      "Goncalves",
      "Fernandes",
      "Domingos",
      "Josue",
      "Moreira",
      "Souza",
      "Henrique",
      "Falero",
      "Rosa",
      "Gil",
      "Silva",
      "Goncalves",
      "Queiroz",
      "Aparecido",
      "Mendes",
      "Sanches",
      "Oliveira",
      "Cruz",
      "Berríos",
    ],
  },
};

/**
 * Generate a procedural jockey name based on the region.
 *
 * Uses regional name pools to generate culturally appropriate jockey names.
 * Avoids duplicate names by checking against a set of used names.
 *
 * @param region - Regional system for name pool selection
 * @param rng - Random number generator
 * @param usedNames - Optional set of already used names to avoid duplicates
 * @returns Generated jockey name
 *
 * @example
 * const name = generateProceduralJockeyName("north_america", rng);
 */
export function generateProceduralJockeyName(
  region: RegionalSystem,
  rng: Rng,
  usedNames?: Set<string>,
): string {
  const pool = REGIONAL_POOLS[region] || REGIONAL_POOLS.north_america;

  let attempts = 0;
  while (attempts < 50) {
    const first = rng.pick(pool.first);
    const last = rng.pick(pool.last);
    const name = `${first} ${last}`;

    if (!usedNames || !usedNames.has(name.toLowerCase())) {
      return name;
    }
    attempts++;
  }

  // Fallback to appending a middle initial or numeric suffix if exhausted
  const first = rng.pick(pool.first);
  const last = rng.pick(pool.last);
  const initial = String.fromCharCode(65 + rng.int(0, 25)); // A-Z
  return `${first} ${initial}. ${last}`;
}
