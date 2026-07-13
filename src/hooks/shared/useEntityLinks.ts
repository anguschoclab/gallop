import { useMemo } from "react";
import { useGame } from "@/game/store";
import type { EntityLink } from "@/services/narrative/newsTypes";
import type { Jockey } from "@/core/jockey/types";

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Stable reference for the optional `jockeys` slice. Returning an inline `?? []`
// from the selector mints a new array each render, which makes Zustand's
// useSyncExternalStore snapshot never compare equal and triggers an infinite
// re-render loop. (`horses`/`npcStables` are non-optional, so they stay stable.)
const EMPTY_JOCKEYS: Jockey[] = [];

export function useEntityLinks(text: string, explicitLinks?: EntityLink[], autoDetect = true) {
  const horses = useGame((s) => s.horses);
  const jockeys = useGame((s) => s.jockeys ?? EMPTY_JOCKEYS);
  const npcStables = useGame((s) => s.npcStables);

  return useMemo(() => {
    const combined: EntityLink[] = [...(explicitLinks || [])];

    if (autoDetect) {
      Object.values(horses).forEach((h) => {
        const regex = new RegExp(`\\b${escapeRegExp(h.name)}\\b`, "g");
        if (regex.test(text) && !combined.some((l) => l.name === h.name)) {
          combined.push({ type: "horse", id: h.id, name: h.name });
        }
      });

      jockeys.forEach((j) => {
        const regex = new RegExp(`\\b${escapeRegExp(j.name)}\\b`, "g");
        if (regex.test(text) && !combined.some((l) => l.name === j.name)) {
          combined.push({ type: "jockey", id: j.id, name: j.name });
        }
      });

      npcStables.forEach((s) => {
        const regex = new RegExp(`\\b${escapeRegExp(s.name)}\\b`, "g");
        if (regex.test(text) && !combined.some((l) => l.name === s.name)) {
          combined.push({ type: "stable", id: s.id, name: s.name });
        }
      });
    }

    return combined.sort((a, b) => b.name.length - a.name.length);
  }, [text, explicitLinks, autoDetect, horses, jockeys, npcStables]);
}
