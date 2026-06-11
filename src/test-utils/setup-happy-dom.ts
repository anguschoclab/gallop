import { GlobalRegistrator } from "@happy-dom/global-registrator";

GlobalRegistrator.register();

// Polyfill vi.mocked for bun:test compatibility
const bunTest = await import("bun:test");
if ((bunTest as any).vi && !(bunTest as any).vi.mocked) {
  (bunTest as any).vi.mocked = (fn: any) => fn;
}
