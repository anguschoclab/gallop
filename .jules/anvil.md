## 2025-02-28 - Strengthened buildCampaignIntent

**Learning:** The `buildCampaignIntent` helper function in `src/core/campaign/campaignActions.ts` was typing the intent payload loosely as `<T extends Record<string, unknown>>` and asserting the return type as `AnyIntent`. This bypassed TypeScript's strict type checking on intents when enqueueing them, enabling you to pass incorrect properties (or omit required properties) without triggering any errors, essentially masking runtime bugs (since missing intents can cause subtle logic failures).

**Action:** By typing `TType extends AnyIntent["type"]` and conditionally extracting the expected intent `Extract<AnyIntent, { type: TType }>`, and requiring the `payload` to strictly `Omit` the standard `Intent` fields from that extracted intent, we turn a loose unchecked cast into a strict contract that the payload matches the expected shape for that intent type exactly.
