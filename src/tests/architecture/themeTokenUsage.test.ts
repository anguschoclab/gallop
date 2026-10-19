import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const SRC = join(process.cwd(), "src");

function read(rel: string): string {
  return readFileSync(join(SRC, rel), "utf8");
}

describe("theme token usage", () => {
  it('does not hardcode <html className="dark"> in the root route', () => {
    const root = read("routes/__root.tsx");
    expect(root).not.toMatch(/className="dark"/);
    expect(root).not.toMatch(/<html[^>]*\bdark\b/);
  });

  it("applies the theme before paint via a pre-hydration script", () => {
    const root = read("routes/__root.tsx");
    expect(root).toContain("THEME_STORAGE_KEY");
    expect(root).toMatch(/document\.documentElement\.classList/);
  });

  it("exposes a theme field on DisplaySettings with a dark default", () => {
    const settings = read("domains/settings/model/settingsTypes.ts");
    expect(settings).toMatch(/theme:\s*"dark"\s*\|\s*"light"/);
    expect(settings).toMatch(/theme:\s*"dark",/);
  });

  it("renders a theme control in the display settings card", () => {
    const card = read("domains/settings/ui/DisplaySettingsCard.tsx");
    expect(card).toMatch(/[Tt]heme/);
    expect(card).toMatch(/settings\?\.theme/);
  });

  it("keeps useTheme under the shell application layer", () => {
    expect(existsSync(join(SRC, "domains/shell/application/hooks/useTheme.ts"))).toBe(true);
  });

  it("registers the semantic racing-noir roles in @theme inline", () => {
    const css = read("styles.css");
    for (const token of [
      "--color-background",
      "--color-foreground",
      "--color-card",
      "--color-muted",
      "--color-muted-foreground",
      "--color-primary",
      "--color-border",
      "--color-accent",
      "--color-accent-bright",
      "--color-surface",
      "--color-surface-hover",
      "--color-surface-strong",
    ]) {
      expect(css).toContain(token);
    }
  });
});
