import { useNavigate } from "@tanstack/react-router";
import { JockeyCard } from "./JockeyCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserCheck, Users } from "lucide-react";

interface JockeyRosterTabsProps {
  myJockeys: any[];
  market: any[];
  filterList: (list: any[]) => any[];
  onRelease: (jockeyId: string) => void;
  onHire: (jockeyId: string) => void;
}

export function JockeyRosterTabs({
  myJockeys,
  market,
  filterList,
  onRelease,
  onHire,
}: JockeyRosterTabsProps) {
  const navigate = useNavigate();

  return (
    <main className="lg:col-span-9 space-y-8">
      <Tabs defaultValue="my" className="w-full space-y-6">
        <div className="flex items-center justify-between bg-slate-900/40 p-1 border border-white/5 rounded-lg">
          <TabsList className="bg-transparent h-10 gap-2">
            <TabsTrigger
              value="my"
              className="gap-2 uppercase text-[10px] font-black tracking-[0.2em] data-[state=active]:bg-blue-500 data-[state=active]:text-slate-950 h-full px-6 transition-all"
            >
              <UserCheck className="w-3.5 h-3.5" />
              My Jockeys
            </TabsTrigger>
            <TabsTrigger
              value="market"
              className="gap-2 uppercase text-[10px] font-black tracking-[0.2em] data-[state=active]:bg-gold data-[state=active]:text-slate-950 h-full px-6 transition-all"
            >
              <Users className="w-3.5 h-3.5" />
              Available
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent
          value="my"
          className="mt-0 animate-in fade-in slide-in-from-bottom-2 duration-300 focus-visible:outline-none"
        >
          {myJockeys.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filterList(myJockeys).map((j: any) => (
                <JockeyCard
                  key={j.id}
                  jockey={j}
                  isRetained
                  actionLabel="Release"
                  onAction={() => onRelease(j.id)}
                  onClick={() => (window.location.href = `/jockey/${j.id}`)}
                />
              ))}
            </div>
          ) : (
            <div className="p-32 text-center border-2 border-dashed border-white/5 bg-black/10">
              <Users className="h-16 w-16 mx-auto mb-6 text-cream/5" />
              <p className="font-bold text-cream/40 uppercase tracking-[0.3em] font-[family-name:var(--font-display)]">
                No Jockeys Signed
              </p>
              <p className="text-[10px] font-mono text-cream/10 uppercase mt-2">
                Browse the market to hire a jockey.
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent
          value="market"
          className="mt-0 animate-in fade-in slide-in-from-bottom-2 duration-300 focus-visible:outline-none"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filterList(market).map((j: any) => (
              <JockeyCard
                key={j.id}
                jockey={j}
                onAction={() => onHire(j.id)}
                actionLabel="Sign"
                onClick={() =>
                  navigate({ to: "/jockey/$jockeyId", params: { jockeyId: j.id } })
                }
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </main>
  );
}
