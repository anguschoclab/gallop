import { useState } from "react";
import type { Horse } from "@/game/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { HorseStats, StatBar, SilkBadge } from "@/components/HorseBits";
import { calculateOverallRating } from "@/core/horse/stats";
import { X, GitCompare } from "lucide-react";

interface HorseCompareProps {
  horses: Horse[];
}

export function HorseCompare({ horses }: HorseCompareProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [horse1Id, setHorse1Id] = useState<string | undefined>();
  const [horse2Id, setHorse2Id] = useState<string | undefined>();

  const horse1 = horses.find((h) => h.id === horse1Id);
  const horse2 = horses.find((h) => h.id === horse2Id);

  const canCompare = horse1 && horse2 && horse1.id !== horse2.id;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <GitCompare className="h-4 w-4 mr-2" />
          Compare Horses
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Compare Horses</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Horse Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">First Horse</label>
              <Select value={horse1Id} onValueChange={setHorse1Id}>
                <SelectTrigger>
                  <SelectValue placeholder="Select horse" />
                </SelectTrigger>
                <SelectContent>
                  {horses.map((h) => (
                    <SelectItem key={h.id} value={h.id}>
                      {h.name} (OVR {calculateOverallRating(h)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Second Horse</label>
              <Select value={horse2Id} onValueChange={setHorse2Id}>
                <SelectTrigger>
                  <SelectValue placeholder="Select horse" />
                </SelectTrigger>
                <SelectContent>
                  {horses.map((h) => (
                    <SelectItem key={h.id} value={h.id}>
                      {h.name} (OVR {calculateOverallRating(h)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Comparison View */}
          {canCompare && (
            <div className="grid grid-cols-2 gap-6">
              {/* Horse 1 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <SilkBadge color={horse1.silk} />
                    {horse1.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">Age {horse1.age}</Badge>
                    <Badge variant="secondary">OVR {calculateOverallRating(horse1)}</Badge>
                    <Badge variant="secondary">Potential {horse1.potential}</Badge>
                    <Badge variant="secondary">Energy ⚡ {horse1.energy}/100</Badge>
                    <Badge variant={horse1.form >= 0 ? "default" : "destructive"}>
                      Form {horse1.form > 0 ? "+" : ""}{horse1.form}
                    </Badge>
                  </div>
                  <HorseStats horse={horse1} />
                  <div className="text-sm text-muted-foreground">
                    <div>Gender: {horse1.gender}</div>
                    <div>Hemisphere: {horse1.hemisphere}</div>
                    <div>Races: {horse1.raceHistory.length}</div>
                    {horse1.sireName && <div>Sire: {horse1.sireName}</div>}
                    {horse1.damName && <div>Dam: {horse1.damName}</div>}
                  </div>
                </CardContent>
              </Card>

              {/* Horse 2 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <SilkBadge color={horse2.silk} />
                    {horse2.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">Age {horse2.age}</Badge>
                    <Badge variant="secondary">OVR {calculateOverallRating(horse2)}</Badge>
                    <Badge variant="secondary">Potential {horse2.potential}</Badge>
                    <Badge variant="secondary">Energy ⚡ {horse2.energy}/100</Badge>
                    <Badge variant={horse2.form >= 0 ? "default" : "destructive"}>
                      Form {horse2.form > 0 ? "+" : ""}{horse2.form}
                    </Badge>
                  </div>
                  <HorseStats horse={horse2} />
                  <div className="text-sm text-muted-foreground">
                    <div>Gender: {horse2.gender}</div>
                    <div>Hemisphere: {horse2.hemisphere}</div>
                    <div>Races: {horse2.raceHistory.length}</div>
                    {horse2.sireName && <div>Sire: {horse2.sireName}</div>}
                    {horse2.damName && <div>Dam: {horse2.damName}</div>}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Stat Comparison Table */}
          {canCompare && (
            <Card>
              <CardHeader>
                <CardTitle>Stat Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(["speed", "stamina", "acceleration", "consistency"] as const).map((stat) => {
                    const v1 = horse1.stats[stat];
                    const v2 = horse2.stats[stat];
                    const diff = v1 - v2;
                    const winner = diff > 0 ? horse1.name : diff < 0 ? horse2.name : "Tie";
                    return (
                      <div key={stat} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium capitalize">{stat}</span>
                          <span className="text-muted-foreground">
                            {diff !== 0 && (
                              <span className={diff > 0 ? "text-green-600" : "text-red-600"}>
                                {diff > 0 ? "+" : ""}{diff}
                              </span>
                            )}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className={diff > 0 ? "bg-green-50 dark:bg-green-950 rounded p-2" : ""}>
                            <div className="text-xs text-muted-foreground mb-1">{horse1.name}</div>
                            <StatBar label="" value={v1} />
                          </div>
                          <div className={diff < 0 ? "bg-green-50 dark:bg-green-950 rounded p-2" : ""}>
                            <div className="text-xs text-muted-foreground mb-1">{horse2.name}</div>
                            <StatBar label="" value={v2} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Race History Comparison */}
          {canCompare && (horse1.raceHistory.length > 0 || horse2.raceHistory.length > 0) && (
            <Card>
              <CardHeader>
                <CardTitle>Race History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">{horse1.name}</h4>
                    {horse1.raceHistory.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No races yet</p>
                    ) : (
                      <div className="space-y-1">
                        {horse1.raceHistory.slice(0, 5).map((r, i) => (
                          <div key={i} className="flex justify-between text-sm py-1 border-b">
                            <span className="truncate">{r.raceName}</span>
                            <Badge variant={r.position === 1 ? "default" : r.position <= 3 ? "secondary" : "outline"}>
                              {r.position}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">{horse2.name}</h4>
                    {horse2.raceHistory.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No races yet</p>
                    ) : (
                      <div className="space-y-1">
                        {horse2.raceHistory.slice(0, 5).map((r, i) => (
                          <div key={i} className="flex justify-between text-sm py-1 border-b">
                            <span className="truncate">{r.raceName}</span>
                            <Badge variant={r.position === 1 ? "default" : r.position <= 3 ? "secondary" : "outline"}>
                              {r.position}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
