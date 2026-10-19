import { Link } from "@tanstack/react-router";
import { useGame } from "@/platform/game/store";
import { saveExists } from "@/platform/game/store/storage";
import { ChevronRight, Play, Sparkles } from "lucide-react";
import heroDashboard from "@/shared/assets/hero-racetrack-dashboard.jpg";
import heroRaces from "@/shared/assets/hero-racetrack-races.jpg";
import heroStable from "@/shared/assets/hero-stable.jpg";
import heroGrandstand from "@/shared/assets/hero-grandstand.jpg";
import { useEffect, useState } from "react";

const BANNERS = [heroGrandstand, heroDashboard, heroRaces, heroStable];

export function StartScreen() {
  const playerProfile = useGame((s) => s.playerProfile);
  const day = useGame((s) => s.day);
  const horses = useGame((s) => s.horses);

  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setIdx((i) => (i + 1) % BANNERS.length), 6500);
    return () => clearInterval(id);
  }, []);

  const hasSave = saveExists.value;

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background text-foreground">
      {/* Crossfading hero banners */}
      <div className="absolute inset-0">
        {BANNERS.map((src, i) => (
          <div
            key={src}
            className="absolute inset-0 bg-cover bg-center transition-opacity duration-[2000ms] ease-in-out"
            style={{
              backgroundImage: `url(${src})`,
              opacity: i === idx ? 1 : 0,
            }}
            aria-hidden
          />
        ))}
        {/* Cinematic gradient wash */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/60 to-background" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/85 via-background/30 to-transparent" />
      </div>

      {/* Top brand bar */}
      <header className="relative z-10 flex items-center justify-between px-8 py-6">
        <div className="flex items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-primary shadow-[0_0_12px_var(--primary)]" />
          <span className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground">
            Stable Manager · Est. 2026
          </span>
        </div>
        <Link
          to="/settings"
          className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground hover:text-primary transition-colors"
        >
          Settings
        </Link>
      </header>

      {/* Main content */}
      <main className="relative z-10 flex min-h-[calc(100vh-88px)] flex-col justify-center px-8 md:px-16 lg:px-24 max-w-3xl">
        <p className="text-[11px] font-mono uppercase tracking-wide text-primary mb-4 animate-fade-in">
          Welcome to the paddock
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-7xl md:text-8xl lg:text-9xl font-bold leading-[0.9] tracking-tight text-foreground mb-6 animate-fade-in">
          Gallop
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-xl mb-10 animate-fade-in">
          Build a dynasty across decades. Breed champions, train through the seasons, and chase the
          classics from the local stakes to the Grand Prix.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 max-w-md animate-fade-in">
          {hasSave ? (
            <>
              <Link
                to="/"
                className="h-14 inline-flex items-center justify-center px-8 bg-primary hover:bg-primary/90 text-slate-950 font-black uppercase tracking-[0.15em] text-sm shadow-[0_8px_30px_var(--border)] group transition-colors"
              >
                <Play className="w-4 h-4 mr-2 fill-current" />
                Continue
                <ChevronRight className="w-4 h-4 ml-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
              <Link
                to="/new-game"
                className="h-14 inline-flex items-center justify-center px-8 bg-transparent border border-foreground/20 hover:bg-foreground/5 hover:border-foreground/40 text-foreground font-bold uppercase tracking-[0.15em] text-xs transition-colors"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                New Game
              </Link>
            </>
          ) : (
            <Link
              to="/new-game"
              className="h-14 inline-flex items-center justify-center px-8 bg-primary hover:bg-primary/90 text-slate-950 font-black uppercase tracking-[0.15em] text-sm shadow-[0_8px_30px_var(--border)] group transition-colors"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Begin Your Stable
              <ChevronRight className="w-4 h-4 ml-3 group-hover:translate-x-1 transition-transform" />
            </Link>
          )}
        </div>

        {/* Save snapshot */}
        {hasSave && (
          <div className="mt-12 pt-6 border-t border-foreground/10 max-w-md animate-fade-in">
            <p className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground mb-3">
              Last Save
            </p>
            <div className="grid grid-cols-3 gap-6">
              <div>
                <div className="text-2xl font-bold text-foreground tabular-nums">{day}</div>
                <div className="text-[9px] font-mono uppercase tracking-wide text-muted-foreground mt-1">
                  Day
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground tabular-nums">
                  {Object.keys(horses).length}
                </div>
                <div className="text-[9px] font-mono uppercase tracking-wide text-muted-foreground mt-1">
                  Horses
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary truncate">
                  {playerProfile?.stableName ?? "—"}
                </div>
                <div className="text-[9px] font-mono uppercase tracking-wide text-muted-foreground mt-1">
                  Stable
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Banner indicator dots */}
      <div className="absolute bottom-8 right-8 z-10 flex gap-2">
        {BANNERS.map((_, i) => (
          <button
            key={i}
            onClick={() => setIdx(i)}
            className={`h-2 rounded-full transition-all duration-300 ease-out ${
              i === idx ? "w-8 bg-primary" : "w-3 bg-primary/30 hover:bg-primary/50"
            }`}
            aria-label={`Show banner ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
