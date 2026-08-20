import type { RegionalAward, AwardRegion, RegionalAwardCategory } from "./types";
import { CATEGORY_DISPLAY_NAMES } from "./types";
import type { InboxMessage } from "@/core/inbox/inboxTypes";

const REGION_DISPLAY_NAMES: Record<AwardRegion, string> = {
  north_america: "North America",
  europe: "Europe",
  asia_pacific: "Asia-Pacific",
  south_america: "South America",
};

function formatCategory(category: RegionalAwardCategory): string {
  return CATEGORY_DISPLAY_NAMES[category] ?? category.replace(/_/g, " ");
}

export function generateAwardInboxMessage(
  award: RegionalAward,
  currentDay: number,
): Omit<InboxMessage, "id" | "readAt"> {
  const isPlayerHorse = !award.stableId;
  const isHoty = award.category === "horse_of_the_year";
  const categoryLabel = formatCategory(award.category);
  const regionLabel = REGION_DISPLAY_NAMES[award.region];

  const priority = !isPlayerHorse ? "info" : isHoty ? "urgent" : "action";

  const title = isHoty
    ? `${award.horseName} wins ${regionLabel} Horse of the Year!`
    : `${award.horseName} wins ${categoryLabel} — ${regionLabel}`;

  const body = isPlayerHorse
    ? `Your horse ${award.horseName} has been named ${categoryLabel} for ${regionLabel} (Year ${award.year}). View the full award history and all past winners.`
    : `${award.horseName} (${award.stableId}) has been named ${categoryLabel} for ${regionLabel} (Year ${award.year}).`;

  return {
    day: currentDay,
    category: "hall_of_fame",
    priority,
    title,
    body,
    cta: {
      label: `View ${categoryLabel}`,
      route: "awards.$category",
      params: { category: award.category },
    },
  };
}
