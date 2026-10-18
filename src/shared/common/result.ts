/**
 * result.ts - Generic action result type
 *
 * A simple discriminated union used by store actions and core functions
 * to indicate success or failure with a reason.
 */

export type ActionResult = { ok: true } | { ok: false; reason: string };
