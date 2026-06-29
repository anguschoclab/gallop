import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import {
  SvgProps,
  REGION_AWARD_CONFIG,
  AwardSvgShell,
  HotyBanner,
  type RegionAwardColorScheme,
} from "@/assets/awards/shared";
import type { AwardRegion } from "@/core/awards/types";

const ALL_REGIONS: AwardRegion[] = ["north_america", "europe", "asia_pacific", "south_america"];

const EXPECTED_COLORS: Record<
  AwardRegion,
  {
    category: RegionAwardColorScheme;
    hoty: RegionAwardColorScheme;
  }
> = {
  asia_pacific: {
    category: {
      primary: "#006400",
      accent: "#FFD700",
      gradientFrom: "#006400",
      gradientTo: "#004d00",
      circleStroke: "#32CD32",
    },
    hoty: {
      primary: "#006400",
      accent: "#FFD700",
      gradientFrom: "#006400",
      gradientTo: "#004d00",
      circleStroke: "#FFD700",
    },
  },
  europe: {
    category: {
      primary: "#4B0082",
      accent: "#C0C0C0",
      gradientFrom: "#4B0082",
      gradientTo: "#2D0052",
      circleStroke: "#7B68EE",
    },
    hoty: {
      primary: "#4B0082",
      accent: "#C0C0C0",
      gradientFrom: "#4B0082",
      gradientTo: "#2D0052",
      circleStroke: "#C0C0C0",
    },
  },
  north_america: {
    category: {
      primary: "#1E3A5F",
      accent: "#C0C0C0",
      gradientFrom: "#1E3A5F",
      gradientTo: "#0D2137",
      circleStroke: "#4A90A4",
    },
    hoty: {
      primary: "#1E3A5F",
      accent: "#C9A227",
      gradientFrom: "#1E3A5F",
      gradientTo: "#0D2137",
      circleStroke: "#C9A227",
    },
  },
  south_america: {
    category: {
      primary: "#8B0000",
      accent: "#FFD700",
      gradientFrom: "#8B0000",
      gradientTo: "#5C0000",
      circleStroke: "#FF6347",
    },
    hoty: {
      primary: "#8B0000",
      accent: "#FFD700",
      gradientFrom: "#8B0000",
      gradientTo: "#5C0000",
      circleStroke: "#FFD700",
    },
  },
};

