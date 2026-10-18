## 2024-10-18 - Isolated Nav Button ARIA Labels
**Learning:** Native `onClick` back/return buttons lacking specific `<button>` ARIA context create unannounced trap states for screen readers in high-traffic exchange screens like `AuctionSalePage`.
**Action:** When adding isolated navigation actions with visual back arrows, strictly audit the HTML button element for `aria-label` context describing the destination, rather than relying on textual flow.
