/**
 * HorseNameLink — Renders a horse's name as a link to its detail page.
 * Used for consistent navigation affordance whenever a horse name appears in text.
 */
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface HorseNameLinkProps {
  horseId: string;
  name: string;
  className?: string;
  children?: ReactNode;
  onClick?: () => void;
}

export function HorseNameLink({ horseId, name, className, children, onClick }: HorseNameLinkProps) {
  return (
    <Link
      to="/stable/$horseId"
      params={{ horseId }}
      onClick={onClick}
      className={cn("hover:underline hover:text-gold transition-colors", className)}
    >
      {children ?? name}
    </Link>
  );
}
