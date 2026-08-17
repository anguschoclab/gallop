
## 2025-02-18 - Type-safe Route Links Without `any`
**Learning:** Building dynamic objects (like `{ to, params }`) for TanStack Router's `<Link>` component often strips strict literal typings, resulting in `string` or `Record<string, string>` types that force `as any` casts at the JSX layer.
**Action:** Instead of generating intermediate generalized path objects, render `<Link>` conditionally inline. This preserves the strict linkage between the route `to` literal and its corresponding `params` interface without type assertions.
