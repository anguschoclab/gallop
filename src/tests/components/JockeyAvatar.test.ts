import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import {
  JockeyAvatar,
  SIZE_MAP,
  JOCKEY_AVATAR_ASPECT,
  type JockeyAvatarSize,
} from "@/domains/jockey/ui/JockeyAvatar";
import type { Jockey } from "@/platform/game/types";
import { createStubPersonIdentity } from "@/domains/person/model/fixtures";

const stubJockey: Pick<Jockey, "id" | "silk" | "person" | "archetype"> = {
  id: "test-jockey-1",
  person: createStubPersonIdentity({ id: "test-jockey-1", displayName: "Test Jockey" }),
  archetype: "versatile",
  silk: { pattern: "solid", primary: "#ff0000", secondary: "#ffffff", cap: "#0000ff" },
};

const SIZES: JockeyAvatarSize[] = ["xs", "sm", "md", "lg", "xl"];

describe("JockeyAvatar", () => {
  it("exposes a 5:6 portrait aspect ratio invariant", () => {
    expect(JOCKEY_AVATAR_ASPECT).toBeCloseTo(5 / 6, 5);
  });

  it("every size in SIZE_MAP keeps a 5:6 width/height ratio", () => {
    for (const size of SIZES) {
      const { w, h } = SIZE_MAP[size];
      expect(w / h).toBeCloseTo(JOCKEY_AVATAR_ASPECT, 2);
    }
  });

  it("renders at every size with the correct framing styles", () => {
    for (const size of SIZES) {
      const { w, h } = SIZE_MAP[size];
      const html = renderToStaticMarkup(createElement(JockeyAvatar, { jockey: stubJockey, size }));
      expect(html).toContain(`data-size="${size}"`);
      expect(html).toContain(`width:${w}px`);
      expect(html).toContain(`height:${h}px`);
      expect(html).toContain("aspect-ratio:5 / 6");
      // Cannot overflow parent
      expect(html).toContain("max-w-full");
      // Always renders the SVG portrait
      expect(html).toContain("<svg");
      expect(html).toContain('role="img"');
    }
  });

  it("sizes are strictly ascending", () => {
    let prev = 0;
    for (const size of SIZES) {
      const { w } = SIZE_MAP[size];
      expect(w).toBeGreaterThan(prev);
      prev = w;
    }
  });

  it("produces deterministic output for the same jockey id", () => {
    const a = renderToStaticMarkup(createElement(JockeyAvatar, { jockey: stubJockey, size: "md" }));
    const b = renderToStaticMarkup(createElement(JockeyAvatar, { jockey: stubJockey, size: "md" }));
    expect(a).toBe(b);
  });

  it("produces different portraits for different jockey identities", () => {
    const alpha = renderToStaticMarkup(
      createElement(JockeyAvatar, {
        jockey: {
          ...stubJockey,
          id: "alpha",
          person: createStubPersonIdentity({ id: "alpha", displayName: "Alpha Jockey" }),
        },
        size: "md",
      }),
    );
    const omega = renderToStaticMarkup(
      createElement(JockeyAvatar, {
        jockey: {
          ...stubJockey,
          id: "omega-9999",
          person: createStubPersonIdentity({ id: "omega-9999", displayName: "Omega Jockey" }),
        },
        size: "md",
      }),
    );
    expect(alpha).not.toBe(omega);
  });

  it("applies rounded variants", () => {
    const md = renderToStaticMarkup(
      createElement(JockeyAvatar, { jockey: stubJockey, size: "md" }),
    );
    const full = renderToStaticMarkup(
      createElement(JockeyAvatar, { jockey: stubJockey, size: "md", rounded: "full" }),
    );
    expect(md).toContain("rounded-md");
    expect(full).toContain("rounded-full");
  });
});
