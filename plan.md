1. **Optimize O(N) Lookups in `StaffSupportPanel.tsx`**:
   - Currently, `StaffSupportPanel` runs `staffForStable.find(...)` 5 times in every render. Even though the array length might be short, it is an unnecessary O(N) loop run multiple times on each render.
   - Refactor it to use a `Map` structure using `useMemo` so we have an O(1) lookup:
     `const staffRoleMap = useMemo(() => new Map(staffForStable.map((s) => [s.role, s])), [staffForStable]);`
   - Retrieve each role like `staffRoleMap.get("nutritionist")`.
   - Update imports to include `useMemo` from React.
2. **Complete Pre-Commit Steps**:
   - Run the test suite (`bun x vitest run`) and other verification checks to ensure we haven't broken the application.
3. **Submit the PR**:
   - Title: `⚡ Bolt: [performance improvement] Optimize StaffSupportPanel lookups`
   - Description detailing the optimization, why it was done, the impact, and how to verify it.
