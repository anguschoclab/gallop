import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getAllSpriteUrls,
  getSpriteUrl,
  preloadHorseSprites,
  getSpriteLoadStatus,
  _resetSpriteLoadCache,
} from "@/components/race/raceVisualHelpers";

describe("getAllSpriteUrls", () => {
  it("returns exactly 14 URLs", () => {
    const urls = getAllSpriteUrls();
    expect(urls).toHaveLength(14);
  });

  it("returns non-empty strings", () => {
    const urls = getAllSpriteUrls();
    for (const url of urls) {
      expect(typeof url).toBe("string");
      expect(url.length).toBeGreaterThan(0);
    }
  });

  it("returns unique URLs (no duplicates)", () => {
    const urls = getAllSpriteUrls();
    const unique = new Set(urls);
    expect(unique.size).toBe(urls.length);
  });

  it("every URL corresponds to a coat color via getSpriteUrl", () => {
    const urls = getAllSpriteUrls();
    const coatColors = [
      "bay",
      "black",
      "chestnut",
      "dark-bay",
      "gray",
      "roan",
      "palomino",
      "white",
      "seal-brown",
      "liver-chestnut",
      "buckskin",
      "dun",
      "grulla",
      "champagne",
    ];
    const allSpriteUrls = new Set(coatColors.map((c) => getSpriteUrl(c)));
    for (const url of urls) {
      expect(allSpriteUrls.has(url)).toBe(true);
    }
  });
});

describe("preloadHorseSprites", () => {
  const originalImage = globalThis.Image;

  beforeEach(() => {
    class MockImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      private _src = "";
      get src() {
        return this._src;
      }
      set src(value: string) {
        this._src = value;
        if (this.onload) this.onload();
      }
    }
    (globalThis as any).Image = MockImage;
  });

  afterEach(() => {
    (globalThis as any).Image = originalImage;
  });

  it("creates an Image for each URL and sets .src", async () => {
    const urls = getAllSpriteUrls();
    const imageCreatedSpy = vi.fn();
    const BaseImage = (globalThis as any).Image;

    class TrackingImage extends BaseImage {
      constructor() {
        super();
        imageCreatedSpy(this);
      }
    }
    (globalThis as any).Image = TrackingImage;

    await preloadHorseSprites();

    expect(imageCreatedSpy).toHaveBeenCalledTimes(urls.length);

    const srcs = imageCreatedSpy.mock.calls.map((c: any) => c[0].src);
    for (const url of urls) {
      expect(srcs).toContain(url);
    }

    (globalThis as any).Image = BaseImage;
  });

  it("resolves when all images load successfully", async () => {
    _resetSpriteLoadCache();
    await expect(preloadHorseSprites()).resolves.toBeUndefined();
    const urls = getAllSpriteUrls();
    for (const url of urls) {
      expect(getSpriteLoadStatus(url)).toBe("loaded");
    }
  });

  it("resolves even when some images error", async () => {
    _resetSpriteLoadCache();
    class ErrorImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      private _src = "";
      get src() {
        return this._src;
      }
      set src(value: string) {
        this._src = value;
        if (this.onerror) this.onerror();
      }
    }
    const savedImage = (globalThis as any).Image;
    (globalThis as any).Image = ErrorImage;

    await expect(preloadHorseSprites()).resolves.toBeUndefined();

    const urls = getAllSpriteUrls();
    for (const url of urls) {
      expect(getSpriteLoadStatus(url)).toBe("error");
    }

    (globalThis as any).Image = savedImage;
  });

  it("is a no-op when Image is undefined (SSR)", async () => {
    _resetSpriteLoadCache();
    const savedImage = (globalThis as any).Image;
    delete (globalThis as any).Image;

    await expect(preloadHorseSprites()).resolves.toBeUndefined();

    const urls = getAllSpriteUrls();
    for (const url of urls) {
      expect(getSpriteLoadStatus(url)).toBeUndefined();
    }

    (globalThis as any).Image = savedImage;
  });
});

describe("spriteLoadCache", () => {
  const originalImage = globalThis.Image;

  beforeEach(() => {
    _resetSpriteLoadCache();
    class MockImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      private _src = "";
      get src() {
        return this._src;
      }
      set src(value: string) {
        this._src = value;
        if (this.onload) this.onload();
      }
    }
    (globalThis as any).Image = MockImage;
  });

  afterEach(() => {
    (globalThis as any).Image = originalImage;
    _resetSpriteLoadCache();
  });

  it("getSpriteLoadStatus returns undefined for unknown URLs before any preload", () => {
    const urls = getAllSpriteUrls();
    for (const url of urls) {
      expect(getSpriteLoadStatus(url)).toBeUndefined();
    }
  });

  it("after preloadHorseSprites with all-success mock, every URL has status 'loaded'", async () => {
    await preloadHorseSprites();
    const urls = getAllSpriteUrls();
    for (const url of urls) {
      expect(getSpriteLoadStatus(url)).toBe("loaded");
    }
  });

  it("after preloadHorseSprites with all-error mock, every URL has status 'error'", async () => {
    class ErrorImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      private _src = "";
      get src() {
        return this._src;
      }
      set src(value: string) {
        this._src = value;
        if (this.onerror) this.onerror();
      }
    }
    (globalThis as any).Image = ErrorImage;

    await preloadHorseSprites();
    const urls = getAllSpriteUrls();
    for (const url of urls) {
      expect(getSpriteLoadStatus(url)).toBe("error");
    }
  });

  it("after preloadHorseSprites with mixed mock, correct status per URL", async () => {
    const urls = getAllSpriteUrls();
    const half = Math.floor(urls.length / 2);
    const successUrls = new Set(urls.slice(0, half));

    class MixedImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      private _src = "";
      get src() {
        return this._src;
      }
      set src(value: string) {
        this._src = value;
        if (successUrls.has(value)) {
          if (this.onload) this.onload();
        } else {
          if (this.onerror) this.onerror();
        }
      }
    }
    (globalThis as any).Image = MixedImage;

    await preloadHorseSprites();

    for (const url of urls.slice(0, half)) {
      expect(getSpriteLoadStatus(url)).toBe("loaded");
    }
    for (const url of urls.slice(half)) {
      expect(getSpriteLoadStatus(url)).toBe("error");
    }
  });

  it("cache is module-level — persists across calls within the same module instance", async () => {
    await preloadHorseSprites();
    const urls = getAllSpriteUrls();
    const firstStatus = getSpriteLoadStatus(urls[0]);
    expect(firstStatus).toBe("loaded");

    // Call again — cache should still have the status
    await preloadHorseSprites();
    expect(getSpriteLoadStatus(urls[0])).toBe(firstStatus);
  });

  it("SSR guard: when Image is undefined, cache remains empty", async () => {
    delete (globalThis as any).Image;
    await preloadHorseSprites();
    const urls = getAllSpriteUrls();
    for (const url of urls) {
      expect(getSpriteLoadStatus(url)).toBeUndefined();
    }
  });
});
