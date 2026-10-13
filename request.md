# Request Plan Review

I plan to replace `React.FC<any>` with `React.ComponentType<LedgerEntryProps>` in `src/components/settings/SaveTab.tsx` and `src/components/settings/LoadTab.tsx`.

Steps:

1. Export `LedgerEntryProps` from `src/components/settings/LedgerEntry.tsx`.
2. Import `LedgerEntryProps` in `src/components/settings/SaveTab.tsx` and `src/components/settings/LoadTab.tsx`.
3. Change the type of `LedgerEntryComponent` from `React.FC<any>` to `React.ComponentType<LedgerEntryProps>` in both files.
4. Update `src/tests/components/SaveTab.test.tsx` to ensure `LedgerEntryMock` implements `LedgerEntryProps` correctly, removing the `as any` casting.
