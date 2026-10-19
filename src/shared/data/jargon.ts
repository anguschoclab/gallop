export const JARGON_DEFINITIONS: Record<string, string> = {
  // Performance metrics
  Beyer: "A speed figure (0–~120) standardising performance across distances and tracks.",
  OVR: "Overall Rating: a weighted average of a horse's primary physical stats.",
  Pot: "Potential: the theoretical maximum stats a horse can reach through training.",
  Potential: "The theoretical maximum OVR a horse can reach through training and development.",
  Form: "Recent performance trend based on last 3–5 starts — positive is good.",

  // Race classifications
  "Graded race": "Top-tier race classification (G1 > G2 > G3 > Listed).",
  G1: "Grade 1 — the highest tier of graded race; the most prestigious events in the sport.",
  G2: "Grade 2 — elite race, one tier below G1.",
  G3: "Grade 3 — top-level graded race, one tier below G2.",
  Listed: "Race one tier below G3; recognised as high quality but not officially graded.",
  Stakes: "High-quality race with an entry fee that contributes to the purse.",
  Maiden: "Race restricted to horses that have never won a race.",
  Allowance:
    "Race restricted to horses meeting eligibility conditions; higher quality than claiming.",
  Claiming: "Race where any horse may be purchased (claimed) for a set price.",
  "Optional Claiming":
    "Horses may be entered for a claiming price or as straight allowance entries.",
  Handicap: "Race where horses carry different weights to equalise winning chances.",

  // Distances
  Furlong: "A unit of distance equal to 1/8 mile (approx. 201 metres).",
  Sprint: "Race under 1400m — favours fast, early-speed horses.",
  Classic: "Race between 1400m and 2000m — balanced speed and stamina.",
  Stayer: "Race over 2000m — favours horses with exceptional stamina.",

  // Surfaces & conditions
  Surface: "The track material (Turf, Dirt, or Synthetic), which affects pace and running style.",
  Turf: "Natural grass racing surface; rewards horses with smooth, efficient action.",
  Dirt: "Compacted dirt surface common in North American racing; favours speed and power.",
  Synthetic:
    "Artificial all-weather surface (e.g. Polytrack, Tapeta); more consistent than turf or dirt.",
  "Track condition": "The moisture level and firmness of the racing surface.",

  // Odds & markets
  "Morning Line": "Oddsmaker's pre-race probability estimate, expressed as fractional odds.",
  ML: "Morning Line — the oddsmaker's pre-race probability estimate.",
  Purse: "Total prize money distributed to placed finishers in a race.",

  // Breeding & pedigree
  Dosage: "Pedigree-derived genetic profile across speed and stamina aptitudes.",
  Broodmare: "A female horse used specifically for breeding foals.",
  Dam: "The mother of a horse.",
  Sire: "The father of a horse.",
  Foal: "A horse under one year old.",
  "Blue hen": "An exceptional broodmare proven to throw multiple stakes winners.",
  Silk: "The owner's unique racing colours worn by the jockey.",
  Nicking: "The specific compatibility score between a sire's and dam's bloodlines.",
  Bloodline:
    "The sire-line pedigree traced to 6 generations to identify founder ancestors (e.g., Northern Dancer, Mr. Prospector).",
  Inbreeding:
    "The measure of shared ancestors in a horse's pedigree, calculated to 8 generations with weighted contribution (near generations have stronger impact).",
  "Dosage Index":
    "A pedigree-derived number describing inherited speed-vs-stamina balance. Higher = bred more for speed/short distances; lower = bred for stamina/long distances.",
  "Founder Effect":
    "Loss of genetic variation when a line traces back to few unique ancestors. Strong founder effect means low diversity.",
  "Bruce Lowe Family":
    "A numbered classification of a horse's tail-female (bottom) line. Some families are historically associated with top runners, others with influential sires.",
  "Mud Aptitude":
    "How well a horse handles off (wet/soft) going. Above 1.0 = relishes the mud; below 1.0 = prefers firm ground.",
  "Weather Preference": "The going a horse is bred to prefer: dry, wet, or all-conditions.",
  "Heart Score":
    "A proxy for cardiovascular capacity and will to win. Higher means more late-race grit.",
  "Foaling Ease":
    "How safely a mare tends to deliver. Higher is easier and lower-risk for mare and foal.",
  Trainability:
    "How quickly a horse responds to training. Higher means faster improvement per session.",
  "Peak Age": "The age (3–7) at which a horse is expected to reach its physical prime.",
  Stud: "A retired male horse (stallion) available for breeding.",

  // Track conditions (dynamic weather)
  fast: "Dry, firm dirt — quickest possible times.",
  good: "Slightly less than ideal — a touch of give in the surface.",
  soft: "Wet turf with noticeable give underfoot — slower, harder on stamina.",
  yielding: "Wetter than soft turf — labour-intensive surface.",
  heavy: "Saturated turf — exhausting; favours mudders.",
  sloppy: "Standing water on dirt — splash-and-dash; speed bias intact but tiring.",
  muddy: "Dirt soaked through with no standing water — heavy and tiring.",

  // Weather sim patterns
  clear: "Sunny, no precipitation — ideal racing weather.",
  overcast: "Cloud cover, dry — minimal track impact.",
  shower: "Brief light rain — track condition softens by one tier.",
  rain: "Sustained rainfall — turf yields, dirt turns muddy.",
  storm: "Heavy rain and wind — surface degrades sharply; expect a downgrade.",

  // Facility tiers
  Tier: "Infrastructure performance tier (01–04). Higher tiers unlock greater training bonuses but cost more to maintain and upgrade.",
  "Regimens Unlocked":
    "Training regimens enabled by this facility at its current tier. Upgrade to unlock additional workout types.",
  Commission:
    "Commission an infrastructure upgrade to the next performance tier, increasing effectiveness and unlocking new capabilities.",
};
