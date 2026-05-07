import { formatCurrency } from "@/components/HorseBits";

interface WinOverlayProps {
  horseName: string;
  hammerPrice: number;
}

export function WinOverlay({ horseName, hammerPrice }: WinOverlayProps) {
  return (
    <div
      className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-lg bg-background/90 backdrop-blur-sm animate-in fade-in duration-300"
      role="status"
      aria-live="polite"
    >
      <p className="text-5xl font-black tracking-tight text-emerald-400 uppercase">Acquired</p>
      <p className="mt-2 text-xl font-semibold">{horseName}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{formatCurrency(hammerPrice)}</p>
      <p className="mt-4 text-xs text-muted-foreground">Press any key or wait to continue…</p>
    </div>
  );
}
