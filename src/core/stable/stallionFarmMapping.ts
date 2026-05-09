/**
 * Stallion Farm Mapping
 * 
 * Maps real-world stud farm names (found in pedigree data) to in-game NPC stables.
 * This ensures famous stallions are associated with the correct operation when
 * they appear in the game world.
 * 
 * NOTE: Entries must be kept in sync with ELITE_POOL and MID_POOL in stablePoolData.ts.
 */
export const STALLION_FARM_MAPPING: Record<string, string> = {
  Coolmore: "Coolmore Stud",
  Godolphin: "Godolphin",
  Juddmonte: "Juddmonte Farms",
  Spendthrift: "Spendthrift Farm",
  "Spendthrift Farm": "Spendthrift Farm",
  Darley: "Godolphin",
  "Darley Jonabell Farm": "Godolphin",
  "Coolmore Ashford": "Ashford Stud",
  "Ashford Stud": "Ashford Stud",
  "Coolmore Ireland": "Coolmore Stud",
  Arrowfield: "Arrowfield Stud",
  "Arrowfield Stud": "Arrowfield Stud",
  Shadai: "Shadai Stallion Station",
  "Shadai Stallion Station": "Shadai Stallion Station",
  "Yulong Investments": "Yulong Investments",
  "Newgate Farm": "Newgate Farm",
  "Gainesway Farm": "Gainesway Farm",
  "Three Chimneys Farm": "Three Chimneys Farm",
  "Hill 'n' Dale Farms": "Hill 'n' Dale Farms",
  "Lane's End": "Lane's End",
  Claiborne: "Claiborne Farm",
  "Claiborne Farm": "Claiborne Farm",
  Airdrie: "Airdrie Stud",
  "Airdrie Stud": "Airdrie Stud",
  "Stone Farm": "Stone Farm",
  Vinery: "Vinery",
  "Yarraman Park": "Yarraman Park",
  "Haras La Quebrada": "Haras La Quebrada",
  "Haras Vacacion": "Haras Vacacion",
  "Northern Farm": "Northern Farm",
  "Bizenn Ranch": "Bizenn Ranch",
  "Newsells Park Stud": "Newsells Park Stud",
  "Banstead Manor Stud": "Banstead Manor Stud",
  "Cheveley Park Stud": "Cheveley Park Stud",
  "Aga Khan Studs": "Coolmore Stud",
  "Widden Stud": "Arrowfield Stud",
  "Darley Australia": "Godolphin",
  // New stud farm mappings
  "Haras du Logis": "Haras du Logis",
  "Taylor Made Farm": "Taylor Made Farm",
  "Calumet Farm": "Calumet Farm",
  "Ramsey Farm": "Ramsey Farm",
  "Summerhill Stud": "Summerhill Stud",
  "Hong Kong Jockey Club": "Hong Kong Jockey Club",
  "Allevamento di Besnate": "Allevamento di Besnate",
  "Gestut Isarland": "Gestut Isarland",
  // Additional mappings for common farm name variations
  "Coolmore Stud": "Coolmore Stud",
  "Coolmore America": "Ashford Stud",
  "Coolmore Australia": "Coolmore Stud",
};
