import { Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/core/common/formatting";
import { STAFF_ROLE_LABELS, STAFF_TIER_LABELS } from "@/core/staff/staffConfig";
import { cn } from "@/lib/cn";
import { Briefcase, ShieldCheck, Trophy } from "lucide-react";

interface StaffMember {
  id: string;
  name: string;
  role: string;
  tier: string;
  salary: number;
  traits: string[];
}

interface StaffTeamListProps {
  staff: StaffMember[];
  honorCounts: Record<string, number>;
  showHonors: boolean;
  onFire: (staff: StaffMember) => void;
}

export function StaffTeamList({ staff, honorCounts, showHonors, onFire }: StaffTeamListProps) {
  if (staff.length === 0) {
    return (
      <section className="space-y-6">
        <div className="flex items-center gap-3 px-1 border-b border-white/5 pb-2">
          <ShieldCheck className="h-4 w-4 text-blue-400" />
          <h3 className="text-xs font-black uppercase tracking-[0.4em] text-cream/60">Our Team</h3>
        </div>
        <div className="p-20 text-center border-2 border-dashed border-white/5 bg-black/10">
          <Briefcase className="h-16 w-16 mx-auto mb-6 text-cream/5" />
          <p className="font-bold text-cream/40 uppercase tracking-[0.3em] font-[family-name:var(--font-display)]">
            No Retained Staff
          </p>
          <p className="text-[10px] font-mono text-cream/10 uppercase mt-2">
            Team roster is currently vacant. Hire staff from the pool.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center gap-3 px-1 border-b border-white/5 pb-2">
        <ShieldCheck className="h-4 w-4 text-blue-400" />
        <h3 className="text-xs font-black uppercase tracking-[0.4em] text-cream/60">Our Team</h3>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {staff.map((member) => (
          <Card
            key={member.id}
            className="bg-slate-900/40 border-white/5 rounded-none group hover:border-blue-500/30 transition-all duration-300 relative overflow-hidden shadow-xl"
          >
            <div className="absolute top-0 left-0 w-1 h-full bg-blue-500/10 group-hover:bg-blue-500 transition-colors" />
            <CardContent className="p-0">
              <div className="flex">
                <div
                  className={cn(
                    "w-16 flex flex-col items-center justify-center shrink-0 border-r border-white/5",
                    member.tier === "elite"
                      ? "bg-fame/10"
                      : member.tier === "mid"
                        ? "bg-gold/10"
                        : "bg-black/40",
                  )}
                >
                  <Briefcase
                    className={cn(
                      "w-6 h-6",
                      member.tier === "elite"
                        ? "text-fame"
                        : member.tier === "mid"
                          ? "text-gold"
                          : "text-cream/20",
                    )}
                  />
                  <div className="text-[8px] font-black uppercase mt-2 opacity-40 tabular-nums">
                    #{member.id.substring(0, 4)}
                  </div>
                </div>

                <div className="p-5 flex-1 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-0.5">
                      <Link to="/staff/$staffId" params={{ staffId: member.id }}>
                        <h3 className="text-lg font-bold text-cream uppercase tracking-tight group-hover:text-blue-400 transition-colors leading-none hover:underline">
                          {member.name}
                        </h3>
                      </Link>
                      <div className="flex items-center gap-2 pt-1">
                        <Badge
                          variant="outline"
                          className="text-[8px] h-4 font-black uppercase tracking-tighter border-white/10 text-cream/40 rounded-none"
                        >
                          {(STAFF_TIER_LABELS as Record<string, string>)[member.tier].toUpperCase()}
                        </Badge>
                        <span className="text-[9px] font-mono text-gold-muted font-bold uppercase tracking-widest">
                          {(STAFF_ROLE_LABELS as Record<string, string>)[member.role].toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <div className="text-[8px] font-black uppercase text-cream/20 tracking-widest leading-none">
                        Day Rate
                      </div>
                      <div className="text-sm font-black font-mono text-destructive tracking-tighter">
                        -{formatCurrency(member.salary)}
                      </div>
                    </div>
                  </div>

                  {member.traits.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-2 border-t border-white/5">
                      {member.traits.map((t) => (
                        <div
                          key={t}
                          className="px-2 py-0.5 bg-black/40 border border-white/5 text-[9px] font-mono text-blue-400/60 uppercase tracking-tighter rounded-sm"
                        >
                          {t.toUpperCase()}
                        </div>
                      ))}
                    </div>
                  )}

                  {showHonors && (
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
                      onClick={() => onFire(member)}
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
    </section>
  );
}
