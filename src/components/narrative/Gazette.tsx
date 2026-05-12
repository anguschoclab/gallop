import React from "react";
import { useGame as useGameStore } from "@/game/store";
import type { NewsItem } from "@/core/narrative/newsTypes";
import { NewsContent } from "./NewsContent";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Newspaper, ChevronRight, Archive, ShieldCheck } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import "./Gazette.css";

export const Gazette: React.FC = () => {
  const { news, day } = useGameStore();

  const highImportance = news.filter((n) => n.importance === "high");
  const mediumImportance = news.filter((n) => n.importance === "medium");
  const lowImportance = news.filter((n) => n.importance === "low");

  const mainNews = [...highImportance, ...mediumImportance].slice(0, 8);
  const sideNews = lowImportance.slice(0, 12);

  return (
    <div className="space-y-8 pb-20 animate-fade-in">
      {/* Gazette Header - Industrial Command Style */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-gold/20 pb-6">
        <div>
          <div className="flex items-center gap-2 text-gold-bright uppercase tracking-[0.2em] font-[family-name:var(--font-display)] text-xs font-bold mb-1 opacity-60">
            <Newspaper className="h-3.5 w-3.5" />
            Global Information Network
          </div>
          <h1 className="text-4xl font-bold tracking-tighter text-cream font-[family-name:var(--font-display)]">
            The Gallop Gazette
          </h1>
          <div className="flex items-center gap-3 mt-2 font-mono text-[10px] uppercase tracking-widest text-cream/40">
            <span>Established Year 1</span>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <span>
              Edition: <span className="text-gold">D{String(day).padStart(3, "0")}</span>
            </span>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <span>
              Status: <span className="text-success font-black">Published</span>
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          <Badge
            variant="outline"
            className="border-gold/30 text-gold-muted bg-gold/5 font-mono text-[10px] uppercase tracking-widest px-3 py-1 h-8 rounded-none"
          >
            PRICE: TWO_PENCE
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Main Column - Primary News */}
        <main className="lg:col-span-8 space-y-6">
          {mainNews.length > 0 ? (
            mainNews.map((item, index) => <NewsArticle key={`${item.id}-${index}`} item={item} />)
          ) : (
            <div className="p-32 text-center border-2 border-dashed border-white/5 bg-black/10">
              <Archive className="h-16 w-16 mx-auto mb-6 text-cream/5" />
              <p className="font-bold text-cream/40 uppercase tracking-[0.3em] font-[family-name:var(--font-display)]">
                Quiet Day at the Tracks
              </p>
              <p className="text-[10px] font-mono text-cream/10 uppercase mt-2">
                The racing world is catching its breath. No major results reported today.
              </p>
            </div>
          )}
        </main>

        {/* Sidebar - Local Snippets & Classifieds */}
        <aside className="lg:col-span-4 space-y-8 lg:sticky lg:top-6">
          <section className="space-y-4">
            <div className="flex items-center gap-2 mb-2 px-1 text-gold/60 uppercase tracking-[0.3em] font-black text-[10px]">
              Sector Briefs
            </div>
            <Card className="bg-slate-900/40 border-white/5 rounded-none shadow-xl border-l-2 border-l-gold/40">
              <CardContent className="p-0">
                <div className="divide-y divide-white/5">
                  {sideNews.length > 0 ? (
                    sideNews.map((item, index) => (
                      <div
                        key={`${item.id}-${index}`}
                        className="p-4 space-y-2 hover:bg-white/[0.02] transition-colors group"
                      >
                        <div className="flex items-center justify-between">
                          <Badge
                            variant="outline"
                            className="text-[8px] h-3.5 px-1 font-black uppercase border-white/10 text-cream/30 rounded-none tracking-widest"
                          >
                            {item.category}
                          </Badge>
                          <span className="text-[9px] font-mono text-cream/10">
                            D{String(item.day).padStart(3, "0")}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-cream/60 group-hover:text-gold transition-colors leading-tight uppercase tracking-tight">
                          <NewsContent text={item.headline} links={item.entityLinks} />
                        </h4>
                        <p className="text-[10px] text-cream/30 line-clamp-2 leading-relaxed">
                          <NewsContent text={item.body} links={item.entityLinks} />
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="p-12 text-center text-[10px] font-mono text-cream/20 uppercase tracking-widest italic">
                      Stable conditions across all regional tracks.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="bg-gold/5 border-2 border-double border-gold/10 p-6 space-y-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none">
              <ShieldCheck className="h-24 w-24 -rotate-12" />
            </div>
            <h3 className="text-xs font-black uppercase tracking-[0.4em] text-gold border-b border-gold/20 pb-2">
              Classifieds
            </h3>
            <div className="space-y-3 relative z-10">
              <div className="p-3 bg-black/40 border border-white/5 space-y-1">
                <div className="text-[8px] font-black text-gold/40 uppercase tracking-widest">
                  Real Estate
                </div>
                <p className="text-[10px] text-cream/60 leading-tight italic uppercase">
                  Looking for prime pasture? Contact the Kentucky Syndicate for luxury acreage.
                </p>
              </div>
              <div className="p-3 bg-black/40 border border-white/5 space-y-1">
                <div className="text-[8px] font-black text-gold/40 uppercase tracking-widest">
                  Personnel
                </div>
                <p className="text-[10px] text-cream/60 leading-tight italic uppercase">
                  Elite exercise riders available for short-term seasonal contracts in the UK.
                </p>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
};

const NewsArticle: React.FC<{ item: NewsItem }> = ({ item }) => {
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
        <Badge
          className={cn(
            "rounded-none font-black text-[9px] tracking-widest uppercase h-5 px-2",
            isHigh ? "bg-gold text-slate-950" : "bg-slate-800 text-cream/60",
          )}
        >
          {item.category}
        </Badge>
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
};
