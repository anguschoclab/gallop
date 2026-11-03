## 2026-11-03 - Found pure validation logic without tests
**Learning:** Pure business logic functions extracted from slices (like `syndicateActions.ts`) sometimes miss test coverage during the extraction process if not caught by a systematic review. These are high-value, easy-to-test targets.
**Action:** When finding newly extracted domains (like `syndicateActions`), actively verify test coverage for pure calculation and validation helpers.
