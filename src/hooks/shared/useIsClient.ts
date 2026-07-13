import { useEffect, useState } from "react";

/**
 * Returns `true` only after the component has mounted on the client.
 *
 * Use this to guard browser-only rendering (localStorage reads, window size,
 * etc.) and avoid SSR hydration mismatches. During SSR and the first client
 * render, returns `false`; after `useEffect` fires, returns `true`.
 */
export function useIsClient(): boolean {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => setIsClient(true), []);
  return isClient;
}
