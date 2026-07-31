import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NewsContent } from "./NewsContent";
import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import type { NewsItem } from "@/services/narrative/newsTypes";

interface NewsArticleProps {
  item: NewsItem;
}

export function NewsArticle({ item }: NewsArticleProps) {
  const isHigh = item.importance === "high";

  return (
    <Card
      className={cn(
        "border-white/5 rounded-none shadow-2xl relative overflow-hidden group",
        isHigh
          ? "bg-slate-900/60 border-l-4 border-l-gold"
          : "bg-slate-900/20 border-l-4 border-l-slate-700",
      )}
    >
      <CardHeader className="pb-3 border-b border-white/5 flex flex-row items-center justify-between bg-black/20">
        <div className="flex items-center gap-2">
          <Badge
            className={cn(
              "rounded-none font-black text-[9px] tracking-widest uppercase h-5 px-2",
              isHigh ? "bg-gold text-slate-950" : "bg-slate-800 text-cream/60",
            )}
          >
            {item.category}
          </Badge>
          {item.partNumber && item.totalParts && item.totalParts > 1 && (
            <Badge className="rounded-none font-black text-[9px] tracking-widest uppercase h-5 px-2 bg-gold/30 text-gold-bright border border-gold/20">
              Part {item.partNumber}/{item.totalParts}
            </Badge>
          )}
        </div>
        <span className="text-[10px] font-mono text-cream/20">
          D{String(item.day).padStart(3, "0")}
        </span>
      </CardHeader>
      <CardContent className={cn("p-8", isHigh ? "space-y-4" : "space-y-3")}>
        <h2
          className={cn(
            "font-black tracking-tighter text-cream font-[family-name:var(--font-display)] uppercase group-hover:text-gold transition-colors",
            isHigh ? "text-3xl" : "text-xl",
          )}
        >
          <NewsContent text={item.headline} links={item.entityLinks} />
        </h2>
        <div
          className={cn(
            "text-cream/60 font-serif leading-relaxed italic",
            isHigh ? "text-base" : "text-sm",
          )}
        >
          <NewsContent text={item.body} links={item.entityLinks} />
        </div>

        <div className="pt-4 flex justify-between items-center border-t border-white/5">
          <div className="text-[9px] font-black uppercase text-cream/20 tracking-widest">
            Source: Internal Frequency 1.09
          </div>
          <Link
            to="/gazette"
            className="text-[10px] font-black text-gold/40 hover:text-gold transition-colors uppercase tracking-widest flex items-center gap-1 group/link"
          >
            Latest News{" "}
            <ChevronRight className="h-3 w-3 group-hover/link:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
