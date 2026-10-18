import { z } from "zod";

export const auctionBrowseSearchSchema = z.object({
  sex: z.enum(["colt", "filly", "gelding", "mare"]).optional(),
  ageBand: z.enum(["weanling", "yearling", "2yo", "3yo+"]).optional(),
  reserveBand: z.enum(["under10k", "10k-50k", "over50k"]).optional(),
  sort: z.enum(["lot", "reserve-asc", "reserve-desc"]).optional(),
  q: z.string().optional(),
});

export type AuctionBrowseSearch = z.infer<typeof auctionBrowseSearchSchema>;
