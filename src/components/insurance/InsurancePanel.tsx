import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, X, DollarSign } from "lucide-react";
import { useGame } from "@/game/store";
import { calculateDailyPremium } from "@/core/insurance/insuranceTypes";
import { toast } from "sonner";

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
};

interface InsurancePanelProps {
  horseId: string;
}

export function InsurancePanel({ horseId }: InsurancePanelProps) {
  const horse = useGame((s) => s.horseMap.get(horseId));
  const cash = useGame((s) => s.cash);
  const purchaseInsurance = useGame((s) => s.purchaseInsurance);
  const cancelInsurance = useGame((s) => s.cancelInsurance);
  const fileClaim = useGame((s) => s.fileClaim);

  if (!horse || !horse.owned) return null;

  const policy = horse.insurancePolicy;
  const horseValue = horse.lifetimeEarnings * 2 || 10000;

  const handlePurchase = (policyType: "injury_only" | "mortality_only" | "comprehensive") => {
    const result = purchaseInsurance(horseId, policyType);
    if (result.ok) {
      toast.success("Insurance policy purchased", { duration: 3000 });
    } else {
      toast.error(result.reason, { duration: 3000 });
    }
  };

  const handleCancel = () => {
    const result = cancelInsurance(horseId);
    if (result.ok) {
      toast.success("Insurance policy canceled", { duration: 3000 });
    } else {
      toast.error(result.reason, { duration: 3000 });
    }
  };

  const handleFileClaim = () => {
    const result = fileClaim(horseId);
    if (result.ok) {
      toast.success("Insurance claim filed", { duration: 3000 });
    } else {
      toast.error(result.reason, { duration: 3000 });
    }
  };

  return (
    <Card className="bg-slate-900/40 border-white/5 rounded-none shadow-xl border-l-4 border-l-blue-400">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-black uppercase tracking-[0.3em] text-cream flex items-center gap-2">
            <Shield className="h-4 w-4 text-blue-400" /> Insurance
          </CardTitle>
          {policy && policy.type !== "none" && (
            <Badge className="bg-blue-400/10 text-blue-400 border-blue-400/30">Active</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {policy && policy.type !== "none" ? (
          <div className="space-y-3">
            <div className="bg-black/40 border border-white/5 p-3 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-cream/40 uppercase tracking-widest text-[10px] font-black">
                  Type
                </span>
                <span className="font-mono text-cream capitalize">
                  {policy.type.replace("_", " ")}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-cream/40 uppercase tracking-widest text-[10px] font-black">
                  Daily Premium
                </span>
                <span className="font-mono text-gold">{formatCurrency(policy.premiumPerDay)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-cream/40 uppercase tracking-widest text-[10px] font-black">
                  Coverage
                </span>
                <span className="font-mono text-cream">
                  {Math.round(policy.coveragePercent * 100)}%
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-cream/40 uppercase tracking-widest text-[10px] font-black">
                  Active Since
                </span>
                <span className="font-mono text-cream">Day {policy.activeSinceDay}</span>
              </div>
            </div>

            {horse.healthStatus !== "healthy" && (
              <Button
                onClick={handleFileClaim}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-black uppercase tracking-widest text-xs"
              >
                <DollarSign className="h-3 w-3 mr-1" /> File Claim
              </Button>
            )}

            <Button
              onClick={handleCancel}
              variant="outline"
              className="w-full border-red-400/30 text-red-400 hover:bg-red-400/10 font-black uppercase tracking-widest text-xs"
            >
              <X className="h-3 w-3 mr-1" /> Cancel Policy
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-cream/40 italic mb-3">
              No active insurance policy. Protect your investment with coverage.
            </p>
            <div className="grid grid-cols-1 gap-2">
              <Button
                onClick={() => handlePurchase("injury_only")}
                variant="outline"
                className="border-white/10 hover:bg-white/5 font-black uppercase tracking-widest text-xs justify-between"
                disabled={cash < calculateDailyPremium("injury_only", horseValue)}
              >
                <span>Injury Only</span>
                <span className="font-mono text-gold">
                  {formatCurrency(calculateDailyPremium("injury_only", horseValue))}/day
                </span>
              </Button>
              <Button
                onClick={() => handlePurchase("mortality_only")}
                variant="outline"
                className="border-white/10 hover:bg-white/5 font-black uppercase tracking-widest text-xs justify-between"
                disabled={cash < calculateDailyPremium("mortality_only", horseValue)}
              >
                <span>Mortality Only</span>
                <span className="font-mono text-gold">
                  {formatCurrency(calculateDailyPremium("mortality_only", horseValue))}/day
                </span>
              </Button>
              <Button
                onClick={() => handlePurchase("comprehensive")}
                variant="outline"
                className="border-white/10 hover:bg-white/5 font-black uppercase tracking-widest text-xs justify-between"
                disabled={cash < calculateDailyPremium("comprehensive", horseValue)}
              >
                <span>Comprehensive</span>
                <span className="font-mono text-gold">
                  {formatCurrency(calculateDailyPremium("comprehensive", horseValue))}/day
                </span>
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
