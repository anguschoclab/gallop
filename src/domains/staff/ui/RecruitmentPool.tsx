import { Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { formatCurrency } from "@/shared/common/formatting";
import { STAFF_ROLE_LABELS, STAFF_TIER_LABELS } from "@/domains/staff/application/staffFacade";
import { isOffended, offendedDaysRemaining } from "@/domains/staff/application/staffFacade";
import { UserPlus, Zap, Activity, Info } from "lucide-react";
import { formatStaffTrait } from "@/domains/genetics/application/traitLabels";
import { Hint } from "@/shared/ui/Hint";
import { getStaffName } from "@/domains/staff/model/staffPerson";
import type { StaffMember } from "@/domains/staff/model/staffTypes";

interface RecruitmentPoolProps {
  staffPool: StaffMember[];
  day: number;
  onNegotiate: (staffId: string) => void;
  search?: string;
  traitFilter?: string;
}

export function RecruitmentPool({
  staffPool,
  day,
  onNegotiate,
  search = "",
  traitFilter = "all",
}: RecruitmentPoolProps) {
  const filtered = staffPool.filter((staff) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      getStaffName(staff).toLowerCase().includes(q) ||
      (staff.traits ?? []).some((t) => t.toLowerCase().includes(q));
    const matchesTrait = traitFilter === "all" || (staff.traits ?? []).includes(traitFilter);
    return matchesSearch && matchesTrait;
  });

  return (
    <section className="space-y-6">
      <div className="flex items-center gap-3 px-1 border-b border-white/5 pb-2">
        <UserPlus className="h-4 w-4 text-primary" />
        <h3 className="text-xs font-black uppercase tracking-wide text-foreground/60">
          Available to Hire
        </h3>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filtered.map((staff) => (
          <Card
            key={staff.id}
            className="bg-slate-900/40 border-white/5 rounded-none group hover:border-primary/30 transition-all duration-300 relative overflow-hidden shadow-xl"
          >
            <div className="absolute top-0 left-0 w-1 h-full bg-primary/10 group-hover:bg-primary transition-colors" />
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-6 mb-4">
                <div className="space-y-1">
                  <Link to="/staff/$staffId" params={{ staffId: staff.id }}>
                    <h3 className="text-lg font-bold text-foreground uppercase tracking-tight group-hover:text-primary transition-colors leading-none hover:underline">
                      {getStaffName(staff)}
                    </h3>
                  </Link>
                  <div className="flex items-center gap-2 pt-1">
                    <Badge
                      variant="secondary"
                      className="text-[8px] h-4 font-black uppercase tracking-tighter bg-primary/10 text-primary border-primary/20 rounded-none px-2"
                    >
                      {(STAFF_TIER_LABELS as Record<string, string>)[staff.tier].toUpperCase()}
                    </Badge>
                    <span className="text-[9px] font-mono text-foreground/40 font-bold uppercase tracking-wide">
                      {(STAFF_ROLE_LABELS as Record<string, string>)[staff.role].toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[8px] font-black uppercase text-foreground/20 tracking-wide mb-1">
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
                  <div className="text-[8px] font-black uppercase text-primary/40 tracking-wide flex items-center gap-1.5">
                    <Zap className="h-2.5 w-2.5" /> Speciality
                  </div>
                  <div className="text-sm font-black font-mono text-accent-bright">
                    +{Math.round(staff.bonusValue * 100)}%
                  </div>
                </div>
                <div className="space-y-1 border-l border-white/5 pl-4">
                  <div className="text-[8px] font-black uppercase text-foreground/20 tracking-wide flex items-center gap-1.5">
                    <Activity className="h-2.5 w-2.5" /> Status
                  </div>
                  <div className="text-[10px] font-mono text-foreground/60 uppercase">Active</div>
                </div>
              </div>

              {staff.traits && staff.traits.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {staff.traits.map((t) => (
                    <div
                      key={t}
                      className="px-2 py-0.5 bg-black/40 border border-white/5 text-[9px] font-mono text-blue-400/60 uppercase tracking-tighter rounded-sm"
                    >
                      {formatStaffTrait(t).toUpperCase()}
                    </div>
                  ))}
                </div>
              )}

              {isOffended(staff, day) ? (
                <Hint
                  content={`Offended — willing to talk again in ${offendedDaysRemaining(staff, day)} day(s)`}
                >
                  <div className="w-full h-10 flex items-center justify-center gap-2 border border-destructive/20 bg-destructive/5 text-destructive/60 text-[9px] font-mono uppercase tracking-wide">
                    Not interested ·{" "}
                    {offendedDaysRemaining(staff, day)}
                    d
                  </div>
                </Hint>
              ) : (
                <Button
                  size="sm"
                  className="w-full h-10 bg-primary hover:bg-accent-bright text-slate-950 font-black uppercase tracking-wide rounded-none text-[10px] shadow-lg"
                  onClick={() => onNegotiate(staff.id)}
                >
                  Negotiate
                </Button>
              )}
            </CardContent>
          </Card>
        ))}

        {filtered.length === 0 && (
          <div className="p-12 text-center border border-dashed border-white/10 bg-black/10">
            <p className="text-[10px] font-mono text-foreground/20 uppercase tracking-wide">
              Recruitment cycle currently saturated. Check next frequency.
            </p>
          </div>
        )}
      </div>

      <div className="bg-primary/5 border-2 border-double border-primary/10 p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Info className="h-3 w-3 text-primary/60" />
          <span className="text-[9px] font-black uppercase text-primary tracking-wide">
            Recruitment
          </span>
        </div>
        <p className="text-[9px] font-mono text-foreground/40 uppercase leading-relaxed">
          Staff salary is deducted daily from liquid assets. Ensure stable revenue before fire
          lower-tier staff before hiring elite personnel.
        </p>
      </div>
    </section>
  );
}
