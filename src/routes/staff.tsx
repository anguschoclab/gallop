import { createFileRoute } from "@tanstack/react-router";
import { useGame } from "@/game/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/formatting";
import { STAFF_ROLE_LABELS, STAFF_TIER_LABELS } from "@/core/staff/staffConfig";
import { Users, Briefcase, Zap, HeartPulse, UserPlus, X, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/staff")({
  component: StaffManagement,
});

function StaffManagement() {
  const { hiredStaff, staffPool, enqueueIntent } = useGame();

  // Filter for player's hired staff (stableId === "")
  const myStaff = hiredStaff?.filter((s) => s.stableId === "") ?? [];

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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-cream font-[family-name:var(--font-display)]">
          Stable Staff
        </h1>
        <p className="text-cream-muted">
          Manage your specialized team to improve horse performance and health.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gold font-[family-name:var(--font-display)] flex items-center gap-2">
            <Users className="w-5 h-5" /> Current Team
          </h2>
          {myStaff.length === 0 ? (
            <Card className="border-dashed border-gold-muted/50 bg-transparent">
              <CardContent className="py-8 text-center">
                <p className="text-cream-muted italic">You haven't hired any staff yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {myStaff.map((staff) => (
                <Card key={staff.id} className="border-gold-muted overflow-hidden">
                  <div className="flex">
                    <div
                      className={cn(
                        "w-12 flex items-center justify-center shrink-0",
                        staff.tier === "elite"
                          ? "bg-fame"
                          : staff.tier === "mid"
                            ? "bg-gold"
                            : "bg-t700",
                      )}
                    >
                      <Briefcase className="w-6 h-6 text-t950" />
                    </div>
                    <CardContent className="p-4 flex-1 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-cream">{staff.name}</h3>
                          <Badge variant="outline" className="text-[10px] h-4 px-1">
                            {STAFF_TIER_LABELS[staff.tier]}
                          </Badge>
                        </div>
                        <p className="text-xs text-gold font-medium uppercase tracking-wider">
                          {STAFF_ROLE_LABELS[staff.role]}
                        </p>
                        <p className="text-xs text-cream-muted mt-1">
                          Salary: {formatCurrency(staff.salary)}/day
                        </p>
                        {staff.traits.length > 0 && (
                          <div className="flex gap-1 mt-2">
                            {staff.traits.map((t) => (
                              <Badge key={t} className="bg-t800 text-[9px] text-cream-muted">
                                {t}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => handleFire(staff)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </CardContent>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gold font-[family-name:var(--font-display)] flex items-center gap-2">
            <UserPlus className="w-5 h-5" /> Recruitment Pool
          </h2>
          <div className="grid grid-cols-1 gap-3">
            {staffPool.map((staff) => (
              <Card
                key={staff.id}
                className="border-gold-muted/50 hover:border-gold transition-colors"
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-cream">{staff.name}</h3>
                      <Badge variant="secondary" className="text-[10px] h-4 px-1">
                        {STAFF_TIER_LABELS[staff.tier]}
                      </Badge>
                    </div>
                    <p className="text-xs text-gold font-medium uppercase tracking-wider">
                      {STAFF_ROLE_LABELS[staff.role]}
                    </p>
                    <div className="flex items-center gap-4 mt-1">
                      <p className="text-[10px] text-cream-muted flex items-center gap-1">
                        <Zap className="w-3 h-3 text-gold" /> Bonus: +
                        {Math.round(staff.bonusValue * 100)}%
                      </p>
                      <p className="text-[10px] text-cream-muted flex items-center gap-1">
                        <DollarSign className="w-3 h-3 text-success" />{" "}
                        {formatCurrency(staff.salary)}/day
                      </p>
                    </div>
                  </div>
                  <Button size="sm" onClick={() => handleHire(staff.id)}>
                    Hire
                  </Button>
                </CardContent>
              </Card>
            ))}
            {staffPool.length === 0 && (
              <p className="text-sm text-cream-muted italic text-center py-4">
                No candidates available today. Check back tomorrow.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
