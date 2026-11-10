/**
 * TheaterFinished.tsx - Pre-commit completion view for the auction theater
 */

import { Sparkles } from "lucide-react";
import { Button } from "@/shared/ui/button";

interface TheaterFinishedProps {
  onCommit: () => void;
}

export function TheaterFinished({ onCommit }: TheaterFinishedProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[600px] gap-8 p-12">
      <div className="text-center space-y-2">
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-primary/20">
          <Sparkles className="h-10 w-10 text-primary animate-pulse" />
        </div>
        <h2 className="text-4xl font-black tracking-tight">Auction Finished</h2>
        <p className="text-muted-foreground text-lg">All lots have been hammered down.</p>
      </div>
      <Button
        size="lg"
        className="h-20 px-12 text-2xl font-black rounded-2xl shadow-2xl animate-bounce"
        onClick={onCommit}
      >
        View Results Summary
      </Button>
    </div>
  );
}
