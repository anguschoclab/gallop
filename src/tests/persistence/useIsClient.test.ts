/**
 * useIsClient.test.ts — Tests for the useIsClient hydration guard hook.
 */

import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useIsClient } from "@/hooks/shared/useIsClient";

describe("useIsClient", () => {
  it("returns true after mount (effects fire in jsdom)", () => {
    const { result, rerender } = renderHook(() => useIsClient());
    // In jsdom, useEffect fires synchronously after the first render
    // so the hook should already be true after initial render + effect
    rerender();
    expect(result.current).toBe(true);
  });

  it("stays true across re-renders", () => {
    const { result, rerender } = renderHook(() => useIsClient());
    rerender();
    rerender();
    rerender();
    expect(result.current).toBe(true);
  });
});
