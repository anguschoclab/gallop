import React, { useState } from "react";
import { useGame } from "@/game/store";
import { Trophy, History, Star, Award, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Link } from "@tanstack/react-router";

export const RecordsDashboard: React.FC = () => {
  const hallOfFame = useGame((s) => s.hallOfFame);
  const seasonRecords = useGame((s) => s.seasonRecords);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredHOF = hallOfFame.filter((e) =>
    e.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="p-6 space-y-6 bg-[#0a0a0a] min-h-screen text-cream">
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <Trophy className="text-gold" size={32} />
          <h1 className="text-4xl font-serif font-bold tracking-tight">The Hall of Records</h1>
        </div>
        <p className="text-cream-muted italic">
          Preserving the legacy of the turf for future generations.
        </p>
      </header>

      <Tabs defaultValue="hof" className="w-full">
        <TabsList className="bg-black/40 border border-white/10 p-1 mb-6">
          <TabsTrigger
            value="hof"
            className="data-[state=active]:bg-gold data-[state=active]:text-black"
          >
            <Star size={16} className="mr-2" />
            Hall of Fame
          </TabsTrigger>
          <TabsTrigger
            value="season"
            className="data-[state=active]:bg-gold data-[state=active]:text-black"
          >
            <History size={16} className="mr-2" />
            Season History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="hof">
          <div className="flex flex-col gap-6">
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-cream-muted"
                size={18}
              />
              <Input
                placeholder="Search legends..."
                className="pl-10 bg-black/40 border-white/10 text-cream focus:border-gold h-12"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {filteredHOF.length === 0 ? (
              <div className="text-center py-20 border-2 border-dashed border-white/5 rounded-xl">
                <Trophy size={48} className="mx-auto text-white/10 mb-4" />
                <p className="text-cream-muted">
                  No legends have been inducted yet. Win 3 Grade 1s to make history.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...filteredHOF]
                  .sort((a, b) => b.inductionDay - a.inductionDay)
                  .map((entry) => (
                    <Card
                      key={entry.horseId}
                      className="bg-black/60 border-gold/20 hover:border-gold/50 transition-all overflow-hidden group"
                    >
                      <div className="h-2 bg-gold/20" />
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <div
                            className="w-12 h-12 rounded-full border-2 border-white/20 shadow-inner flex items-center justify-center text-xs font-bold"
                            style={{ backgroundColor: entry.silk }}
                          >
                            HOF
                          </div>
                          <Badge variant="outline" className="text-gold border-gold/40">
                            Year {entry.inductionYear}
                          </Badge>
                        </div>
                        <CardTitle className="text-2xl font-serif mt-4 group-hover:text-gold transition-colors">
                          <Link to="/stable/$horseId" params={{ horseId: entry.horseId }}>
                            {entry.name}
                          </Link>
                        </CardTitle>
                        <p className="text-xs text-cream-muted">
                          by {entry.pedigree.sireName || "?"} out of {entry.pedigree.damName || "?"}
                        </p>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="bg-white/5 p-2 rounded">
                            <p className="text-[10px] uppercase text-cream-muted">Earnings</p>
                            <p className="font-bold text-gold">
                              ${(entry.lifetimeEarnings / 1000).toFixed(0)}k
                            </p>
                          </div>
                          <div className="bg-white/5 p-2 rounded">
                            <p className="text-[10px] uppercase text-cream-muted">G1 Wins</p>
                            <p className="font-bold">{entry.g1Wins}</p>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <p className="text-[10px] uppercase text-gold font-bold tracking-widest">
                            Achievements
                          </p>
                          {entry.achievements.map((ach, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs text-cream">
                              <Award size={12} className="text-gold" />
                              {ach}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="season">
          <Card className="bg-black/40 border-white/10">
            <CardHeader>
              <CardTitle className="font-serif">Grade 1 Winners by Season</CardTitle>
            </CardHeader>
            <CardContent>
              {seasonRecords.length === 0 ? (
                <p className="text-cream-muted italic">No Grade 1 races have been completed yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 text-cream-muted text-xs uppercase tracking-wider">
                        <th className="py-3 px-4">Year</th>
                        <th className="py-3 px-4">Race</th>
                        <th className="py-3 px-4">Winner</th>
                        <th className="py-3 px-4">Jockey</th>
                        <th className="py-3 px-4">Gate</th>
                        <th className="py-3 px-4">Time</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {[...seasonRecords]
                        .sort((a, b) => b.day - a.day)
                        .map((record) => (
                          <tr
                            key={record.id}
                            className="border-b border-white/5 hover:bg-white/5 transition-colors"
                          >
                            <td className="py-4 px-4 font-bold text-gold">Y{record.year}</td>
                            <td className="py-4 px-4 font-medium">{record.raceName}</td>
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: record.winnerSilk }}
                                />
                                <Link
                                  to="/stable/$horseId"
                                  params={{ horseId: record.winnerId }}
                                  className={record.isPlayerOwned ? "font-bold text-gold" : ""}
                                >
                                  {record.winnerName}
                                </Link>
                              </div>
                            </td>
                            <td className="py-4 px-4 text-cream-muted">{record.jockeyName}</td>
                            <td className="py-4 px-4 font-mono text-cream/50">
                              {typeof record.gate === "number" ? `G${record.gate}` : "—"}
                            </td>
                            <td className="py-4 px-4 font-mono">{record.time.toFixed(2)}s</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
