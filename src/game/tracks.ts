// Track definitions with UUIDs for all racecourses used in graded stakes

export type Track = {
  id: string;
  name: string;
  country: string;
  surfaces: ("Turf" | "Dirt" | "Synthetic")[];
};

// UUID v4 generator helper
const generateUUID = () => {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

// All tracks with their UUIDs
export const TRACKS: Track[] = [
  // Canada
  { id: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d", name: "Woodbine", country: "Canada", surfaces: ["Turf", "Synthetic"] },
  { id: "b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e", name: "Fort Erie", country: "Canada", surfaces: ["Dirt"] },
  { id: "c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f", name: "Century Mile", country: "Canada", surfaces: ["Synthetic"] },
  { id: "d4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f8a", name: "Hastings", country: "Canada", surfaces: ["Dirt"] },

  // UAE
  { id: "e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8a9b", name: "Meydan", country: "UAE", surfaces: ["Turf", "Dirt"] },
  { id: "f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0c", name: "Abu Dhabi", country: "UAE", surfaces: ["Turf"] },
  { id: "a7b8c9d0-e1f2-4a3b-4c5d-6e7f8a9b0c1d", name: "Jebel Ali", country: "UAE", surfaces: ["Dirt"] },

  // Argentina
  { id: "b8c9d0e1-f2a3-4b4c-5d6e-7f8a9b0c1d2e", name: "Hipódromo de San Isidro", country: "Argentina", surfaces: ["Turf", "Dirt"] },
  { id: "c9d0e1f2-a3b4-4c5d-6e7f-8a9b0c1d2e3f", name: "Hipódromo Argentino de Palermo", country: "Argentina", surfaces: ["Dirt"] },
  { id: "d0e1f2a3-b4c5-4d6e-7f8a-9b0c1d2e3f4a", name: "Hipódromo de La Plata", country: "Argentina", surfaces: ["Dirt"] },

  // Brazil
  { id: "e1f2a3b4-c5d6-4e7f-8a9b-0c1d2e3f4a5b", name: "Hipódromo da Gávea", country: "Brazil", surfaces: ["Turf"] },
  { id: "f2a3b4c5-d6e7-4f8a-9b0c-1d2e3f4a5b6c", name: "Hipódromo Cidade Jardim", country: "Brazil", surfaces: ["Turf"] },

  // Chile
  { id: "a3b4c5d6-e7f8-4a9b-0c1d-2e3f4a5b6c7d", name: "Valparaiso Sporting Club", country: "Chile", surfaces: ["Turf"] },
  { id: "b4c5d6e7-f8a9-4b0c-1d2e-3f4a5b6c7d8e", name: "Club Hípico de Santiago", country: "Chile", surfaces: ["Turf"] },
  { id: "c5d6e7f8-a9b0-4c1d-2e3f-4a5b6c7d8e9f", name: "Hipódromo Chile", country: "Chile", surfaces: ["Dirt"] },

  // Scandinavia
  { id: "d6e7f8a9-b0c1-4d2e-3f4a-5b6c7d8e9f0a", name: "Bro Park", country: "Sweden", surfaces: ["Turf"] },
  { id: "e7f8a9b0-c1d2-4e3f-4a5b-6c7d8e9f0a1b", name: "Øvrevoll", country: "Norway", surfaces: ["Turf"] },
  { id: "f8a9b0c1-d2e3-4f4a-5b6c-7d8e9f0a1b2c", name: "Klampenborg", country: "Denmark", surfaces: ["Turf"] },
  { id: "a9b0c1d2-e3f4-4a5b-6c7d-8e9f0a1b2c3d", name: "Jägersro", country: "Sweden", surfaces: ["Turf"] },

  // Japan
  { id: "b0c1d2e3-f4a5-4b6c-7d8e-9f0a1b2c3d4e", name: "Tokyo", country: "Japan", surfaces: ["Turf", "Dirt"] },
  { id: "c1d2e3f4-a5b6-4c7d-8e9f-0a1b2c3d4e5f", name: "Chukyo", country: "Japan", surfaces: ["Turf", "Dirt"] },
  { id: "d2e3f4a5-b6c7-4d8e-9f0a-1b2c3d4e5f6a", name: "Hanshin", country: "Japan", surfaces: ["Turf", "Dirt"] },
  { id: "e3f4a5b6-c7d8-4e9f-0a1b-2c3d4e5f6a7b", name: "Nakayama", country: "Japan", surfaces: ["Turf", "Dirt"] },
  { id: "f4a5b6c7-d8e9-4f0a-1b2c-3d4e5f6a7b8c", name: "Kyoto", country: "Japan", surfaces: ["Turf", "Dirt"] },
  { id: "a5b6c7d8-e9f0-4a1b-2c3d-4e5f6a7b8c9d", name: "Kanazawa", country: "Japan", surfaces: ["Dirt"] },
  { id: "b6c7d8e9-f0a1-4b2c-3d4e-5f6a7b8c9d0e", name: "Monbetsu", country: "Japan", surfaces: ["Dirt"] },
  { id: "c7d8e9f0-a1b2-4c3d-4e5f-6a7b8c9d0e1f", name: "Nagoya", country: "Japan", surfaces: ["Dirt"] },
  { id: "d8e9f0a1-b2c3-4d4e-5f6a-7b8c9d0e1f2a", name: "Sonoda", country: "Japan", surfaces: ["Dirt"] },
  { id: "e9f0a1b2-c3d4-4e5f-6a7b-8c9d0e1f2a3b", name: "Sapporo", country: "Japan", surfaces: ["Turf"] },
  { id: "f0a1b2c3-d4e5-4f6a-7b8c-9d0e1f2a3b4c", name: "Kokura", country: "Japan", surfaces: ["Turf"] },
  { id: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5e", name: "Fukushima", country: "Japan", surfaces: ["Turf"] },
  { id: "b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6f", name: "Niigata", country: "Japan", surfaces: ["Turf"] },
  { id: "c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7a", name: "Hakodate", country: "Japan", surfaces: ["Turf"] },
  { id: "d4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f8b", name: "Kitakyushu", country: "Japan", surfaces: ["Turf"] },

  // Italy
  { id: "e9f0a1b2-c3d4-4e5f-6a7b-8c9d0e1f2a3b", name: "Capannelle", country: "Italy", surfaces: ["Turf"] },
  { id: "f0a1b2c3-d4e5-4f6a-7b8c-9d0e1f2a3b4c", name: "San Siro", country: "Italy", surfaces: ["Turf"] },

  // Hong Kong
  { id: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5e", name: "Sha Tin", country: "Hong Kong", surfaces: ["Turf", "Dirt"] },
  { id: "b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6f", name: "Happy Valley", country: "Hong Kong", surfaces: ["Turf"] },

  // Great Britain
  { id: "c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7g", name: "Newmarket", country: "Great Britain", surfaces: ["Turf"] },
  { id: "d4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f8b", name: "Newmarket (July)", country: "Great Britain", surfaces: ["Turf"] },
  { id: "e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8a9c", name: "Newbury", country: "Great Britain", surfaces: ["Turf"] },
  { id: "f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0d", name: "Epsom", country: "Great Britain", surfaces: ["Turf"] },
  { id: "a7b8c9d0-e1f2-4a3b-4c5d-6e7f8a9b0c1e", name: "Ascot", country: "Great Britain", surfaces: ["Turf"] },
  { id: "b8c9d0e1-f2a3-4b4c-5d6e-7f8a9b0c1d2f", name: "Sandown", country: "Great Britain", surfaces: ["Turf"] },
  { id: "c9d0e1f2-a3b4-4c5d-6e7f-8a9b0c1d2e3g", name: "York", country: "Great Britain", surfaces: ["Turf"] },
  { id: "d0e1f2a3-b4c5-4d6e-7f8a-9b0c1d2e3f4b", name: "Haydock", country: "Great Britain", surfaces: ["Turf"] },
  { id: "e1f2a3b4-c5d6-4e7f-8a9b-0c1d2e3f4a5c", name: "Chester", country: "Great Britain", surfaces: ["Turf"] },
  { id: "f2a3b4c5-d6e7-4f8a-9b0c-1d2e3f4a5b6d", name: "Doncaster", country: "Great Britain", surfaces: ["Turf"] },
  { id: "a3b4c5d6-e7f8-4a9b-0c1d-2e3f4a5b6c7e", name: "Goodwood", country: "Great Britain", surfaces: ["Turf"] },

  // France
  { id: "b4c5d6e7-f8a9-4b0c-1d2e-3f4a5b6c7d8f", name: "Saint-Cloud", country: "France", surfaces: ["Turf"] },
  { id: "c5d6e7f8-a9b0-4c1d-2e3f-4a5b6c7d8e9g", name: "Longchamp", country: "France", surfaces: ["Turf"] },
  { id: "d6e7f8a9-b0c1-4d2e-3f4a-5b6c7d8e9f0b", name: "Deauville", country: "France", surfaces: ["Turf"] },
  { id: "e7f8a9b0-c1d2-4e3f-4a5b-6c7d8e9f0a1c", name: "Chantilly", country: "France", surfaces: ["Turf"] },
  { id: "f8a9b0c1-d2e3-4f4a-5b6c-7d8e9f0a1b2d", name: "Vichy", country: "France", surfaces: ["Turf"] },
  { id: "a9b0c1d2-e3f4-4a5b-6c7d-8e9f0a1b2c3e", name: "Toulouse", country: "France", surfaces: ["Turf"] },

  // Ireland
  { id: "b0c1d2e3-f4a5-4b6c-7d8e-9f0a1b2c3d4f", name: "Curragh", country: "Ireland", surfaces: ["Turf"] },
  { id: "c1d2e3f4-a5b6-4c7d-8e9f-0a1b2c3d4e5g", name: "Leopardstown", country: "Ireland", surfaces: ["Turf"] },
  { id: "d2e3f4a5-b6c7-4d8e-9f0a-1b2c3d4e5f6b", name: "Navan", country: "Ireland", surfaces: ["Turf"] },
  { id: "e3f4a5b6-c7d8-4e9f-0a1b-2c3d4e5f6a7c", name: "Naas", country: "Ireland", surfaces: ["Turf"] },
  { id: "f4a5b6c7-d8e9-4f0a-1b2c-3d4e5f6a7b8d", name: "Cork", country: "Ireland", surfaces: ["Turf"] },
  { id: "a5b6c7d8-e9f0-4a1b-2c3d-4e5f6a7b8c9e", name: "Gowran Park", country: "Ireland", surfaces: ["Turf"] },
  { id: "b6c7d8e9-f0a1-4b2c-3d4e-5f6a7b8c9d0f", name: "Fairyhouse", country: "Ireland", surfaces: ["Turf"] },
  { id: "c7d8e9f0-a1b2-4c3d-4e5f-6a7b8c9d0e1g", name: "Dundalk", country: "Ireland", surfaces: ["Synthetic"] },

  // Germany
  { id: "d8e9f0a1-b2c3-4d4e-5f6a-7b8c9d0e1f2b", name: "Düsseldorf", country: "Germany", surfaces: ["Turf"] },
  { id: "e9f0a1b2-c3d4-4e5f-6a7b-8c9d0e1f2a3c", name: "Cologne", country: "Germany", surfaces: ["Turf"] },
  { id: "f0a1b2c3-d4e5-4f6a-7b8c-9d0e1f2a3b4d", name: "Baden-Baden", country: "Germany", surfaces: ["Turf"] },
  { id: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5f", name: "Hanover", country: "Germany", surfaces: ["Turf"] },
  { id: "b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6g", name: "Krefeld", country: "Germany", surfaces: ["Turf"] },
  { id: "c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7h", name: "Hamburg", country: "Germany", surfaces: ["Turf"] },
  { id: "c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7h", name: "Hamburg", country: "Germany", surfaces: ["Turf"] },
  { id: "d4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f8c", name: "Munich", country: "Germany", surfaces: ["Turf"] },
  { id: "e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8a9d", name: "Hoppegarten", country: "Germany", surfaces: ["Turf"] },
  { id: "f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0e", name: "Dortmund", country: "Germany", surfaces: ["Turf"] },

  // Turkey
  { id: "a7b8c9d0-e1f2-4a3b-4c5d-6e7f8a9b0c1f", name: "Veliefendi", country: "Turkey", surfaces: ["Turf", "Synthetic"] },

  // Austria
  { id: "b8c9d0e1-f2a3-4b4c-5d6e-7f8a9b0c1d2g", name: "Vienna", country: "Austria", surfaces: ["Turf"] },
  { id: "c9d0e1f2-a3b4-4c5d-6e7f-8a9b0c1d2e3h", name: "Klagenfurt", country: "Austria", surfaces: ["Turf"] },
  { id: "d0e1f2a3-b4c5-4d6e-7f8a-9b0c1d2e3f4c", name: "Ebreichsdorf", country: "Austria", surfaces: ["Turf"] },
  { id: "e1f2a3b4-c5d6-4e7f-8a9b-0c1d2e3f4a5d", name: "Freudenau", country: "Austria", surfaces: ["Turf"] },

  // Belgium
  { id: "f2a3b4c5-d6e7-4f8a-9b0c-1d2e3f4a5b6e", name: "Ostend", country: "Belgium", surfaces: ["Turf"] },
  { id: "a3b4c5d6-e7f8-4a9b-0c1d-2e3f4a5b6c7f", name: "Mons", country: "Belgium", surfaces: ["Synthetic"] },

  // Czech Republic
  { id: "b4c5d6e7-f8a9-4b0c-1d2e-3f4a5b6c7d8g", name: "Prague", country: "Czech Republic", surfaces: ["Turf"] },
  { id: "c5d6e7f8-a9b0-4c1d-2e3f-4a5b6c7d8e9h", name: "Most", country: "Czech Republic", surfaces: ["Turf"] },
  { id: "d6e7f8a9-b0c1-4d2e-3f4a-5b6c7d8e9f0c", name: "Karlovy Vary", country: "Czech Republic", surfaces: ["Turf"] },
  { id: "e7f8a9b0-c1d2-4e3f-4a5b-6c7d8e9f0a1e", name: "Prague", country: "Czech Republic", surfaces: ["Turf"] },

  // Hungary
  { id: "e7f8a9b0-c1d2-4e3f-4a5b-6c7d8e9f0a1d", name: "Kincsem Park", country: "Hungary", surfaces: ["Turf"] },

  // Spain
  { id: "f8a9b0c1-d2e3-4f4a-5b6c-7d8e9f0a1b2e", name: "Madrid", country: "Spain", surfaces: ["Turf"] },
  { id: "a9b0c1d2-e3f4-4a5b-6c7d-8e9f0a1b2c3f", name: "San Sebastián", country: "Spain", surfaces: ["Turf"] },
  { id: "b0c1d2e3-f4a5-4b6c-7d8e-9f0a1b2c3d4g", name: "Dos Hermanas", country: "Spain", surfaces: ["Turf"] },
  { id: "c1d2e3f4-a5b6-4c7d-8e9f-0a1b2c3d4e5h", name: "Dos Hermanas", country: "Spain", surfaces: ["Turf"] },
];

// Lookup maps
export const TRACK_BY_NAME: Record<string, Track> = Object.fromEntries(
  TRACKS.map((t) => [t.name, t])
);

export const TRACK_BY_ID: Record<string, Track> = Object.fromEntries(
  TRACKS.map((t) => [t.id, t])
);

// Helper functions
export function getTrackByName(name: string): Track | undefined {
  return TRACK_BY_NAME[name];
}

export function getTrackById(id: string): Track | undefined {
  return TRACK_BY_ID[id];
}

export function getCountryByTrackName(name: string): string {
  const track = getTrackByName(name);
  return track?.country || "Other";
}

// Re-export for backward compatibility
export { generateUUID as generateTrackUUID };
