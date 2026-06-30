import { beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import { resetCache } from "@/hooks/shared/useBookmarks";

// Mock localStorage globally for Node/JSDOM environment compatibility
const store = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", {
  value: {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
    get length() {
      return store.size;
    },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
  },
  writable: true,
  configurable: true,
});

// Mock sessionStorage globally for Node/JSDOM environment compatibility
const ssStore = new Map<string, string>();
Object.defineProperty(globalThis, "sessionStorage", {
  value: {
    getItem: (key: string) => ssStore.get(key) ?? null,
    setItem: (key: string, value: string) => ssStore.set(key, value),
    removeItem: (key: string) => ssStore.delete(key),
    clear: () => ssStore.clear(),
    get length() {
      return ssStore.size;
    },
    key: (index: number) => Array.from(ssStore.keys())[index] ?? null,
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
  ssStore.clear();
  resetCache();
});
