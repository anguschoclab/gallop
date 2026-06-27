import { Bookmark as BookmarkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { useBookmarks, type BookmarkEntityType } from "@/hooks/shared/useBookmarks";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface BookmarkButtonProps {
  type: BookmarkEntityType;
  id: string;
  label: string;
  subtitle?: string;
  size?: "sm" | "md";
  variant?: "icon" | "full";
  className?: string;
}

export function BookmarkButton({
  type,
  id,
  label,
  subtitle,
  size = "sm",
  variant = "icon",
  className,
}: BookmarkButtonProps) {
  const { isBookmarked, toggle } = useBookmarks();
  const active = isBookmarked(type, id);

  if (variant === "full") {
    return (
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          toggle({ type, id, label, subtitle });
        }}
        className={cn(
          "h-7 gap-1.5 text-[10px] uppercase tracking-widest font-mono rounded-none",
          active && "border-gold/50 text-gold",
          className,
        )}
        aria-pressed={active}
        aria-label={active ? "Remove bookmark" : "Add bookmark"}
      >
        <BookmarkIcon className={cn("h-3.5 w-3.5", active && "fill-gold text-gold")} />
        {active ? "Saved" : "Save"}
      </Button>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              toggle({ type, id, label, subtitle });
            }}
            aria-pressed={active}
            aria-label={active ? "Remove bookmark" : "Add bookmark"}
            className={cn(
              "inline-flex items-center justify-center rounded-md border border-white/10 bg-black/30 text-cream/50 hover:text-gold hover:border-gold/40 transition-colors",
              size === "sm" ? "h-7 w-7" : "h-9 w-9",
              active && "text-gold border-gold/50 bg-gold/5",
              className,
            )}
          >
            <BookmarkIcon
              className={cn(size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4", active && "fill-gold")}
            />
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{active ? "Remove bookmark" : "Add bookmark"}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
