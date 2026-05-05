import { cn } from "@/lib/utils";
import type { JockeySilk } from "@/game/types";

interface SilkPreviewProps {
  silk: JockeySilk;
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * Silk Preview - Shows a simplified preview of jockey silks
 * Displays a colored circle with the primary color and pattern name below
 * This is a simplified version for the wizard; full pattern rendering can be added later
 */
export function SilkPreview({ silk, size = "md", className }: SilkPreviewProps) {
  const sizeClasses = {
    sm: "w-12 h-12 text-xs",
    md: "w-16 h-16 text-sm",
    lg: "w-20 h-20 text-base",
  };

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <div
        className={cn(
          "rounded-full border-2 border-white/40 shadow-lg",
          sizeClasses[size],
        )}
        style={{ backgroundColor: silk.primary }}
      />
      <span className="text-xs text-cream-muted capitalize">{silk.pattern}</span>
    </div>
  );
}
