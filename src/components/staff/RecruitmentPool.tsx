import { Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/core/common/formatting";
import { STAFF_ROLE_LABELS, STAFF_TIER_LABELS } from "@/core/staff/staffConfig";
import { isOffended, offendedDaysRemaining } from "@/core/staff/staffNegotiation";
import { UserPlus, Zap, Activity, Info } from "lucide-react";

interface PoolMember {
  id: string;
  name: string;
  role: string;
  tier: string;
  salary: number;
  bonusValue: number;
}

interface RecruitmentPoolProps {
  staffPool: PoolMember[];
  day: number;
  onNegotiate: (staffId: string) => void;
}

export function RecruitmentPool({ staffPool, day, onNegotiate }: RecruitmentPoolProps) {
  return (
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
                  <Link to="/staff/$staffId" params={{ staffId: staff.id }}>
                    <h3 className="text-lg font-bold text-cream uppercase tracking-tight group-hover:text-gold transition-colors leading-none hover:underline">
                      {staff.name}
                    </h3>
                  </Link>
                  <div className="flex items-center gap-2 pt-1">
                    <Badge
                      variant="secondary"
                      className="text-[8px] h-4 font-black uppercase tracking-tighter bg-gold/10 text-gold border-gold/20 rounded-none px-2"
                    >
                      {(STAFF_TIER_LABELS as Record<string, string>)[staff.tier].toUpperCase()}
                    </Badge>
                    <span className="text-[9px] font-mono text-cream/40 font-bold uppercase tracking-widest">
                      {(STAFF_ROLE_LABELS as Record<string, string>)[staff.role].toUpperCase()}
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

              {isOffended(staff as any, day) ? (
                <div
                  className="w-full h-10 flex items-center justify-center gap-2 border border-destructive/20 bg-destructive/5 text-destructive/60 text-[9px] font-mono uppercase tracking-widest"
                  title={`Offended — willing to talk again in ${offendedDaysRemaining(staff as any, day)} day(s)`}
                >
                  Not interested · {offendedDaysRemaining(staff as any, day)}d
                </div>
              ) : (
                <Button
                  size="sm"
                  className="w-full h-10 bg-gold hover:bg-gold-bright text-slate-950 font-black uppercase tracking-[0.2em] rounded-none text-[10px] shadow-lg"
                  onClick={() => onNegotiate(staff.id)}
                >
                  Negotiate
                </Button>
              )}
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
  );
}
