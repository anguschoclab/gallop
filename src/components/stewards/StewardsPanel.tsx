import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, XCircle, DollarSign, Clock } from "lucide-react";
import { useGame } from "@/game/store";
import {
  formatInquiryType,
  formatInquiryOutcome,
  type StewardsInquiry,
} from "@/core/stewards/stewardTypes";
import { cn } from "@/lib/cn";

interface StewardsPanelProps {
  horseId: string;
}

export function StewardsPanel({ horseId }: StewardsPanelProps) {
  const races = useGame((s) => s.races);
  const day = useGame((s) => s.day);

  // Find all inquiries involving this horse
  let inquiries: StewardsInquiry[] = [];
  for (const race of Object.values(races)) {
    if (race.inquiries) {
      for (const inquiry of race.inquiries) {
        if (inquiry.accusedHorseId === horseId || inquiry.reportingHorseId === horseId) {
          inquiries.push(inquiry);
        }
      }
    }
  }

  // Sort by day (most recent first)
  inquiries = [...inquiries].sort((a, b) => b.day - a.day);

  if (inquiries.length === 0) {
    return null;
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-3 w-3 text-yellow-400" />;
      case "reviewing":
        return <AlertTriangle className="h-3 w-3 text-orange-400" />;
      case "resolved":
        return <CheckCircle className="h-3 w-3 text-green-400" />;
      case "dismissed":
        return <XCircle className="h-3 w-3 text-gray-400" />;
      default:
        return null;
    }
  };

  const getOutcomeColor = (outcome?: string) => {
    switch (outcome) {
      case "no_action":
        return "text-green-400";
      case "warning":
        return "text-yellow-400";
      case "fine":
        return "text-orange-400";
      case "suspension":
        return "text-red-400";
      case "disqualification":
      case "dq_placed_last":
        return "text-red-500 font-black";
      default:
        return "text-gray-400";
    }
  };

  return (
    <Card className="bg-slate-900/40 border-white/5 rounded-none shadow-xl border-l-4 border-l-orange-400">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-black uppercase tracking-[0.3em] text-cream flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-400" /> Stewards Inquiries
          </CardTitle>
          <Badge className="bg-orange-400/10 text-orange-400 border-orange-400/30">
            {inquiries.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {inquiries.map((inquiry) => (
          <div key={inquiry.id} className="bg-black/40 border border-white/5 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getStatusIcon(inquiry.status)}
                <span className="text-[10px] font-mono text-cream/40 uppercase">
                  Day {inquiry.day}
                </span>
              </div>
              <Badge
                variant="outline"
                className={cn(
                  "text-[9px] font-black uppercase tracking-wider border-white/10",
                  inquiry.status === "pending" &&
                    "bg-yellow-400/10 text-yellow-400 border-yellow-400/30",
                  inquiry.status === "resolved" &&
                    "bg-green-400/10 text-green-400 border-green-400/30",
                )}
              >
                {inquiry.status}
              </Badge>
            </div>

            <div className="space-y-1">
              <div className="text-xs font-bold text-cream">{formatInquiryType(inquiry.type)}</div>
              <div className="text-[10px] text-cream/60 italic">{inquiry.description}</div>
            </div>

            {inquiry.outcome && (
              <div className="pt-2 border-t border-white/5 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-cream/40 uppercase tracking-wide font-black">
                    Outcome
                  </span>
                  <span
                    className={cn(
                      "text-[10px] font-mono font-black",
                      getOutcomeColor(inquiry.outcome),
                    )}
                  >
                    {formatInquiryOutcome(inquiry.outcome)}
                  </span>
                </div>
                {inquiry.fineAmount && (
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-cream/40 uppercase tracking-wide font-black flex items-center gap-1">
                      <DollarSign className="h-2.5 w-2.5" /> Fine
                    </span>
                    <span className="text-[10px] font-mono text-gold">
                      ${inquiry.fineAmount.toLocaleString()}
                    </span>
                  </div>
                )}
                {inquiry.suspensionDays && (
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-cream/40 uppercase tracking-wide font-black">
                      Suspension
                    </span>
                    <span className="text-[10px] font-mono text-cream">
                      {inquiry.suspensionDays} days
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
