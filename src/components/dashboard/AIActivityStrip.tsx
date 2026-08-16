import { Link } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, ArrowRight } from "lucide-react";
import { cn } from "@/lib/cn";
import type { NewsItem, NewsCategory } from "@/services/narrative/newsTypes";

interface AIActivityStripProps {
  news: NewsItem[];
}

const NPC_CATEGORIES: NewsCategory[] = ["stable", "market", "racing"];

export function AIActivityStrip({ news }: AIActivityStripProps) {
  const filtered = news.filter((n) => NPC_CATEGORIES.includes(n.category));
  const display = filtered.slice(0, 5);

  return (
    <Card className="bg-slate-900/40 border-white/5 rounded-none shadow-xl border-l-4 border-l-emerald-400">
      <CardHeader className="bg-black/20 border-b border-white/5">
        <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-cream/40 flex items-center gap-2">
          <Activity className="h-3 w-3 text-emerald-400" /> AI Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3">
        {display.length === 0 ? (
          <div className="py-6 text-center text-[10px] font-mono text-cream/20 uppercase tracking-widest italic">
            No recent AI activity to report.
          </div>
        ) : (
          <div className="space-y-2">
            {display.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-2 p-2 hover:bg-white/[0.02] transition-colors rounded-sm"
              >
                <div
                  data-testid="importance-dot"
                  className={cn(
                    "w-1.5 h-1.5 rounded-full flex-shrink-0",
                    item.importance === "high"
                      ? "bg-red-400"
                      : item.importance === "medium"
                        ? "bg-gold"
                        : "bg-cream/20",
                  )}
                />
                <Badge
                  variant="outline"
                  className="text-[7px] font-black uppercase tracking-widest border-white/10 text-cream/40 rounded-none flex-shrink-0"
                >
                  {item.category}
                </Badge>
                <span className="text-[10px] font-bold text-cream/70 leading-tight flex-1 truncate">
                  {item.headline}
                </span>
                <span className="text-[8px] font-mono text-cream/20 flex-shrink-0">
                  Day {item.day}
                </span>
              </div>
            ))}
            <Link
              to="/gazette"
              className="flex items-center justify-end gap-1 text-[9px] font-mono uppercase tracking-widest text-emerald-400/60 hover:text-emerald-400 transition-colors pt-1"
            >
              View All <ArrowRight className="h-2.5 w-2.5" />
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
