import { createFileRoute } from "@tanstack/react-router";
import { JockeyAvatar, SIZE_MAP, JOCKEY_AVATAR_ASPECT, type JockeyAvatarSize } from "@/components/JockeyAvatar";

const stubJockey = {
  id: "test-jockey-1",
  age: 28,
  archetype: "versatile" as const,
  silk: { pattern: "solid" as const, primary: "#ff0000", secondary: "#ffffff", cap: "#0000ff" },
};

export const Route = createFileRoute("/test-jockey-avatar")({
  component: JockeyAvatarTestPage,
});

function JockeyAvatarTestPage() {
  const sizes: JockeyAvatarSize[] = ["xs", "sm", "md", "lg", "xl"];
  const roundedOptions: Array<"md" | "lg" | "full"> = ["md", "lg", "full"];

  return (
    <div className="p-8 space-y-8 max-w-6xl mx-auto">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold text-cream">JockeyAvatar Visual Test</h1>
        <p className="text-muted-foreground">
          Testing all size variants and rounded options to verify 5:6 aspect ratio and no overflow.
        </p>
      </div>

      <div className="space-y-6">
        <div className="bg-card p-4 rounded-lg border border-border">
          <h2 className="text-lg font-semibold mb-4">Size Variants (5:6 Aspect Ratio)</h2>
          <div className="flex flex-wrap gap-8 items-end">
            {sizes.map((size) => {
              const { w, h } = SIZE_MAP[size];
              return (
                <div key={size} className="flex flex-col items-center gap-2">
                  <JockeyAvatar jockey={stubJockey} size={size} />
                  <div className="text-xs text-muted-foreground space-y-1 text-center">
                    <div className="font-bold uppercase">{size}</div>
                    <div>{w}×{h}px</div>
                    <div className="text-[10px]">Ratio: {(w / h).toFixed(2)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-card p-4 rounded-lg border border-border">
          <h2 className="text-lg font-semibold mb-4">Rounded Variants (md size)</h2>
          <div className="flex gap-8 items-end">
            {roundedOptions.map((rounded) => (
              <div key={rounded} className="flex flex-col items-center gap-2">
                <JockeyAvatar jockey={stubJockey} size="md" rounded={rounded} />
                <div className="text-xs text-muted-foreground text-center">
                  <div className="font-bold uppercase">{rounded}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card p-4 rounded-lg border border-border">
          <h2 className="text-lg font-semibold mb-4">Container Overflow Tests</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Narrow Container (100px)</h3>
              <div className="w-[100px] h-[120px] bg-muted rounded border border-border flex items-center justify-center overflow-hidden">
                <JockeyAvatar jockey={stubJockey} size="xl" />
              </div>
              <p className="text-xs text-muted-foreground">Should scale down, not overflow</p>
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Flex Container</h3>
              <div className="flex gap-2 bg-muted rounded border border-border p-2 overflow-hidden">
                <JockeyAvatar jockey={stubJockey} size="xs" />
                <JockeyAvatar jockey={stubJockey} size="sm" />
                <JockeyAvatar jockey={stubJockey} size="md" />
              </div>
              <p className="text-xs text-muted-foreground">Should fit without overflow</p>
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Grid Container</h3>
              <div className="grid grid-cols-2 gap-2 bg-muted rounded border border-border p-2">
                <JockeyAvatar jockey={stubJockey} size="sm" />
                <JockeyAvatar jockey={stubJockey} size="sm" />
                <JockeyAvatar jockey={stubJockey} size="sm" />
                <JockeyAvatar jockey={stubJockey} size="sm" />
              </div>
              <p className="text-xs text-muted-foreground">Should fit in grid cells</p>
            </div>
          </div>
        </div>

        <div className="bg-card p-4 rounded-lg border border-border">
          <h2 className="text-lg font-semibold mb-4">Sizing Token Reference</h2>
          <div className="space-y-2 text-sm font-mono">
            <div className="flex gap-4">
              <span className="w-16 text-muted-foreground">SIZE_MAP:</span>
              <pre className="flex-1 bg-muted p-2 rounded overflow-x-auto">
                {JSON.stringify(SIZE_MAP, null, 2)}
              </pre>
            </div>
            <div className="flex gap-4">
              <span className="w-16 text-muted-foreground">ASPECT:</span>
              <span>{JOCKEY_AVATAR_ASPECT}</span>
            </div>
            <div className="flex gap-4">
              <span className="w-16 text-muted-foreground">Expected:</span>
              <span>0.8333... (5:6)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
