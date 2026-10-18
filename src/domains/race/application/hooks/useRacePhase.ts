import { useNavigate, useSearch } from "@tanstack/react-router";
import { useCallback } from "react";
import { toast } from "sonner";

type GenericNavigateFn = (opts: {
  search?: Record<string, unknown> | ((prev: Record<string, unknown>) => Record<string, unknown>);
  replace?: boolean;
}) => void;

export type RacePhase = "preshow" | "live" | "review";

const PHASES: readonly RacePhase[] = ["preshow", "live", "review"];

function coerce(value: unknown, fallback: RacePhase): RacePhase {
  return PHASES.includes(value as RacePhase) ? (value as RacePhase) : fallback;
}

/**
 * useRacePhase — URL-persisted three-act phase state for /race/$raceId.
 *
 * Reads `?phase=preshow|live|review` from the route search; falls back to
 * `review` for resolved races and `preshow` otherwise. Writes use
 * `replace: true` so phase transitions don't pollute browser history.
 */
export function useRacePhase(resolved: boolean): {
  phase: RacePhase;
  setPhase: (next: RacePhase) => void;
} {
  // strict:false because this hook is also exercised in tests outside a typed
  // route context; the route declares `phase` in its validateSearch schema.
  const search = useSearch({ strict: false }) as { phase?: string };
  const navigate = useNavigate() as unknown as GenericNavigateFn;

  const fallback: RacePhase = resolved ? "review" : "preshow";
  const phase = coerce(search?.phase, fallback);

  const setPhase = useCallback(
    (next: RacePhase) => {
      navigate({
        search: (prev: Record<string, unknown>): Record<string, unknown> => ({
          ...prev,
          phase: next,
        }),
        replace: true,
      });

      if (next === "live") {
        toast.info("Race is live");
      } else if (next === "review") {
        toast.info("Results available");
      }
    },
    [navigate],
  );

  return { phase, setPhase };
}
