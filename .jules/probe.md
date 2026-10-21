## 2024-05-19 - Test file creation for price alert messages
**Learning:** `priceAlertMessages.ts` contained formatting logic for price alerts and market trades that lacked dedicated test coverage. Testing UI formatting strings is valuable to ensure players get clear, accurate information.
**Action:** Added a complete test suite that verifies string outputs for different alert scopes and trade sides, which makes it safer to update these messages in the future.
