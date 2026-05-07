import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { BACKSTORIES } from "@/core/newGame/backstories";
import type { BackstoryId } from "@/game/types";

interface StepBackstoryProps {
  backstoryId: BackstoryId;
  onChange: (backstoryId: BackstoryId) => void;
  onNext: () => void;
  onBack: () => void;
}

export function StepBackstory({ backstoryId, onChange, onNext, onBack }: StepBackstoryProps) {
  const handleNext = () => {
    onNext();
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "easy":
        return "text-green-400";
      case "standard":
        return "text-yellow-400";
      case "hard":
        return "text-orange-400";
      case "very_hard":
        return "text-red-400";
      default:
        return "text-cream-muted";
    }
  };

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case "easy":
        return "Easy";
      case "standard":
        return "Standard";
      case "hard":
        return "Hard";
      case "very_hard":
        return "Very Hard";
      default:
        return difficulty;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gold font-[family-name:var(--font-display)] mb-2">
          Choose Your Backstory
        </h2>
        <p className="text-cream-muted">
          Your starting resources and difficulty depend on your background.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {BACKSTORIES.map((backstory) => (
          <TooltipProvider key={backstory.id}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Card
                  className={`cursor-pointer transition-all hover:border-gold ${
                    backstoryId === backstory.id ? "border-gold bg-gold/10" : "border-gold-muted"
                  }`}
                  onClick={() => onChange(backstory.id)}
                >
                  <CardHeader>
                    <CardTitle className="text-gold">{backstory.label}</CardTitle>
                    <CardDescription className={getDifficultyColor(backstory.difficulty)}>
                      {getDifficultyLabel(backstory.difficulty)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-cream mb-4">{backstory.blurb}</p>
                    <div className="space-y-2 text-xs text-cream-muted">
                      <div className="flex justify-between">
                        <span>Starting Cash:</span>
                        <span className="text-cream">
                          ${backstory.startingCash.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Horses:</span>
                        <span className="text-cream">
                          {backstory.horses.map((h) => `${h.count} ${h.tier}`).join(", ")}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Facilities:</span>
                        <span className="text-cream">
                          {Object.keys(backstory.facilities).length || "None"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Reputation:</span>
                        <span className="text-cream">{backstory.reputation}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent>
                <p className="capitalize">{backstory.difficulty.replace("_", " ")} difficulty</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={handleNext}>Next</Button>
      </div>
    </div>
  );
}
