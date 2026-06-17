import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Baby, ArrowUp } from "lucide-react";
import { deriveFoalInheritance } from "@/core/horse/foal-inheritance";
import type { Horse } from "@/core/horse/types";
import { cn } from "@/lib/cn";

const LEAN_LABEL: Record<string, string> = {
  sire: "← from sire",
  dam: "from dam →",
  even: "balanced",
  transgressive: "exceeds both",
};

export function FoalInheritancePanel({
  foal,
  sire,
  dam,
}: {
  foal: Horse;
  sire?: Horse;
  dam?: Horse;
}) {
  const rows = deriveFoalInheritance(foal, sire, dam);
  if (rows.length === 0) return null;

  return (
    <Card className="bg-slate-900/40 border-white/5 rounded-none border-l-4 border-l-gold">
      <CardHeader className="pb-2 border-b border-white/5">
        <CardTitle className="text-[10px] font-black uppercase tracking-widest text-cream/40 flex items-center gap-2">
          <Baby className="h-3.5 w-3.5 text-gold" />
          What {foal.name} Inherited
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-4 gap-y-2 text-sm items-center">
          <span className="text-[10px] uppercase tracking-widest text-cream/30">Stat</span>
          <span className="text-[10px] uppercase tracking-widest text-cream/30 text-right">
            Sire
          </span>
          <span className="text-[10px] uppercase tracking-widest text-cream/30 text-right">
            Foal
          </span>
          <span className="text-[10px] uppercase tracking-widest text-cream/30 text-right">
            Dam
          </span>
          <span className="text-[10px] uppercase tracking-widest text-cream/30 text-right">
            Lean
          </span>
          {rows.map((r) => (
            <FoalRow {...r} key={r.key} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function FoalRow(r: ReturnType<typeof deriveFoalInheritance>[number]) {
  return (
    <>
      <span className="text-cream/70">{r.label}</span>
      <span className="font-mono tabular-nums text-right text-cream/50">{r.sire}</span>
      <span className="font-mono tabular-nums text-right text-cream font-bold">{r.foal}</span>
      <span className="font-mono tabular-nums text-right text-cream/50">{r.dam}</span>
      <span
        className={cn(
          "text-[10px] uppercase tracking-wide text-right flex items-center justify-end gap-1",
          r.leansToward === "transgressive" ? "text-gold" : "text-cream/40",
        )}
      >
        {r.leansToward === "transgressive" && <ArrowUp className="h-3 w-3" />}
        {LEAN_LABEL[r.leansToward]}
      </span>
    </>
  );
}
