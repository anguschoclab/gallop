import type { ReactNode } from "react";
import type { Stable } from "@/core/stable/types";
import { StableCard } from "./StableCard";

const DEFAULT_SECTION_CLASS = "mb-8";
const HEADING_CLASS =
  "text-xl font-semibold mb-3 flex items-center gap-2 font-[family-name:var(--font-display)]";
const GRID_CLASS = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4";

interface StableListProps {
  title: string;
  icon: ReactNode;
  stables: Stable[];
  className?: string;
}

export function StableList({ title, icon, stables, className }: StableListProps) {
  if (stables.length === 0) return null;

  return (
    <div className={className ?? DEFAULT_SECTION_CLASS}>
      <h2 className={HEADING_CLASS}>
        {icon}
        {title}
      </h2>
      <div className={GRID_CLASS}>
        {stables.map((stable) => (
          <StableCard key={stable.id} stable={stable} />
        ))}
      </div>
    </div>
  );
}
