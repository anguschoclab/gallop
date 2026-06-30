import { useCallback, useReducer } from "react";

export type AuctionErrorType = "sale_not_found" | "data_unavailable" | "bid_error";

const STORAGE_PREFIX = "gallop:auction:dismissed:";

function storageKey(saleId: string, errorType: AuctionErrorType): string {
  return `${STORAGE_PREFIX}${saleId}:${errorType}`;
}

export function useDismissedAuctionErrors() {
  const [, bump] = useReducer((x: number) => x + 1, 0);

  const isDismissed = useCallback((saleId: string, errorType: AuctionErrorType): boolean => {
    if (typeof window === "undefined") return false;
    try {
      return window.sessionStorage.getItem(storageKey(saleId, errorType)) === "1";
    } catch {
      return false;
    }
  }, []);

  const dismissError = useCallback((saleId: string, errorType: AuctionErrorType): void => {
    if (typeof window === "undefined") return;
    try {
      window.sessionStorage.setItem(storageKey(saleId, errorType), "1");
    } catch {
      /* quota */
    }
    bump();
  }, []);

  const clearDismissed = useCallback((saleId: string, errorType?: AuctionErrorType): void => {
    if (typeof window === "undefined") return;
    try {
      if (errorType) {
        window.sessionStorage.removeItem(storageKey(saleId, errorType));
      } else {
        const prefix = `${STORAGE_PREFIX}${saleId}:`;
        const keys: string[] = [];
        for (let i = 0; i < window.sessionStorage.length; i++) {
          const key = window.sessionStorage.key(i);
          if (key && key.startsWith(prefix)) keys.push(key);
        }
        keys.forEach((k) => window.sessionStorage.removeItem(k));
      }
    } catch {
      /* quota */
    }
    bump();
  }, []);

  return { isDismissed, dismissError, clearDismissed };
}
