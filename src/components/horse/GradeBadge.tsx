import { Badge } from "@/components/ui/badge";
import { gradeColor } from "@/core/common/uiTokens";
import { cn } from "@/lib/cn";

interface GradeBadgeProps {
  grade: string;
  variant?: "default" | "outline";
  className?: string;
}

export function GradeBadge({ grade, variant = "outline", className }: GradeBadgeProps) {
  return (
    <Badge variant={variant} className={cn(gradeColor(grade), className)}>
      {grade}
    </Badge>
  );
}
