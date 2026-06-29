import { beforeEach } from "vitest";
import { resetCache } from "@/hooks/shared/useBookmarks";

// Mock localStorage globally for Node/JSDOM environment compatibility
const store = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", {
  value: {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
    length: 0,
    key: (index: number) => Array.from(store.keys())[index] ?? null,
  },
  writable: true,
  configurable: true,
});

// jsdom doesn't implement ResizeObserver
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as any).ResizeObserver = ResizeObserverMock;

beforeEach(() => {
  store.clear();
  resetCache();
});
