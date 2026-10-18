import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router";
import { auctionBrowseSearchSchema } from "@/domains/auction/ui/auctionSearchSchema";

export const Route = createFileRoute("/auction/$saleId")({
  validateSearch: auctionBrowseSearchSchema,
  component: lazyRouteComponent(() => import("@/domains/auction/ui/pages/AuctionSalePage")),
});
