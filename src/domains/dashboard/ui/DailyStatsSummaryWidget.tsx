/**
 * DailyStatsSummaryWidget.tsx - Dashboard table of every player horse's
 * rating, form, energy and price with the change since yesterday or over the
 * last 7 days, so progress is visible without opening each horse.
 */
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { PillToggleGroup } from "@/shared/ui/common/PillToggleGroup";
import { cn } from "@/shared/lib/cn";
import {
  useDailyStatsSummary,
  type DailySummarySort,
} from "@/domains/dashboard/application/hooks/useDailyStatsSummary";
import type { DailySummaryWindow } from "@/domains/dashboard/model/dailySummaryTypes";

const fmtNum = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));
const fmtMoney = (v: number) => `$${Math.round(v).toLocaleString()}`;

function Change({ d, money, suffix }: { d: number | undefined; money?: boolean; suffix?: string }) {
  if (d === undefined || Math.abs(d) < 0.05)
    return <span className="text-muted-foreground">—</span>;
  const abs = Math.abs(d);
  return (
    <span className={d > 0 ? "text-success" : "text-destructive"}>
      {d > 0 ? "+" : "−"}
      {money ? fmtMoney(abs) : fmtNum(Math.round(abs * 10) / 10)}
      {suffix}
    </span>
  );
}

function PriceTrend({ values }: { values: number[] }) {
  if (values.length < 2) return <span className="text-muted-foreground">—</span>;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values
    .map((v, i) => `${(i / (values.length - 1)) * 100},${19 - ((v - min) / span) * 18}`)
    .join(" ");
  const up = values[values.length - 1] >= values[0];
  return (
    <svg viewBox="0 0 100 20" className="h-4 w-16" preserveAspectRatio="none" aria-hidden>
      <polyline
        points={pts}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className={up ? "text-success" : "text-destructive"}
      />
    </svg>
  );
}

const WINDOW_OPTIONS = [
  { value: "day", label: "Since yesterday" },
  { value: "week", label: "Last 7 days" },
];
const SORT_OPTIONS = [
  { value: "rating", label: "Rating" },
  { value: "change", label: "Price change" },
  { value: "name", label: "Name" },
];

export function DailyStatsSummaryWidget() {
  const [window, setWindow] = useState<DailySummaryWindow>("day");
  const [sort, setSort] = useState<DailySummarySort>("rating");
  const { rows, totals, hasHistory } = useDailyStatsSummary(window, sort);

  if (rows.length === 0) return null;

  return (
    <Card className="border-border">
      <CardHeader className="pb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b border-border">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center border border-primary/20">
            <Activity className="h-4 w-4 text-primary" />
          </div>
          <div>
            <CardTitle className="text-xl font-bold font-[family-name:var(--font-display)] tracking-tight">
              Daily Stats Summary
            </CardTitle>
            {hasHistory && (
              <p className="text-xs text-muted-foreground">
                Stable value <Change d={totals.valueChange} money /> · {totals.improving} improving
                · {totals.declining} declining
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PillToggleGroup
            ariaLabel="Compare period"
            options={WINDOW_OPTIONS}
            value={window}
            onChange={(v) => setWindow(v as DailySummaryWindow)}
          />
          <PillToggleGroup
            ariaLabel="Sort horses by"
            options={SORT_OPTIONS}
            value={sort}
            onChange={(v) => setSort(v as DailySummarySort)}
          />
        </div>
      </CardHeader>
      <CardContent className="pt-3">
        {!hasHistory ? (
          <p className="text-sm text-muted-foreground">
            Advance a day to start tracking each horse's rating, form, energy and price.
          </p>
        ) : (
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-xs font-mono">
              <thead className="text-muted-foreground uppercase sticky top-0 bg-card">
                <tr>
                  <th scope="col" className="text-left py-1.5 pr-3 font-normal">
                    Horse
                  </th>
                  <th scope="col" className="text-right px-2 font-normal">
                    Rating
                  </th>
                  <th scope="col" className="text-right px-2 font-normal">
                    Form
                  </th>
                  <th scope="col" className="text-right px-2 font-normal">
                    Energy
                  </th>
                  <th scope="col" className="text-right px-2 font-normal">
                    Price
                  </th>
                  <th scope="col" className="text-right pl-2 font-normal">
                    Trend
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.horseId} className="border-t border-border">
                    <td className="py-1.5 pr-3 font-sans">
                      <Link
                        to="/stable/$horseId"
                        params={{ horseId: r.horseId }}
                        className="font-semibold text-foreground hover:text-primary transition-colors"
                      >
                        {r.name}
                      </Link>
                    </td>
                    {r.latest ? (
                      <>
                        <Cell value={fmtNum(r.latest.ovr)}>
                          <Change d={r.changes.ovr} />
                        </Cell>
                        <Cell value={fmtNum(r.latest.form)}>
                          <Change d={r.changes.form} />
                        </Cell>
                        <Cell value={`${r.latest.energy}%`}>
                          <Change d={r.changes.energy} suffix="%" />
                        </Cell>
                        <Cell value={fmtMoney(r.latest.price)}>
                          <Change d={r.changes.price} money />
                        </Cell>
                        <td className="pl-2">
                          <div className="flex justify-end">
                            <PriceTrend values={r.priceTrend} />
                          </div>
                        </td>
                      </>
                    ) : (
                      <td colSpan={5} className="text-right text-muted-foreground font-sans">
                        Tracking starts tomorrow
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Cell({ value, children }: { value: string; children: React.ReactNode }) {
  return (
    <td className={cn("text-right px-2 whitespace-nowrap")}>
      <div className="text-foreground">{value}</div>
      <div className="text-[10px]">{children}</div>
    </td>
  );
}
