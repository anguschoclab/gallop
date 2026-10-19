/**
 * budgetStablePool.ts - Budget stable pool data
 *
 * Extracted from stablePoolData.ts for modularity.
 */

import type { StablePoolEntry } from "@/domains/stable/simulation/stablePoolData";

export const BUDGET_POOL: StablePoolEntry[] = [
  {
    name: "Green Hills Racing",
    ownerName: "Tom O'Brien",
    isMajor: true,
    colors: { primary: "#2e8b57", secondary: "#f5f5dc" },
    description: "Up-and-coming regional stable building a reputation with smart claiming.",
    country: "USA",
    outposts: [],
  },
  {
    name: "Coastal Thoroughbreds",
    ownerName: "Sarah Martinez",
    isMajor: true,
    colors: { primary: "#4682b4", secondary: "#ffffff" },
    description:
      "California-based operation focused on claiming races and developing young talent.",
    country: "USA",
    outposts: [],
  },
  {
    name: "Highland Downs Farm",
    ownerName: "Angus MacLeod",
    isMajor: true,
    colors: { primary: "#556b2f", secondary: "#8b4513" },
    description: "Scottish operation punching above their weight in regional stakes.",
    country: "Scotland",
    outposts: [],
  },
  {
    name: "Sunrise Racing Club",
    ownerName: "Kenji Tanaka",
    isMajor: true,
    colors: { primary: "#ff6347", secondary: "#ffd700" },
    description: "Japanese partnership club with dreams of producing a Derby contender.",
    country: "Japan",
    outposts: [],
  },
  {
    name: "Outback Bloodstock",
    ownerName: "Bruce Wilson",
    isMajor: true,
    colors: { primary: "#8b4513", secondary: "#daa520" },
    description: "Australian syndicate focused on buying tried horses for local cups.",
    country: "Australia",
    outposts: [],
  },
  {
    name: "Bluegrass Dreams",
    ownerName: "Jenny Williams",
    isMajor: true,
    colors: { primary: "#1e90ff", secondary: "#ffffff" },
    description: "Kentucky startup building from the ground up with yearling purchases.",
    country: "USA",
    outposts: [],
  },
  {
    name: "Hawkesbury Stables",
    ownerName: "Mike Thompson",
    isMajor: true,
    colors: { primary: "#006400", secondary: "#f0e68c" },
    description: "Regional Australian trainer taking on the metropolitan stables.",
    country: "Australia",
    outposts: [],
  },
  {
    name: "Flemington Lane",
    ownerName: "Emma Richardson",
    isMajor: true,
    colors: { primary: "#ff1493", secondary: "#ffffff" },
    description: "Melbourne-based syndicate targeting metropolitan midweek races.",
    country: "Australia",
    outposts: [],
  },
  {
    name: "Turfside Racing",
    ownerName: "Carlos Mendez",
    isMajor: true,
    colors: { primary: "#2f4f4f", secondary: "#ffd700" },
    description: "Spanish operation racing primarily in France and Iberian Peninsula.",
    country: "Spain",
    outposts: [],
  },
  {
    name: "Meadowbrook Farm",
    ownerName: "Lisa Chen",
    isMajor: true,
    colors: { primary: "#9370db", secondary: "#ffffff" },
    description: "New York regional stable developing homebreds and claimers.",
    country: "USA",
    outposts: [],
  },
];