describe("REGION_AWARD_CONFIG", () => {
  it("has entries for all 4 AwardRegion values", () => {
    for (const region of ALL_REGIONS) {
      expect(REGION_AWARD_CONFIG[region]).toBeDefined();
    }
  });

  it("each entry has category and hoty sub-objects", () => {
    for (const region of ALL_REGIONS) {
      expect(REGION_AWARD_CONFIG[region].category).toBeDefined();
      expect(REGION_AWARD_CONFIG[region].hoty).toBeDefined();
    }
  });

  it("each sub-object has all 5 color fields as non-empty hex strings", () => {
    for (const region of ALL_REGIONS) {
      for (const type of ["category", "hoty"] as const) {
        const scheme = REGION_AWARD_CONFIG[region][type];
        for (const field of [
          "primary",
          "accent",
          "gradientFrom",
          "gradientTo",
          "circleStroke",
        ] as const) {
          expect(scheme[field]).toBeTruthy();
          expect(scheme[field]).toMatch(/^#[0-9A-Fa-f]{6}$/);
        }
      }
    }
  });

  it("matches exact expected color values for all regions", () => {
    for (const region of ALL_REGIONS) {
      const expected = EXPECTED_COLORS[region];
      expect(REGION_AWARD_CONFIG[region].category).toEqual(expected.category);
      expect(REGION_AWARD_CONFIG[region].hoty).toEqual(expected.hoty);
    }
  });

  it("NA category accent (#C0C0C0) differs from NA hoty accent (#C9A227)", () => {
    expect(REGION_AWARD_CONFIG.north_america.category.accent).toBe("#C0C0C0");
    expect(REGION_AWARD_CONFIG.north_america.hoty.accent).toBe("#C9A227");
    expect(REGION_AWARD_CONFIG.north_america.category.accent).not.toBe(
      REGION_AWARD_CONFIG.north_america.hoty.accent,
    );
  });
});

describe("AwardSvgShell", () => {
  const sampleColors: RegionAwardColorScheme = {
    primary: "#123456",
    accent: "#ABCDEF",
    gradientFrom: "#123456",
    gradientTo: "#654321",
    circleStroke: "#FFFFFF",
  };

  it("renders an <svg> element with passed width and height", () => {
    const html = renderToStaticMarkup(
      createElement(
        AwardSvgShell,
        {
          width: 48,
          height: 48,
          title: "Test Award",
          gradientId: "test-grad",
          colors: sampleColors,
        },
        null,
      ),
    );
    expect(html).toContain("<svg");
    expect(html).toContain('width="48"');
    expect(html).toContain('height="48"');
  });

  it("renders a <circle> with stroke matching config circleStroke", () => {
    const html = renderToStaticMarkup(
      createElement(
        AwardSvgShell,
        {
          width: 48,
          height: 48,
          title: "Test Award",
          gradientId: "test-grad",
          colors: sampleColors,
        },
        null,
      ),
    );
    expect(html).toContain("<circle");
    expect(html).toContain('stroke="#FFFFFF"');
  });

  it("renders <defs> with <linearGradient> containing correct stopColor values", () => {
    const html = renderToStaticMarkup(
      createElement(
        AwardSvgShell,
        {
          width: 48,
          height: 48,
          title: "Test Award",
          gradientId: "test-grad",
          colors: sampleColors,
        },
        null,
      ),
    );
    expect(html).toContain("<linearGradient");
    expect(html).toContain('id="test-grad"');
    expect(html).toContain('stop-color="#123456"');
    expect(html).toContain('stop-color="#654321"');
  });

  it("renders a <title> element with passed title text", () => {
    const html = renderToStaticMarkup(
      createElement(
        AwardSvgShell,
        {
          width: 48,
          height: 48,
          title: "My Custom Award Title",
          gradientId: "test-grad",
          colors: sampleColors,
        },
        null,
      ),
    );
    expect(html).toContain("<title>");
    expect(html).toContain("My Custom Award Title");
  });

  it("renders children inside the SVG", () => {
    const html = renderToStaticMarkup(
      createElement(
        AwardSvgShell,
        {
          width: 48,
          height: 48,
          title: "Test Award",
          gradientId: "test-grad",
          colors: sampleColors,
        },
        createElement("path", { d: "M0 0 L48 48", stroke: "#FF0000" }),
      ),
    );
    expect(html).toContain("<path");
    expect(html).toContain('d="M0 0 L48 48"');
  });

  it("passes className through to the SVG element", () => {
    const html = renderToStaticMarkup(
      createElement(
        AwardSvgShell,
        {
          width: 48,
          height: 48,
          className: "my-custom-class",
          title: "Test Award",
          gradientId: "test-grad",
          colors: sampleColors,
        },
        null,
      ),
    );
    expect(html).toContain('class="my-custom-class"');
  });

  it("renders viewBox 0 0 48 48", () => {
    const html = renderToStaticMarkup(
      createElement(
        AwardSvgShell,
        {
          width: 48,
          height: 48,
          title: "Test Award",
          gradientId: "test-grad",
          colors: sampleColors,
        },
        null,
      ),
    );
    expect(html).toContain('viewBox="0 0 48 48"');
  });
});

describe("HotyBanner", () => {
  it("renders a <rect> and <text> with HOTY label", () => {
    const html = renderToStaticMarkup(
      createElement(HotyBanner, { fillColor: "#006400", textColor: "#FFD700" }),
    );
    expect(html).toContain("<rect");
    expect(html).toContain("<text");
    expect(html).toContain("HOTY");
  });

  it("uses the provided fillColor for the rect", () => {
    const html = renderToStaticMarkup(
      createElement(HotyBanner, { fillColor: "#123456", textColor: "#ABCDEF" }),
    );
    expect(html).toContain('fill="#123456"');
  });

  it("uses the provided textColor for the text", () => {
    const html = renderToStaticMarkup(
      createElement(HotyBanner, { fillColor: "#123456", textColor: "#ABCDEF" }),
    );
    expect(html).toContain('fill="#ABCDEF"');
  });

  it("defaults to y=39 for rect and y=42 for text", () => {
    const html = renderToStaticMarkup(
      createElement(HotyBanner, { fillColor: "#000000", textColor: "#FFFFFF" }),
    );
    expect(html).toContain('y="39"');
    expect(html).toContain('y="42"');
  });

  it("accepts custom y positions for NA variant", () => {
    const html = renderToStaticMarkup(
      createElement(HotyBanner, {
        fillColor: "#000000",
        textColor: "#FFFFFF",
        rectY: 36,
        textY: 39,
      }),
    );
    expect(html).toContain('y="36"');
  });
});

describe("SvgProps type", () => {
  it("SvgProps is exported and has the correct shape", () => {
    const testProps: SvgProps = { width: 48, height: 48 };
    expect(testProps.width).toBe(48);
    expect(testProps.height).toBe(48);
    const withClassName: SvgProps = { width: 24, height: 24, className: "test" };
    expect(withClassName.className).toBe("test");
  });
});
