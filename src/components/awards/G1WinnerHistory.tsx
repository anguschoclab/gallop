import { useMemo } from "react";
import { useGame } from "@/game/store";
import type { SeasonRecord } from "@/core/history/historyTypes";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SilkDot } from "@/components/SilkDot";
import { Link } from "@tanstack/react-router";
import { Trophy } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  TIME_DECIMAL_PLACES,
  G1_HISTORY_TAB_BY_RACE,
  G1_HISTORY_TAB_CHRONOLOGICAL,
  HORSE_PAGE_ROUTE,
  G1_HISTORY_EMPTY_MESSAGE,
  G1_HISTORY_TITLE,
  WINNER_LABEL_SINGULAR,
  WINNER_LABEL_PLURAL,
  RACE_LABEL_SINGULAR,
  RACE_LABEL_PLURAL,
  YEAR_LABEL_PREFIX,
  LATEST_WINNER_PREFIX,
  G1_HISTORY_SUBTITLE_SUFFIX,
} from "@/constants/awardsConstants";

export function G1WinnerHistory() {
  const seasonRecords = useGame((s) => s.seasonRecords);

  const byRace = useMemo(() => {
    const groups = new Map<string, SeasonRecord[]>();
    for (const record of seasonRecords) {
      const list = groups.get(record.raceName) ?? [];
      list.push(record);
      groups.set(record.raceName, list);
    }
    for (const [, list] of groups) {
      list.sort((a, b) => b.day - a.day);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [seasonRecords]);

  const chronological = useMemo(
    () => [...seasonRecords].sort((a, b) => b.day - a.day),
    [seasonRecords],
  );

  if (seasonRecords.length === 0) {
    return (
      <Card className="border-gold-muted">
        <CardHeader>
          <CardTitle className="text-base text-cream font-[family-name:var(--font-display)] flex items-center gap-2">
            <Trophy className="w-4 h-4 text-gold" />
            {G1_HISTORY_TITLE}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-cream-muted italic">{G1_HISTORY_EMPTY_MESSAGE}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-gold-muted">
      <CardHeader>
        <CardTitle className="text-base text-cream font-[family-name:var(--font-display)] flex items-center gap-2">
          <Trophy className="w-4 h-4 text-gold" />
          {G1_HISTORY_TITLE}
        </CardTitle>
        <p className="text-xs text-cream-muted">
          {seasonRecords.length} Grade 1{" "}
          {seasonRecords.length === 1 ? RACE_LABEL_SINGULAR : RACE_LABEL_PLURAL}{" "}
          {G1_HISTORY_SUBTITLE_SUFFIX}
        </p>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={G1_HISTORY_TAB_BY_RACE} className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value={G1_HISTORY_TAB_BY_RACE}>By Race</TabsTrigger>
            <TabsTrigger value={G1_HISTORY_TAB_CHRONOLOGICAL}>Chronological</TabsTrigger>
          </TabsList>

          <TabsContent value={G1_HISTORY_TAB_BY_RACE}>
            <Accordion type="multiple">
              {byRace.map(([raceName, winners]) => (
                <AccordionItem key={raceName} value={raceName}>
                  <AccordionTrigger>
                    <div className="flex items-center justify-between w-full pr-2">
                      <span className="font-medium text-cream">{raceName}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="font-mono tabular-nums">
                          {winners.length}{" "}
                          {winners.length === 1 ? WINNER_LABEL_SINGULAR : WINNER_LABEL_PLURAL}
                        </Badge>
                        <span className="text-xs text-cream-muted">
                          {LATEST_WINNER_PREFIX} {winners[0].winnerName} ({YEAR_LABEL_PREFIX}
                          {winners[0].year})
                        </span>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-white/10 text-cream-muted text-xs uppercase tracking-wider">
                            <th className="py-2 px-3">Year</th>
                            <th className="py-2 px-3">Winner</th>
                            <th className="py-2 px-3">Jockey</th>
                            <th className="py-2 px-3">Time</th>
                          </tr>
                        </thead>
                        <tbody className="text-sm">
                          {winners.map((record) => (
                            <tr
                              key={record.id}
                              className="border-b border-white/5 hover:bg-white/5 transition-colors"
                            >
                              <td className="py-2 px-3 font-bold text-gold">
                                {YEAR_LABEL_PREFIX}
                                {record.year}
                              </td>
                              <td className="py-2 px-3">
                                <div className="flex items-center gap-2">
                                  <SilkDot color={record.winnerSilk} size="sm" />
                                  <Link
                                    to={HORSE_PAGE_ROUTE}
                                    params={{ horseId: record.winnerId }}
                                    className={cn(
                                      "hover:text-gold transition-colors",
                                      record.isPlayerOwned ? "text-gold font-bold" : "text-cream",
                                    )}
                                  >
                                    {record.winnerName}
                                  </Link>
                                </div>
                              </td>
                              <td className="py-2 px-3 text-cream-muted">{record.jockeyName}</td>
                              <td className="py-2 px-3 font-mono">
                                {record.time.toFixed(TIME_DECIMAL_PLACES)}s
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </TabsContent>

          <TabsContent value={G1_HISTORY_TAB_CHRONOLOGICAL}>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-cream-muted text-xs uppercase tracking-wider">
                    <th className="py-2 px-3">Year</th>
                    <th className="py-2 px-3">Race</th>
                    <th className="py-2 px-3">Winner</th>
                    <th className="py-2 px-3">Jockey</th>
                    <th className="py-2 px-3">Time</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {chronological.map((record) => (
                    <tr
                      key={record.id}
                      className="border-b border-white/5 hover:bg-white/5 transition-colors"
                    >
                      <td className="py-2 px-3 font-bold text-gold">
                        {YEAR_LABEL_PREFIX}
                        {record.year}
                      </td>
                      <td className="py-2 px-3 font-medium text-cream">{record.raceName}</td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <SilkDot color={record.winnerSilk} size="sm" />
                          <Link
                            to={HORSE_PAGE_ROUTE}
                            params={{ horseId: record.winnerId }}
                            className={cn(
                              "hover:text-gold transition-colors",
                              record.isPlayerOwned ? "text-gold font-bold" : "text-cream",
                            )}
                          >
                            {record.winnerName}
                          </Link>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-cream-muted">{record.jockeyName}</td>
                      <td className="py-2 px-3 font-mono">
                        {record.time.toFixed(TIME_DECIMAL_PLACES)}s
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
