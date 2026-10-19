import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { useGame } from "@/platform/game/store";
import { Activity } from "lucide-react";
import { NewsContent } from "@/domains/narrative/ui/NewsContent";
import { DASHBOARD_NEWS_FEED_LIMIT } from "@/shared/constants/dashboardConstants";

export function NewsFeedWidget() {
  const log = useGame((s) => s.log);

  return (
    <Card className="lg:col-span-8 border-border bg-slate-900/40 border-t-2 border-t-primary/40">
      <CardHeader className="py-3 border-b border-white/5 flex flex-row items-center justify-between bg-black/20">
        <CardTitle className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
          News Feed
        </CardTitle>
        <Activity className="h-3 w-3 text-muted-foreground/40 animate-pulse" />
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-white/5 max-h-[300px] overflow-y-auto custom-scrollbar">
          {log.length > 0 ? (
            log.slice(0, DASHBOARD_NEWS_FEED_LIMIT).map((l, i) => (
              <div
                key={i}
                className="px-6 py-3 flex items-start gap-5 hover:bg-white/[0.02] transition-colors group"
              >
                <div className="flex flex-col items-center pt-0.5">
                  <span className="text-[9px] font-mono text-primary/40 group-hover:text-primary transition-colors leading-none uppercase tracking-tighter">
                    Day
                  </span>
                  <span className="text-xs font-mono font-bold text-primary/60 group-hover:text-primary transition-colors tabular-nums leading-tight">
                    {String(l.day).padStart(3, "0")}
                  </span>
                </div>
                <span className="text-sm text-foreground/80 font-[family-name:var(--font-body)] leading-relaxed flex-1 pt-0.5">
                  <NewsContent text={l.text} />
                </span>
              </div>
            ))
          ) : (
            <div className="py-12 text-center text-xs text-muted-foreground italic opacity-40">
              No activity recorded on current frequency.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
