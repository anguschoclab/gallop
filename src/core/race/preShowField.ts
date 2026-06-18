/**
 * preShowField — order a race field as a betting card for the pre-race build-up.
 *
 * Sorts by morning-line favourite first (lowest numeric odds) and flags the
 * single favourite. Falls back to input order if no odds are available.
 */

export interface PreShowRunner {
  horseId: string;
  name: string;
  silk: string;
  owned: boolean;
}

export interface PreShowFieldRow extends PreShowRunner {
  oddsLabel: string;
  oddsValue: number;
  isFavourite: boolean;
}

/**
 * Parse a formatted morning-line label like "5-1" or "2-1" into a numeric value.
 * Returns Infinity when the label is missing/unparseable so those rows sort last.
 *
 * @param label - formatted odds label (e.g. "5-1"), or undefined
 * @returns numeric odds value, or Infinity when missing/unparseable
 */
function parseOdds(label: string | undefined): number {
  if (!label) return Infinity;
  const m = label.match(/^([\d.]+)/);
  if (!m) return Infinity;
  const n = parseFloat(m[1]);
  return Number.isFinite(n) ? n : Infinity;
}

/**
 * Build a betting-card-ordered field, annotating each runner with its
 * formatted odds label and flagging the morning-line favourite.
 *
 * @param runners - the race field
 * @param runnerOdds - per-horse formatted odds (e.g. "5-1"); may be empty/partial
 */
export function buildPreShowField(
  runners: PreShowRunner[],
  runnerOdds: Map<string, string> | Record<string, string>,
): PreShowFieldRow[] {
  const get = (id: string): string | undefined =>
    runnerOdds instanceof Map ? runnerOdds.get(id) : runnerOdds[id];

  const rows: PreShowFieldRow[] = runners.map((r) => {
    const label = get(r.horseId);
    return {
      ...r,
      oddsLabel: label ?? "—",
      oddsValue: parseOdds(label),
      isFavourite: false,
    };
  });

  const hasOdds = rows.some((r) => Number.isFinite(r.oddsValue));
  if (hasOdds) {
    rows.sort((a, b) => a.oddsValue - b.oddsValue);
    rows[0].isFavourite = true;
  }
  return rows;
}
