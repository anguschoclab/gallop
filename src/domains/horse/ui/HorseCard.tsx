import type { Horse } from "@/platform/game/types";
import { useHorseCard } from "@/domains/horse/application/hooks/useHorseCard";
import { HorseCardCompact } from "@/domains/horse/ui/HorseCardCompact";
import { HorseCardScout } from "@/domains/horse/ui/HorseCardScout";
import { HorseCardFull } from "@/domains/horse/ui/HorseCardFull";

/**
 * Properties for the HorseCard component.
 */
interface HorseCardProps {
  /** The horse object containing all statistics and metadata. */
  horse: Horse;
  /** Visual variant: 'full' for detailed profile, 'compact' for lists, 'scout' for market listings. */
  variant?: "full" | "compact" | "scout";
  /** Whether to overlay scouting intelligence and unlocked stats. */
  showScoutInfo?: boolean;
  /** Optional click handler for interaction. */
  onClick?: () => void;
  /** Additional CSS classes for styling. */
  className?: string;
}

/**
 * A versatile card component for displaying horse information across various UI contexts.
 * Supports multiple variants ranging from compact list items to full diagnostic profiles.
 *
 * @param {HorseCardProps} props - The component properties.
 * @returns {JSX.Element} The rendered horse card.
 */
export function HorseCard({
  horse,
  variant = "full",
  showScoutInfo = false,
  onClick,
  className = "",
}: HorseCardProps) {
  const hookData = useHorseCard(horse, showScoutInfo);

  if (variant === "compact") {
    return (
      <HorseCardCompact horse={horse} hookData={hookData} onClick={onClick} className={className} />
    );
  }

  if (variant === "scout") {
    return <HorseCardScout horse={horse} hookData={hookData} className={className} />;
  }

  return (
    <HorseCardFull horse={horse} hookData={hookData} onClick={onClick} className={className} />
  );
}
