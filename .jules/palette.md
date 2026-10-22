## 2025-02-21 - Added ARIA attributes to expandable Valuation button
**Learning:** Collapsible sections like the "Valuation" panel in BloodstockGrid need explicit `aria-expanded` and `aria-controls` attributes connecting the trigger button and content region to ensure screen reader users understand the panel's state and can navigate to it.
**Action:** Always verify that custom expandable/collapsible elements implemented outside of standard design system components include correct `aria-expanded` and `aria-controls` pairings.
