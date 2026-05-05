import { cn } from "@/lib/utils";

interface PaddleCardProps {
  stableName: string;
  paddleNumber: number;
  isPlayer?: boolean;
  isActive?: boolean;
  isLeading?: boolean;
  colors?: { primary: string; secondary: string };
}

export function PaddleCard({
  stableName,
  paddleNumber,
  isPlayer = false,
  isActive = false,
  isLeading = false,
  colors,
}: PaddleCardProps) {
  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center p-2 rounded-lg border-2 transition-all duration-300",
        isPlayer ? "bg-emerald-100 border-emerald-500" : colors ? "bg-muted" : "bg-muted",
        isActive &&
          (isPlayer
            ? "ring-2 ring-emerald-400 ring-offset-2"
            : "ring-2 ring-primary ring-offset-2"),
        isLeading && "scale-110 shadow-lg",
      )}
      style={
        !isPlayer && colors
          ? {
              backgroundColor: `${colors.primary}20`,
              borderColor: colors.primary,
            }
          : undefined
      }
    >
      {isLeading && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-pulse" />
      )}
      <div
        className={cn(
          "w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md",
          isPlayer ? "bg-emerald-600" : colors ? "bg-muted-foreground" : "bg-muted-foreground",
        )}
        style={!isPlayer && colors ? { backgroundColor: colors.primary } : undefined}
      >
        {isPlayer ? "YOU" : paddleNumber}
      </div>
      <p
        className={cn(
          "text-xs font-medium mt-1 text-center max-w-[80px] truncate",
          isPlayer ? "text-emerald-700" : "text-cream",
        )}
      >
        {isPlayer ? "You" : stableName}
      </p>
    </div>
  );
}
