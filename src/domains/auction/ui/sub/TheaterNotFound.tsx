/**
 * TheaterNotFound.tsx - Missing-sale view for the auction theater
 */

import { useRouter, useNavigate } from "@tanstack/react-router";
import { Button } from "@/shared/ui/button";
import { AuctionErrorState } from "@/domains/auction/ui/AuctionStates";
import type { AuctionErrorType } from "@/domains/auction/application/hooks/useDismissedAuctionErrors";

interface TheaterNotFoundProps {
  saleId: string;
  isDismissed: (saleId: string, type: AuctionErrorType) => boolean;
  dismissError: (saleId: string, type: AuctionErrorType) => void;
  clearDismissed: (saleId: string, errorType?: AuctionErrorType) => void;
}

export function TheaterNotFound({
  saleId,
  isDismissed,
  dismissError,
  clearDismissed,
}: TheaterNotFoundProps) {
  const navigate = useNavigate();
  const router = useRouter();

  if (isDismissed(saleId, "sale_not_found")) {
    return null;
  }
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <AuctionErrorState
        message="Sale not found in the registry."
        onDismiss={() => dismissError(saleId, "sale_not_found")}
        onRetry={() => {
          clearDismissed(saleId, "sale_not_found");
          router.invalidate();
        }}
        retryLabel="Reload Sale"
      />
      <Button onClick={() => navigate({ to: "/auction" })}>Back to Sales</Button>
    </div>
  );
}
