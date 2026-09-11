/**
 * narrative/newsTypes.ts - Re-export from @/core/narrative/newsTypes
 *
 * The canonical type definitions now live in core. This re-export keeps
 * existing service importers working.
 *
 * @deprecated Import from @/core/narrative/newsTypes instead.
 */

export type {
  NewsCategory,
  NewsImportance,
  EntityLink,
  NewsItem,
} from "@/core/narrative/newsTypes";
