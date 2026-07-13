import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useGame } from "@/game/store";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PersonRaceHistoryTab } from "@/components/person/PersonRaceHistoryTab";
import { STAFF_ROLE_LABELS, STAFF_TIER_LABELS } from "@/core/staff/staffConfig";
import { formatCurrency } from "@/core/common/formatting";
import { staffTierColor } from "@/core/common/uiTokens";
import { cn } from "@/lib/cn";
import { ChevronLeft, User, History, Briefcase, Trophy } from "lucide-react";
import type { StaffMember } from "@/core/staff/staffTypes";

export const Route = createFileRoute("/staff/$staffId")({
  component: StaffDetailPage,
  notFoundComponent: () => (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-cream">Staff member not found</h1>
      <Link to="/staff" className="text-gold underline mt-4 block">
        Back to Staff
      </Link>
    </div>
  ),
});

function StaffDetailPage() {
  const { staffId } = Route.useParams();
  const hiredStaff = useGame((s) => s.hiredStaff);
  const staffPool = useGame((s) => s.staffPool);

  const staff = useMemo<StaffMember | undefined>(() => {
    const all = [...(hiredStaff ?? []), ...(staffPool ?? [])];
    return all.find((m) => m.id === staffId);
  }, [hiredStaff, staffPool, staffId]);

  if (!staff) {
    throw notFound();
  }

  const tierLabel = STAFF_TIER_LABELS[staff.tier];
  const roleLabel = STAFF_ROLE_LABELS[staff.role];

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-4 md:p-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-4">
        <Link to="/staff">
          <Button variant="ghost" size="sm" className="text-cream-muted hover:text-cream">
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Staff
          </Button>
        </Link>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" />
            Race History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card className="bg-slate-900/40 border-white/5 rounded-none shadow-xl border-l-4 border-l-blue-400">
            <CardHeader className="bg-black/20 border-b border-white/5">
              <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-cream/40">
                Staff Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-white/5">
                <div className="flex items-center justify-between p-4">
                  <span className="text-[9px] font-black uppercase tracking-widest text-cream/40 flex items-center gap-2">
                    <Briefcase className="h-3 w-3" /> Name
                  </span>
                  <span className="text-xs font-bold text-cream uppercase">{staff.name}</span>
                </div>
                <div className="flex items-center justify-between p-4">
                  <span className="text-[9px] font-black uppercase tracking-widest text-cream/40">
                    Role
                  </span>
                  <span className="text-xs font-bold text-gold-muted uppercase tracking-widest">
                    {roleLabel.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center justify-between p-4">
                  <span className="text-[9px] font-black uppercase tracking-widest text-cream/40">
                    Tier
                  </span>
                  <Badge
                    className={cn(
                      "rounded-none h-4 px-1.5 text-[8px] font-black uppercase tracking-widest",
                      staff.tier === "elite"
                        ? "bg-fame text-slate-950"
                        : staff.tier === "mid"
                          ? "bg-gold text-slate-950"
                          : "bg-slate-700 text-cream",
                    )}
                  >
                    {tierLabel.toUpperCase()}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-4">
                  <span className="text-[9px] font-black uppercase tracking-widest text-cream/40">
                    Day Rate
                  </span>
                  <span className="text-sm font-black font-mono text-destructive tracking-tighter">
                    -{formatCurrency(staff.salary)}
                  </span>
                </div>
                {staff.fame !== undefined && (
                  <div className="flex items-center justify-between p-4">
                    <span className="text-[9px] font-black uppercase tracking-widest text-cream/40">
                      Fame
                    </span>
                    <span className="flex items-center gap-1 text-xs font-bold text-fame">
                      <Trophy className="h-3 w-3" />
                      {staff.fame}
                    </span>
                  </div>
                )}
                {staff.traits && staff.traits.length > 0 && (
                  <div className="p-4">
                    <div className="text-[9px] font-black uppercase tracking-widest text-cream/40 mb-2">
                      Traits
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {staff.traits.map((t) => (
                        <div
                          key={t}
                          className="px-2 py-0.5 bg-black/40 border border-white/5 text-[9px] font-mono text-blue-400/60 uppercase tracking-tighter rounded-sm"
                        >
                          {t.toUpperCase()}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {staff.specialties && staff.specialties.length > 0 && (
                  <div className="p-4">
                    <div className="text-[9px] font-black uppercase tracking-widest text-cream/40 mb-2">
                      Specialties
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {staff.specialties.map((s) => (
                        <div
                          key={s}
                          className="px-2 py-0.5 bg-black/40 border border-white/5 text-[9px] font-mono text-gold/60 uppercase tracking-tighter rounded-sm"
                        >
                          {s.toUpperCase()}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {staff.raceRecord && (
                  <div className="p-4">
                    <div className="text-[9px] font-black uppercase tracking-widest text-cream/40 mb-3">
                      Career Record
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      <div className="text-center">
                        <div className="text-[8px] font-mono uppercase text-cream/30">Starts</div>
                        <div className="text-sm font-black text-cream">
                          {staff.raceRecord.starts}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-[8px] font-mono uppercase text-cream/30">Wins</div>
                        <div className="text-sm font-black text-gold">{staff.raceRecord.wins}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-[8px] font-mono uppercase text-cream/30">Places</div>
                        <div className="text-sm font-black text-cream/70">
                          {staff.raceRecord.places}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-[8px] font-mono uppercase text-cream/30">Shows</div>
                        <div className="text-sm font-black text-cream/70">
                          {staff.raceRecord.shows}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <PersonRaceHistoryTab personId={staff.id} roles={["trainer"]} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
