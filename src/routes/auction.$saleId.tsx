import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
import { auctionBrowseSearchSchema } from "@/components/auction/auctionSearchSchema";

export const Route = createFileRoute("/auction/$saleId")({
  validateSearch: auctionBrowseSearchSchema,
  component: lazyRouteComponent(() => import("@/components/routes/AuctionSalePage")),
});
