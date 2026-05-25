import { createFileRoute } from "@tanstack/react-router";
import { useGame } from "@/game/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/formatting";
import { STAFF_ROLE_LABELS, STAFF_TIER_LABELS } from "@/core/staff/staffConfig";
import {
  Users,
  Briefcase,
  Zap,
  UserPlus,
  X,
  DollarSign,
  ShieldCheck,
  Activity,
  ArrowRight,
  HardDrive,
  Info,
  Trophy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NumericValue } from "@/components/HorseBits";
import { useMemo } from "react";
import { getG1WinsForStable, countByGrade } from "@/lib/connectionTrophies";

export const Route = createFileRoute("/staff")({
  component: StaffManagement,
});

function StaffManagement() {
  const { hiredStaff, staffPool, enqueueIntent, day } = useGame();
  const horses = (useGame as any)((s: any) => s.horses);
  const races = (useGame as any)((s: any) => s.races);

  const myStaff = hiredStaff?.filter((s) => s.stableId === "") ?? [];

  // Stable-wide graded wins are attributed to each retained connection
  // (head trainer, trainers, caretakers/grooms) since they support every runner.
  const stableG1Wins = useMemo(
    () => getG1WinsForStable({ horses, races } as any, undefined),
    [horses, races],
  );
  const honorCounts = useMemo(() => countByGrade(stableG1Wins), [stableG1Wins]);
  const showHonors = (role: string) => role === "trainer" || role === "groom";

  const handleHire = (staffId: string) => {
    enqueueIntent({
      type: "staff",
      action: "hire",
      stableId: "",
      staffId,
      role: staffPool.find((s) => s.id === staffId)!.role,
      tier: staffPool.find((s) => s.id === staffId)!.tier,
      salary: staffPool.find((s) => s.id === staffId)!.salary,
    } as any);
  };

  const handleFire = (staff: any) => {
    enqueueIntent({
      type: "staff",
      action: "fire",
      stableId: "",
      staffId: staff.id,
      role: staff.role,
      tier: staff.tier,
      salary: staff.salary,
    } as any);
  };

  return (
    <div className="space-y-6 pb-20 animate-fade-in">
      {/* Staff Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-blue-500/20 pb-6">
        <div>
          <div className="flex items-center gap-2 text-blue-400 uppercase tracking-[0.2em] font-[family-name:var(--font-display)] text-xs font-bold mb-1 opacity-60">
            <Users className="h-3.5 w-3.5" />
            Stable Staff
          </div>
          <h1 className="text-4xl font-bold tracking-tighter text-cream font-[family-name:var(--font-display)]">
            Our Staff
          </h1>
          <div className="flex items-center gap-3 mt-2 font-mono text-[10px] uppercase tracking-widest text-cream/40">
            <span>
              Active Team: <NumericValue value={myStaff.length} />
            </span>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <span>
              Recruitment Pool: <NumericValue value={staffPool.length} />
            </span>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <span>
              Season Day: <NumericValue value={day} />
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          <Badge
            variant="outline"
            className="border-blue-500/30 text-blue-400 bg-blue-500/5 font-mono text-[10px] uppercase tracking-widest px-3 py-1 h-8 rounded-none"
          >
            Access: Manager
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Left Pillar: Active Team */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 px-1 border-b border-white/5 pb-2">
            <ShieldCheck className="h-4 w-4 text-blue-400" />
            <h3 className="text-xs font-black uppercase tracking-[0.4em] text-cream/60">
              Our Team
            </h3>
          </div>

          {myStaff.length === 0 ? (
            <div className="p-20 text-center border-2 border-dashed border-white/5 bg-black/10">
              <Briefcase className="h-16 w-16 mx-auto mb-6 text-cream/5" />
              <p className="font-bold text-cream/40 uppercase tracking-[0.3em] font-[family-name:var(--font-display)]">
                No Retained Staff
              </p>
              <p className="text-[10px] font-mono text-cream/10 uppercase mt-2">
                Team roster is currently vacant. Hire staff from the pool.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {myStaff.map((staff) => (
                <Card
                  key={staff.id}
                  className="bg-slate-900/40 border-white/5 rounded-none group hover:border-blue-500/30 transition-all duration-300 relative overflow-hidden shadow-xl"
                >
                  <div className="absolute top-0 left-0 w-1 h-full bg-blue-500/10 group-hover:bg-blue-500 transition-colors" />

                  <CardContent className="p-0">
                    <div className="flex">
                      <div
                        className={cn(
                          "w-16 flex flex-col items-center justify-center shrink-0 border-r border-white/5",
                          staff.tier === "elite"
                            ? "bg-fame/10"
                            : staff.tier === "mid"
                              ? "bg-gold/10"
                              : "bg-black/40",
                        )}
                      >
                        <Briefcase
                          className={cn(
                            "w-6 h-6",
                            staff.tier === "elite"
                              ? "text-fame"
                              : staff.tier === "mid"
                                ? "text-gold"
                                : "text-cream/20",
                          )}
                        />
                        <div className="text-[8px] font-black uppercase mt-2 opacity-40 tabular-nums">
                          #{staff.id.substring(0, 4)}
                        </div>
                      </div>

                      <div className="p-5 flex-1 space-y-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-0.5">
                            <h3 className="text-lg font-bold text-cream uppercase tracking-tight group-hover:text-blue-400 transition-colors leading-none">
                              {staff.name}
                            </h3>
                            <div className="flex items-center gap-2 pt-1">
                              <Badge
                                variant="outline"
                                className="text-[8px] h-4 font-black uppercase tracking-tighter border-white/10 text-cream/40 rounded-none"
                              >
                                {STAFF_TIER_LABELS[staff.tier].toUpperCase()}
                              </Badge>
                              <span className="text-[9px] font-mono text-gold-muted font-bold uppercase tracking-widest">
                                {STAFF_ROLE_LABELS[staff.role].toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <div className="text-right space-y-1">
                            <div className="text-[8px] font-black uppercase text-cream/20 tracking-widest leading-none">
                              Day Rate
                            </div>
                            <div className="text-sm font-black font-mono text-destructive tracking-tighter">
                              -{formatCurrency(staff.salary)}
                            </div>
                          </div>
                        </div>

                        {staff.traits.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-2 border-t border-white/5">
                            {staff.traits.map((t) => (
                              <div
                                key={t}
                                className="px-2 py-0.5 bg-black/40 border border-white/5 text-[9px] font-mono text-blue-400/60 uppercase tracking-tighter rounded-sm"
                              >
                                {t.toUpperCase()}
                              </div>
                            ))}
                          </div>
                        )}

                        {showHonors(staff.role) && stableG1Wins.length > 0 && (
                          <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                            <Trophy className="h-3 w-3 text-gold" />
                            <span className="text-[9px] font-black uppercase tracking-widest text-cream/40">
                              Honors
                            </span>
                            <div className="flex items-center gap-1.5 font-mono text-[9px] tabular-nums">
                              {(["G1", "G2", "G3"] as const).map((g) => (
                                <span
                                  key={g}
                                  className={cn(
                                    "px-1.5 py-0.5 border rounded-sm",
                                    honorCounts[g] > 0
                                      ? g === "G1"
                                        ? "bg-gold/15 text-gold border-gold/30"
                                        : g === "G2"
                                          ? "bg-purple-500/15 text-purple-300 border-purple-500/30"
                                          : "bg-blue-500/15 text-blue-300 border-blue-500/30"
                                      : "border-white/5 text-cream/20",
                                  )}
                                >
                                  {g} ×{honorCounts[g]}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex justify-end pt-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-3 text-[9px] font-black uppercase border border-white/5 text-destructive hover:bg-destructive/10 rounded-none tracking-widest"
                            onClick={() => handleFire(staff)}
                          >
                            Release
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Right Pillar: Recruitment Pool */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 px-1 border-b border-white/5 pb-2">
            <UserPlus className="h-4 w-4 text-gold" />
            <h3 className="text-xs font-black uppercase tracking-[0.4em] text-cream/60">
              Available to Hire
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {staffPool.map((staff) => (
              <Card
                key={staff.id}
                className="bg-slate-900/40 border-white/5 rounded-none group hover:border-gold/30 transition-all duration-300 relative overflow-hidden shadow-xl"
              >
                <div className="absolute top-0 left-0 w-1 h-full bg-gold/10 group-hover:bg-gold transition-colors" />

                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-6 mb-4">
                    <div className="space-y-1">
                      <h3 className="text-lg font-bold text-cream uppercase tracking-tight group-hover:text-gold transition-colors leading-none">
                        {staff.name}
                      </h3>
                      <div className="flex items-center gap-2 pt-1">
                        <Badge
                          variant="secondary"
                          className="text-[8px] h-4 font-black uppercase tracking-tighter bg-gold/10 text-gold border-gold/20 rounded-none px-2"
                        >
                          {STAFF_TIER_LABELS[staff.tier].toUpperCase()}
                        </Badge>
                        <span className="text-[9px] font-mono text-cream/40 font-bold uppercase tracking-widest">
                          {STAFF_ROLE_LABELS[staff.role].toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[8px] font-black uppercase text-cream/20 tracking-widest mb-1">
                        Weekly Cost
                      </div>
                      <div className="text-lg font-black font-mono text-success tabular-nums tracking-tighter">
                        {formatCurrency(staff.salary)}
                        <span className="text-[10px] opacity-40">/D</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-5 bg-black/20 p-3 border border-white/5">
                    <div className="space-y-1">
                      <div className="text-[8px] font-black uppercase text-gold/40 tracking-widest flex items-center gap-1.5">
                        <Zap className="h-2.5 w-2.5" /> Speciality
                      </div>
                      <div className="text-sm font-black font-mono text-gold-bright">
                        +{Math.round(staff.bonusValue * 100)}%
                      </div>
                    </div>
                    <div className="space-y-1 border-l border-white/5 pl-4">
                      <div className="text-[8px] font-black uppercase text-cream/20 tracking-widest flex items-center gap-1.5">
                        <Activity className="h-2.5 w-2.5" /> Status
                      </div>
                      <div className="text-[10px] font-mono text-cream/60 uppercase">Active</div>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    className="w-full h-10 bg-gold hover:bg-gold-bright text-slate-950 font-black uppercase tracking-[0.2em] rounded-none text-[10px] shadow-lg"
                    onClick={() => handleHire(staff.id)}
                  >
                    Hire
                  </Button>
                </CardContent>
              </Card>
            ))}

            {staffPool.length === 0 && (
              <div className="p-12 text-center border border-dashed border-white/10 bg-black/10">
                <p className="text-[10px] font-mono text-cream/20 uppercase tracking-widest italic">
                  Recruitment cycle currently saturated. Check next frequency.
                </p>
              </div>
            )}
          </div>

          <div className="bg-gold/5 border-2 border-double border-gold/10 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Info className="h-3 w-3 text-gold/60" />
              <span className="text-[9px] font-black uppercase text-gold tracking-widest">
                Procurement Notice
              </span>
            </div>
            <p className="text-[9px] font-mono text-cream/40 uppercase leading-relaxed italic">
              Staff salary is deducted daily from liquid assets. Ensure stable revenue before
              decommissioning budget sectors for elite personnel.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
