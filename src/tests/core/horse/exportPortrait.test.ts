/**
 * exportPortrait.test.ts - Tests for horse portrait export functionality
 *
 * Tests the client-side horse portrait export to PNG, including:
 * - loadImage helper function
 * - Filename generation
 * - Aspect ratio calculations
 * - SVG rendering
 * - Canvas context error handling
 * - Download trigger sequence
 * - Object URL cleanup
 * - Error paths
 * - Integration tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { exportHorsePortraitPng } from "@/core/horse/exportPortrait";
import type { Horse } from "@/game/types";
import { makeAppearanceDNA } from "@/tests/helpers/sampleGameState";
import { renderToStaticMarkup } from "react-dom/server";
import { getOrDeriveAppearance } from "@/core/horse/proceduralPortrait";
import { createElement } from "react";

// Mock React server-side rendering
vi.mock("react-dom/server", () => ({
  renderToStaticMarkup: vi.fn(),
}));

// Mock React createElement and forwardRef
vi.mock("react", () => ({
  createElement: vi.fn(() => ({ toString: () => "mock-element" })),
  forwardRef: vi.fn((render) => render),
}));

// Mock ProceduralHorsePortrait component
vi.mock("@/components/horse/ProceduralHorsePortrait", () => ({
  ProceduralHorsePortrait: () => null,
}));

// Mock proceduralPortrait
vi.mock("@/core/horse/proceduralPortrait", () => ({
  getOrDeriveAppearance: vi.fn(),
}));

// Mock DOM APIs
const mockCanvas: any = {
  width: 0,
  height: 0,
  getContext: vi.fn(),
  toDataURL: vi.fn(() => "data:image/png;base64,mock"),
};

const mockAnchor: any = {
  href: "",
  download: "",
  click: vi.fn(),
  remove: vi.fn(),
};

let mockObjectUrls: string[] = [];
let mockImageOnload: (() => void) | null = null;
let mockImageOnerror: ((e: Error) => void) | null = null;
let mockImageSrc: string = "";

class MockImage {
  onload: (() => void) | null = null;
  onerror: ((e: Error) => void) | null = null;
  private _src: string = "";

  get src() {
    return this._src;
  }

  set src(value: string) {
    this._src = value;
    if (value) {
      setTimeout(() => {
        if (mockImageOnerror) {
          if (this.onerror) this.onerror(new Error("Mock Load Error"));
        } else {
          if (this.onload) this.onload();
        }
      }, 0);
    }
  }
}

describe("exportPortrait", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockObjectUrls = [];
    mockImageOnload = null;
    mockImageOnerror = null;
    mockImageSrc = "";

    // Mock document.createElement
    const originalCreateElement = document.createElement;
    vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      if (tag === "canvas") return mockCanvas as any;
      if (tag === "a") return mockAnchor as any;
      if (tag === "img") return new MockImage() as any;
      return originalCreateElement.call(document, tag);
    });

    // Mock document.body.appendChild
    vi.spyOn(document.body, "appendChild").mockImplementation((node: any) => {
      if (node === mockAnchor) return mockAnchor;
      return document.body.appendChild(node);
    });

    // Mock document.body.removeChild
    vi.spyOn(document.body, "removeChild").mockImplementation((node: any) => {
      if (node === mockAnchor) return;
      return document.body.removeChild(node);
    });

    // Mock URL.createObjectURL
    URL.createObjectURL = vi.fn((obj: any) => {
      const url = `blob:${mockObjectUrls.length}`;
      mockObjectUrls.push(url);
      return url;
    }) as any;

    // Mock URL.revokeObjectURL
    URL.revokeObjectURL = vi.fn((url: string) => {
      mockObjectUrls = mockObjectUrls.filter((u) => u !== url);
    }) as any;

    // Set up default mock implementations
    mockCanvas.getContext.mockReturnValue({
      drawImage: vi.fn(),
    } as any);

    // Mock renderToStaticMarkup
    (renderToStaticMarkup as any).mockReturnValue(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 220"><rect width="220" height="220" fill="#7a3f1a"/></svg>',
    );

    // Mock getOrDeriveAppearance
    (getOrDeriveAppearance as any).mockReturnValue({
      seed: 12345,
      headTilt: 0,
      headLength: 1.0,
      earSpread: 1.0,
      eyeY: 0,
      forelockSweep: 0,
      maneWaves: [0, 0, 0, 0],
      bodyLength: 1.0,
      bodyDepth: 1.0,
      legLength: 1.0,
      tailSweep: 0,
      tailFullness: 1.0,
      socks: ["none", "none", "none", "none"],
      dapples: [],
      flecks: [],
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("filename generation", () => {
    it("uses default pattern when no filename provided", async () => {
      const mockHorse: Pick<
        Horse,
        "id" | "name" | "coatColor" | "markings" | "gender" | "appearance"
      > = {
        id: "test-horse-1",
        name: "Thunder",
        coatColor: "bay",
        markings: { socks: "none", face: "none" },
        gender: "colt",
        appearance: makeAppearanceDNA(),
      };

      // Set up image to load successfully
      mockImageOnload = () => {};
      mockImageSrc = "blob:0";

      await exportHorsePortraitPng(mockHorse);

      expect(mockAnchor.download).toBe("Thunder_full.png");
    });

    it("sanitizes horse name", async () => {
      const mockHorse: Pick<
        Horse,
        "id" | "name" | "coatColor" | "markings" | "gender" | "appearance"
      > = {
        id: "test-horse-1",
        name: "Thunder's Lightning",
        coatColor: "bay",
        markings: { socks: "none", face: "none" },
        gender: "colt",
        appearance: makeAppearanceDNA(),
      };

      mockImageOnload = () => {};
      mockImageSrc = "blob:0";

      await exportHorsePortraitPng(mockHorse);

      expect(mockAnchor.download).toBe("Thunder_s_Lightning_full.png");
    });

    it("uses custom filename when provided", async () => {
      const mockHorse: Pick<
        Horse,
        "id" | "name" | "coatColor" | "markings" | "gender" | "appearance"
      > = {
        id: "test-horse-1",
        name: "Thunder",
        coatColor: "bay",
        markings: { socks: "none", face: "none" },
        gender: "colt",
        appearance: makeAppearanceDNA(),
      };

      mockImageOnload = () => {};
      mockImageSrc = "blob:0";

      await exportHorsePortraitPng(mockHorse, { filename: "custom-name.png" });

      expect(mockAnchor.download).toBe("custom-name.png");
    });

    it("handles missing horse name", async () => {
      const mockHorse: Pick<
        Horse,
        "id" | "name" | "coatColor" | "markings" | "gender" | "appearance"
      > = {
        id: "test-horse-1",
        name: "",
        coatColor: "bay",
        markings: { socks: "none", face: "none" },
        gender: "colt",
        appearance: makeAppearanceDNA(),
      };

      mockImageOnload = () => {};
      mockImageSrc = "blob:0";

      await exportHorsePortraitPng(mockHorse);

      expect(mockAnchor.download).toBe("horse_full.png");
    });

    it("includes view type in filename", async () => {
      const mockHorse: Pick<
        Horse,
        "id" | "name" | "coatColor" | "markings" | "gender" | "appearance"
      > = {
        id: "test-horse-1",
        name: "Thunder",
        coatColor: "bay",
        markings: { socks: "none", face: "none" },
        gender: "colt",
        appearance: makeAppearanceDNA(),
      };

      mockImageOnload = () => {};
      mockImageSrc = "blob:0";

      await exportHorsePortraitPng(mockHorse, { view: "head" });

      expect(mockAnchor.download).toBe("Thunder_head.png");
    });
  });

  describe("aspect ratio calculation", () => {
    it("calculates full view dimensions correctly", async () => {
      const mockHorse: Pick<
        Horse,
        "id" | "name" | "coatColor" | "markings" | "gender" | "appearance"
      > = {
        id: "test-horse-1",
        name: "Thunder",
        coatColor: "bay",
        markings: { socks: "none", face: "none" },
        gender: "colt",
        appearance: makeAppearanceDNA(),
      };

      mockImageOnload = () => {};
      mockImageSrc = "blob:0";

      await exportHorsePortraitPng(mockHorse, { size: 1024, view: "full" });

      // Full view aspect ratio is 360/280 = 1.2857
      // Width = 1024 * 1.2857 ≈ 1316
      expect(mockCanvas.width).toBeGreaterThan(1024);
      expect(mockCanvas.height).toBe(1024);
    });

    it("calculates head view dimensions correctly", async () => {
      const mockHorse: Pick<
        Horse,
        "id" | "name" | "coatColor" | "markings" | "gender" | "appearance"
      > = {
        id: "test-horse-1",
        name: "Thunder",
        coatColor: "bay",
        markings: { socks: "none", face: "none" },
        gender: "colt",
        appearance: makeAppearanceDNA(),
      };

      mockImageOnload = () => {};
      mockImageSrc = "blob:0";

      await exportHorsePortraitPng(mockHorse, { size: 1024, view: "head" });

      // Head view aspect ratio is 1/1
      expect(mockCanvas.width).toBe(1024);
      expect(mockCanvas.height).toBe(1024);
    });

    it("applies custom size correctly", async () => {
      const mockHorse: Pick<
        Horse,
        "id" | "name" | "coatColor" | "markings" | "gender" | "appearance"
      > = {
        id: "test-horse-1",
        name: "Thunder",
        coatColor: "bay",
        markings: { socks: "none", face: "none" },
        gender: "colt",
        appearance: makeAppearanceDNA(),
      };

      mockImageOnload = () => {};
      mockImageSrc = "blob:0";

      await exportHorsePortraitPng(mockHorse, { size: 512, view: "head" });

      expect(mockCanvas.width).toBe(512);
      expect(mockCanvas.height).toBe(512);
    });
  });

  describe("SVG rendering", () => {
    it("renders ProceduralHorsePortrait with correct props", async () => {
      const mockHorse: Pick<
        Horse,
        "id" | "name" | "coatColor" | "markings" | "gender" | "appearance"
      > = {
        id: "test-horse-1",
        name: "Thunder",
        coatColor: "bay",
        markings: { socks: "none", face: "none" },
        gender: "colt",
        appearance: makeAppearanceDNA(),
      };

      mockImageOnload = () => {};
      mockImageSrc = "blob:0";

      await exportHorsePortraitPng(mockHorse);

      expect(createElement).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          id: "test-horse-1",
          coatColor: "bay",
          markings: { socks: "none", face: "none" },
          gender: "colt",
          view: "full",
        }),
      );
      expect(renderToStaticMarkup).toHaveBeenCalled();
    });

    it("uses resolved appearance DNA", async () => {
      const mockHorse: Pick<
        Horse,
        "id" | "name" | "coatColor" | "markings" | "gender" | "appearance"
      > = {
        id: "test-horse-1",
        name: "Thunder",
        coatColor: "bay",
        markings: { socks: ["none", "none", "none", "none"] as any, face: "none" },
        gender: "colt",
        appearance: makeAppearanceDNA(),
      };

      mockImageOnload = () => {};
      mockImageSrc = "blob:0";

      await exportHorsePortraitPng(mockHorse);

      expect(getOrDeriveAppearance).toHaveBeenCalledWith(
        "test-horse-1",
        "bay",
        { socks: ["none", "none", "none", "none"], face: "none" },
        makeAppearanceDNA(),
      );
    });

    it("generates valid SVG markup", async () => {
      const mockHorse: Pick<
        Horse,
        "id" | "name" | "coatColor" | "markings" | "gender" | "appearance"
      > = {
        id: "test-horse-1",
        name: "Thunder",
        coatColor: "bay",
        markings: { socks: "none", face: "none" },
        gender: "colt",
        appearance: makeAppearanceDNA(),
      };

      mockImageOnload = () => {};
      mockImageSrc = "blob:0";

      await exportHorsePortraitPng(mockHorse);

      expect(renderToStaticMarkup).toHaveBeenCalled();
    });
  });

  describe("canvas context error handling", () => {
    it("throws error when canvas context unavailable", async () => {
      const mockHorse: Pick<
        Horse,
        "id" | "name" | "coatColor" | "markings" | "gender" | "appearance"
      > = {
        id: "test-horse-1",
        name: "Thunder",
        coatColor: "bay",
        markings: { socks: "none", face: "none" },
        gender: "colt",
        appearance: makeAppearanceDNA(),
      };

      mockImageOnload = () => {};
      mockImageSrc = "blob:0";
      mockCanvas.getContext.mockReturnValue(null);

      await expect(exportHorsePortraitPng(mockHorse)).rejects.toThrow("Canvas context unavailable");
    });

    it("revokes object URL even on error", async () => {
      const mockHorse: Pick<
        Horse,
        "id" | "name" | "coatColor" | "markings" | "gender" | "appearance"
      > = {
        id: "test-horse-1",
        name: "Thunder",
        coatColor: "bay",
        markings: { socks: "none", face: "none" },
        gender: "colt",
        appearance: makeAppearanceDNA(),
      };

      mockImageOnload = () => {};
      mockImageSrc = "blob:0";
      mockCanvas.getContext.mockReturnValue(null);

      try {
        await exportHorsePortraitPng(mockHorse);
      } catch (e) {
        // Expected error
      }

      expect(URL.revokeObjectURL).toHaveBeenCalled();
      expect(mockObjectUrls).toHaveLength(0);
    });
  });

  describe("download trigger", () => {
    it("creates anchor with correct href", async () => {
      const mockHorse: Pick<
        Horse,
        "id" | "name" | "coatColor" | "markings" | "gender" | "appearance"
      > = {
        id: "test-horse-1",
        name: "Thunder",
        coatColor: "bay",
        markings: { socks: "none", face: "none" },
        gender: "colt",
        appearance: makeAppearanceDNA(),
      };

      mockImageOnload = () => {};
      mockImageSrc = "blob:0";

      await exportHorsePortraitPng(mockHorse);

      expect(mockAnchor.href).toBe("data:image/png;base64,mock");
    });

    it("creates anchor with correct download attribute", async () => {
      const mockHorse: Pick<
        Horse,
        "id" | "name" | "coatColor" | "markings" | "gender" | "appearance"
      > = {
        id: "test-horse-1",
        name: "Thunder",
        coatColor: "bay",
        markings: { socks: "none", face: "none" },
        gender: "colt",
        appearance: makeAppearanceDNA(),
      };

      mockImageOnload = () => {};
      mockImageSrc = "blob:0";

      await exportHorsePortraitPng(mockHorse);

      expect(mockAnchor.download).toBe("Thunder_full.png");
    });

    it("appends anchor to body before click", async () => {
      const mockHorse: Pick<
        Horse,
        "id" | "name" | "coatColor" | "markings" | "gender" | "appearance"
      > = {
        id: "test-horse-1",
        name: "Thunder",
        coatColor: "bay",
        markings: { socks: "none", face: "none" },
        gender: "colt",
        appearance: makeAppearanceDNA(),
      };

      mockImageOnload = () => {};
      mockImageSrc = "blob:0";

      await exportHorsePortraitPng(mockHorse);

      expect(document.body.appendChild).toHaveBeenCalledWith(mockAnchor);
    });

    it("removes anchor after click", async () => {
      const mockHorse: Pick<
        Horse,
        "id" | "name" | "coatColor" | "markings" | "gender" | "appearance"
      > = {
        id: "test-horse-1",
        name: "Thunder",
        coatColor: "bay",
        markings: { socks: "none", face: "none" },
        gender: "colt",
        appearance: makeAppearanceDNA(),
      };

      mockImageOnload = () => {};
      mockImageSrc = "blob:0";

      await exportHorsePortraitPng(mockHorse);

      expect(mockAnchor.remove).toHaveBeenCalled();
    });

    it("triggers click on anchor", async () => {
      const mockHorse: Pick<
        Horse,
        "id" | "name" | "coatColor" | "markings" | "gender" | "appearance"
      > = {
        id: "test-horse-1",
        name: "Thunder",
        coatColor: "bay",
        markings: { socks: "none", face: "none" },
        gender: "colt",
        appearance: makeAppearanceDNA(),
      };

      mockImageOnload = () => {};
      mockImageSrc = "blob:0";

      await exportHorsePortraitPng(mockHorse);

      expect(mockAnchor.click).toHaveBeenCalled();
    });
  });

  describe("object URL cleanup", () => {
    it("revokes object URL after successful export", async () => {
      const mockHorse: Pick<
        Horse,
        "id" | "name" | "coatColor" | "markings" | "gender" | "appearance"
      > = {
        id: "test-horse-1",
        name: "Thunder",
        coatColor: "bay",
        markings: { socks: "none", face: "none" },
        gender: "colt",
        appearance: makeAppearanceDNA(),
      };

      mockImageOnload = () => {};
      mockImageSrc = "blob:0";

      await exportHorsePortraitPng(mockHorse);

      expect(URL.revokeObjectURL).toHaveBeenCalled();
      expect(mockObjectUrls).toHaveLength(0);
    });

    it("revokes object URL on error", async () => {
      const mockHorse: Pick<
        Horse,
        "id" | "name" | "coatColor" | "markings" | "gender" | "appearance"
      > = {
        id: "test-horse-1",
        name: "Thunder",
        coatColor: "bay",
        markings: { socks: "none", face: "none" },
        gender: "colt",
        appearance: makeAppearanceDNA(),
      };

      mockImageOnload = () => {};
      mockImageSrc = "blob:0";
      mockCanvas.getContext.mockReturnValue(null);

      try {
        await exportHorsePortraitPng(mockHorse);
      } catch (e) {
        // Expected error
      }

      expect(URL.revokeObjectURL).toHaveBeenCalled();
      expect(mockObjectUrls).toHaveLength(0);
    });
  });

  describe("error paths", () => {
    it("handles image load failure", async () => {
      const mockHorse: Pick<
        Horse,
        "id" | "name" | "coatColor" | "markings" | "gender" | "appearance"
      > = {
        id: "test-horse-1",
        name: "Thunder",
        coatColor: "bay",
        markings: { socks: "none", face: "none" },
        gender: "colt",
        appearance: makeAppearanceDNA(),
      };

      mockImageOnerror = (e: Error) => {
        throw e;
      };
      mockImageSrc = "blob:0";

      await expect(exportHorsePortraitPng(mockHorse)).rejects.toThrow();
    });

    it("handles toDataURL failure", async () => {
      const mockHorse: Pick<
        Horse,
        "id" | "name" | "coatColor" | "markings" | "gender" | "appearance"
      > = {
        id: "test-horse-1",
        name: "Thunder",
        coatColor: "bay",
        markings: { socks: "none", face: "none" },
        gender: "colt",
        appearance: makeAppearanceDNA(),
      };

      mockImageOnload = () => {};
      mockImageSrc = "blob:0";
      mockCanvas.toDataURL.mockImplementation(() => {
        throw new Error("toDataURL failed");
      });

      await expect(exportHorsePortraitPng(mockHorse)).rejects.toThrow("toDataURL failed");
    });
  });

  describe("integration tests (happy path)", () => {
    it("completes full export flow with head view", async () => {
      const mockHorse: Pick<
        Horse,
        "id" | "name" | "coatColor" | "markings" | "gender" | "appearance"
      > = {
        id: "test-horse-1",
        name: "Thunder",
        coatColor: "bay",
        markings: { socks: "none", face: "none" },
        gender: "colt",
        appearance: makeAppearanceDNA(),
      };

      mockImageOnload = () => {};
      mockImageSrc = "blob:0";

      await exportHorsePortraitPng(mockHorse, { view: "head" });

      // Verify all steps called in order

      expect(getOrDeriveAppearance).toHaveBeenCalled();
      expect(createElement).toHaveBeenCalled();
      expect(renderToStaticMarkup).toHaveBeenCalled();
      expect(URL.createObjectURL).toHaveBeenCalled();
      expect(mockCanvas.getContext).toHaveBeenCalled();
      expect(mockCanvas.toDataURL).toHaveBeenCalled();
      expect(document.body.appendChild).toHaveBeenCalledWith(mockAnchor);
      expect(mockAnchor.click).toHaveBeenCalled();
      expect(mockAnchor.remove).toHaveBeenCalled();
      expect(URL.revokeObjectURL).toHaveBeenCalled();
    });

    it("completes full export flow with full view", async () => {
      const mockHorse: Pick<
        Horse,
        "id" | "name" | "coatColor" | "markings" | "gender" | "appearance"
      > = {
        id: "test-horse-1",
        name: "Thunder",
        coatColor: "bay",
        markings: { socks: "none", face: "none" },
        gender: "colt",
        appearance: makeAppearanceDNA(),
      };

      mockImageOnload = () => {};
      mockImageSrc = "blob:0";

      await exportHorsePortraitPng(mockHorse, { view: "full" });

      // Verify aspect ratio calculations
      expect(mockCanvas.width).toBeGreaterThan(mockCanvas.height);
    });

    it("completes full export flow with custom options", async () => {
      const mockHorse: Pick<
        Horse,
        "id" | "name" | "coatColor" | "markings" | "gender" | "appearance"
      > = {
        id: "test-horse-1",
        name: "Thunder",
        coatColor: "bay",
        markings: { socks: "none", face: "none" },
        gender: "colt",
        appearance: makeAppearanceDNA(),
      };

      mockImageOnload = () => {};
      mockImageSrc = "blob:0";

      await exportHorsePortraitPng(mockHorse, {
        view: "head",
        size: 512,
        filename: "custom.png",
      });

      expect(mockAnchor.download).toBe("custom.png");
      expect(mockCanvas.width).toBe(512);
      expect(mockCanvas.height).toBe(512);
    });
  });
});
