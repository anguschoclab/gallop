import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "@tanstack/react-router";
import { useGame } from "@/game/store";
import { NewsContent } from "@/components/narrative/NewsContent";
import { cn } from "@/lib/cn";
import { Newspaper, ChevronRight } from "lucide-react";

interface NewsItem {
  id: string;
  category: string;
  headline: string;
  body: string;
  importance: "high" | "normal";
  entityLinks?: Array<{
    entityId: string;
    entityType: string;
    start: number;
    end: number;
  }>;
}

export function GallopGazette() {
  const day = useGame((s) => s.day);
  const news = useGame((s) => s.news);

  return (
    <Card className="border-gold bg-[#f4f1ea] text-[#2c2c2c] overflow-hidden shadow-2xl ring-1 ring-gold/20 group">
      <CardHeader className="py-3 px-6 border-b-2 border-double border-[#2c2c2c] flex flex-row items-center justify-between bg-[#ece8df]">
        <div className="flex items-center gap-3">
          <Newspaper className="h-5 w-5 animate-in fade-in slide-in-from-left duration-500" />
          <CardTitle className="text-2xl font-black uppercase tracking-tighter font-[family-name:var(--font-display)] pt-1">
            The Gallop Gazette
          </CardTitle>
        </div>
        <div className="text-[10px] font-black uppercase tracking-widest border-l border-[#2c2c2c] pl-3 h-full tabular-nums">
          Edition {day}
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative">
          {news && news.length > 0 ? (
            news.slice(0, 2).map((item, i) => (
              <div
                key={item.id}
                className={cn(
                  "space-y-2",
                  i === 0 &&
                    "md:after:content-[''] md:after:absolute md:after:left-1/2 md:after:top-0 md:after:bottom-0 md:after:w-[1px] md:after:bg-[#d3d3d3] md:pr-4",
                )}
              >
                <Badge className="bg-[#2c2c2c] text-white rounded-none text-[9px] font-bold h-4 px-1.5 uppercase tracking-widest">
                  {item.category}
                </Badge>
                <h3
                  className={cn(
                    "font-extrabold leading-[1.05] tracking-tighter text-[#1a1a1a] font-[family-name:var(--font-display)] group-hover:text-gold-dark transition-colors",
                    item.importance === "high" ? "text-2xl" : "text-xl",
                  )}
                >
                  <NewsContent
                    text={item.headline}
                    links={item.entityLinks}
                    linkClassName="text-[#1a1a1a] hover:text-gold-dark border-b border-dotted border-[#1a1a1a]/40"
                  />
                </h3>
                <p className="text-sm line-clamp-3 leading-relaxed opacity-90 font-serif italic text-[#333]">
                  <NewsContent
                    text={item.body}
                    links={item.entityLinks}
                    linkClassName="text-[#333] hover:text-gold-dark border-b border-dotted border-[#333]/40"
                  />
                </p>
              </div>
            ))
          ) : (
            <div className="col-span-2 text-center py-4 text-sm italic opacity-40 font-serif uppercase tracking-widest">
              No headlines in this morning's wire.
            </div>
          )}
        </div>
        <div className="mt-6 pt-3 border-t border-[#d3d3d3] flex justify-between items-center">
          <div className="text-[10px] uppercase font-bold tracking-widest opacity-60">
            Global Racing Network • AP Wire
          </div>
          <Link
            to="/gazette"
            className="text-xs font-black uppercase hover:underline flex items-center gap-1 group/link"
          >
            Full Coverage{" "}
            <ChevronRight className="h-3 w-3 group-hover/link:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
