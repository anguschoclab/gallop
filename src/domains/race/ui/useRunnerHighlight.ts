import { useState } from "react";

interface RunnerLike {
  horseId: string;
  owned: boolean;
}

export function useRunnerHighlight<T extends RunnerLike>(runners: T[]) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [pinned, setPinned] = useState<Set<string>>(() => {
    const init = new Set<string>();
    runners.forEach((r) => {
      if (r.owned) init.add(r.horseId);
    });
    return init;
  });

  const togglePin = (horseId: string) => {
    setPinned((prev) => {
      const next = new Set(prev);
      if (next.has(horseId)) next.delete(horseId);
      else next.add(horseId);
      return next;
    });
  };

  const isHighlighted = (horseId: string) => pinned.has(horseId) || hovered === horseId;
  const anyHighlight = pinned.size > 0 || hovered !== null;

  return { hovered, setHovered, pinned, togglePin, isHighlighted, anyHighlight };
}
