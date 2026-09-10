/**
 * PriceAlertsPanel.tsx - Create and manage market price alerts
 *
 * Lets the player watch the whole market, a grade segment or a single track and
 * be notified in the Message Center when the traded price index moves beyond a
 * threshold. Also lists the live index for each configured alert.
 */

import { useMemo, useState } from "react";
import { useGame, useGameWithShallow, type StoreType } from "@/game/store";
import type { Horse } from "@/game/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Bell, BellRing, Trash2, TrendingDown, TrendingUp } from "lucide-react";
import { TRACKS } from "@/data/tracks";
import {
  DEFAULT_ALERT_THRESHOLD_PCT,
  DEFAULT_ALERT_WINDOW_DAYS,
  GRADE_SEGMENTS,
  scopeLabel,
  segmentPriceIndex,
  REAL_WORLD_BLEND_WEIGHT,
  type AlertHorse,
  type PriceAlertDirection,
  type PriceAlertScope,
} from "@/core/market/priceAlerts";
import { createDefaultExchangeState } from "@/core/market/exchange";

type ScopeKind = "market" | "grade" | "track";

const trackName = (id: string) => TRACKS.find((t) => t.id === id)?.name ?? id;
const pct = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;
const money = (v: number) => `$${Math.round(v).toLocaleString("en-US")}`;

export function PriceAlertsPanel() {
  const day = useGame((s: StoreType) => s.day);
  const alerts = useGameWithShallow((s: StoreType) => s.priceAlerts ?? []);
  const exchange = useGameWithShallow((s: StoreType) => s.exchange ?? createDefaultExchangeState());
  const horses = useGame((s: StoreType) => s.horses);
  const addAlert = useGame((s: StoreType) => s.addPriceAlert);
  const removeAlert = useGame((s: StoreType) => s.removePriceAlert);
  const toggleAlert = useGame((s: StoreType) => s.togglePriceAlert);

  const [kind, setKind] = useState<ScopeKind>("market");
  const [grade, setGrade] = useState<string>("G1");
  const [trackId, setTrackId] = useState<string>(TRACKS[0]?.id ?? "");
  const [direction, setDirection] = useState<PriceAlertDirection>("either");
  const [threshold, setThreshold] = useState(String(DEFAULT_ALERT_THRESHOLD_PCT));
  const [windowDays, setWindowDays] = useState(String(DEFAULT_ALERT_WINDOW_DAYS));

  const alertHorses: AlertHorse[] = useMemo(
    () =>
      (Object.values(horses ?? {}) as Horse[]).map((h) => ({
        id: h.id,
        name: h.name,
        raceHistory: h.raceHistory,
        courseVisits: h.courseVisits,
      })),
    [horses],
  );

  const scopeFromForm = (): PriceAlertScope =>
    kind === "market"
      ? { kind: "market" }
      : kind === "grade"
        ? { kind: "grade", value: grade }
        : { kind: "track", value: trackId };

  const rows = useMemo(
    () =>
      alerts.map((alert) => ({
        alert,
        index: segmentPriceIndex({
          trades: exchange.trades,
          horses: alertHorses,
          scope: alert.scope,
          day,
          windowDays: alert.windowDays,
          realWorldWeight: REAL_WORLD_BLEND_WEIGHT,
        }),
      })),
    [alerts, exchange.trades, alertHorses, day],
  );

  return (
    <div className="space-y-6">
      <Card className="bg-slate-900/40 border-white/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-cream text-lg">
            <BellRing className="h-4 w-4 text-primary" />
            New alert
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-5">
          <div className="space-y-1">
            <Label className="text-[10px] uppercase text-cream/50">Watch</Label>
            <Select value={kind} onValueChange={(v) => setKind(v as ScopeKind)}>
              <SelectTrigger aria-label="Alert scope">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="market">Whole market</SelectItem>
                <SelectItem value="grade">Grade segment</SelectItem>
                <SelectItem value="track">Track</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {kind === "grade" && (
            <div className="space-y-1">
              <Label className="text-[10px] uppercase text-cream/50">Grade</Label>
              <Select value={grade} onValueChange={setGrade}>
                <SelectTrigger aria-label="Grade segment">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GRADE_SEGMENTS.map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {kind === "track" && (
            <div className="space-y-1">
              <Label className="text-[10px] uppercase text-cream/50">Track</Label>
              <Select value={trackId} onValueChange={setTrackId}>
                <SelectTrigger aria-label="Track">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {TRACKS.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1">
            <Label className="text-[10px] uppercase text-cream/50">Direction</Label>
            <Select value={direction} onValueChange={(v) => setDirection(v as PriceAlertDirection)}>
              <SelectTrigger aria-label="Alert direction">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="either">Either way</SelectItem>
                <SelectItem value="up">Rising only</SelectItem>
                <SelectItem value="down">Falling only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] uppercase text-cream/50" htmlFor="alert-threshold">
              Move %
            </Label>
            <Input
              id="alert-threshold"
              value={threshold}
              inputMode="numeric"
              onChange={(e) => setThreshold(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] uppercase text-cream/50" htmlFor="alert-window">
              Window (days)
            </Label>
            <Input
              id="alert-window"
              value={windowDays}
              inputMode="numeric"
              onChange={(e) => setWindowDays(e.target.value)}
            />
          </div>

          <div className="md:col-span-5">
            <Button
              onClick={() =>
                addAlert({
                  scope: scopeFromForm(),
                  direction,
                  thresholdPct: Number(threshold) || DEFAULT_ALERT_THRESHOLD_PCT,
                  windowDays: Number(windowDays) || DEFAULT_ALERT_WINDOW_DAYS,
                })
              }
            >
              <Bell className="mr-2 h-4 w-4" />
              Create alert
            </Button>
            <p className="mt-2 text-[10px] font-mono uppercase text-cream/40">
              Alerts are checked every time you advance a day. Fills on your own orders always
              notify you, no alert needed.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-900/40 border-white/5">
        <CardHeader>
          <CardTitle className="text-cream text-lg">Your alerts ({alerts.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {rows.length === 0 ? (
            <p className="text-sm text-cream/50">
              No alerts yet. Watch a track or a grade to get told when prices move.
            </p>
          ) : (
            rows.map(({ alert, index }) => (
              <div
                key={alert.id}
                className="flex flex-wrap items-center justify-between gap-3 border border-white/5 bg-slate-950/40 p-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-cream">
                      {scopeLabel(alert.scope, trackName)}
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                      {alert.direction === "either"
                        ? "either way"
                        : alert.direction === "up"
                          ? "rising"
                          : "falling"}{" "}
                      ≥ {alert.thresholdPct}%
                    </Badge>
                    {!alert.enabled && (
                      <Badge variant="secondary" className="text-[10px]">
                        paused
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 font-mono text-[11px] text-cream/60">
                    {index.movePct >= 0 ? (
                      <TrendingUp className="h-3 w-3 text-success" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-destructive" />
                    )}
                    <span>{pct(index.movePct)}</span>
                    <span>
                      {money(index.previous)} → {money(index.current)}
                    </span>
                    <span>
                      {index.sampleSize} trade{index.sampleSize === 1 ? "" : "s"} /{" "}
                      {alert.windowDays}d
                    </span>
                    {alert.lastTriggeredDay !== undefined && (
                      <span>fired day {alert.lastTriggeredDay}</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => toggleAlert(alert.id)}>
                    {alert.enabled ? "Pause" : "Resume"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Delete alert for ${scopeLabel(alert.scope, trackName)}`}
                    onClick={() => removeAlert(alert.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
