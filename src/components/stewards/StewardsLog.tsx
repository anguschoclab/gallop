import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, XCircle, Clock, Scale } from "lucide-react";
import { useStewardsLog, type UseStewardsLogFilters } from "@/hooks/stewards/useStewardsLog";
import {
  formatInquiryType,
  formatInquiryOutcome,
  type InquiryOutcome,
} from "@/core/stewards/stewardTypes";
import { cn } from "@/lib/cn";

const OUTCOME_FILTERS: (InquiryOutcome | "all")[] = [
  "all",
  "no_action",
  "warning",
  "fine",
  "disqualification",
  "dq_placed_last",
];

function getStatusIcon(status: string): ReactNode {
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
}

export function StewardsLog() {
  const [outcomeFilter, setOutcomeFilter] = useState<InquiryOutcome | "all">("all");

  const filters: UseStewardsLogFilters | undefined =
    outcomeFilter === "all" ? undefined : { outcome: outcomeFilter };

  const { inquiries, summary } = useStewardsLog(filters);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Scale className="h-5 w-5 text-cream" />
        <h1 className="text-3xl font-bold tracking-tight text-cream font-[family-name=var(--font-display)]">
          Stewards Log
        </h1>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-3">
        <Card className="bg-slate-900/40 border-white/5">
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-black tabular-nums text-cream">{summary.total}</div>
            <div className="text-[10px] uppercase text-cream-muted">Total</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/40 border-white/5">
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-black tabular-nums text-green-400">
              {summary.resolved}
            </div>
            <div className="text-[10px] uppercase text-cream-muted">Resolved</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/40 border-white/5">
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-black tabular-nums text-yellow-400">
              {summary.pending}
            </div>
            <div className="text-[10px] uppercase text-cream-muted">Pending</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/40 border-white/5">
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-black tabular-nums text-red-400">
              {summary.disqualifications}
            </div>
            <div className="text-[10px] uppercase text-cream-muted">DQs</div>
          </CardContent>
        </Card>
      </div>

      {/* Outcome filters */}
      <div className="flex flex-wrap gap-2">
        {OUTCOME_FILTERS.map((of) => (
          <button
            key={of}
            onClick={() => setOutcomeFilter(of)}
            className={cn(
              "px-3 py-1 text-xs font-bold uppercase tracking-wide border transition-colors",
              outcomeFilter === of
                ? "bg-cream/10 border-cream/30 text-cream"
                : "bg-transparent border-white/5 text-cream-muted hover:text-cream",
            )}
          >
            {of === "all" ? "All" : formatInquiryOutcome(of)}
          </button>
        ))}
      </div>

      {/* Inquiry timeline */}
      {inquiries.length === 0 ? (
        <Card className="bg-slate-900/40 border-white/5">
          <CardContent className="p-8 text-center text-cream-muted">
            No inquiries recorded yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {inquiries.map((inquiry) => (
            <Card key={inquiry.id} className="bg-slate-900/40 border-white/5">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(inquiry.status)}
                    <Badge variant="outline" className="text-[10px] uppercase">
                      {formatInquiryType(inquiry.type)}
                    </Badge>
                    {inquiry.outcome && (
                      <Badge
                        className={cn(
                          "text-[10px] uppercase",
                          inquiry.outcome === "no_action"
                            ? "bg-green-400/10 text-green-400"
                            : inquiry.outcome === "disqualification" ||
                                inquiry.outcome === "dq_placed_last"
                              ? "bg-red-400/10 text-red-400"
                              : "bg-yellow-400/10 text-yellow-400",
                        )}
                      >
                        {formatInquiryOutcome(inquiry.outcome)}
                      </Badge>
                    )}
                  </div>
                  <span className="text-[10px] text-cream-muted tabular-nums">
                    Day {inquiry.day}
                  </span>
                </div>
                <p className="text-sm text-cream">{inquiry.description}</p>
                <div className="flex items-center gap-3 text-[10px] text-cream-muted">
                  <Link
                    to="/race/$raceId"
                    params={{ raceId: inquiry.raceId }}
                    className="text-cream-muted hover:text-cream underline"
                  >
                    View Race
                  </Link>
                  {inquiry.fineAmount !== undefined && (
                    <span className="text-yellow-400">
                      Fine: ${inquiry.fineAmount.toLocaleString()}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
