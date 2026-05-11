## 2024-05-18 - [Add Content Security Policy (CSP)]

**Vulnerability:** Found lack of security headers in `src/routes/__root.tsx`.
**Learning:** Without a Content Security Policy (CSP), the application lacks defense-in-depth against Cross-Site Scripting (XSS) and potential data exfiltration. If malicious scripts somehow find their way into the client app, they could freely execute or communicate with external domains.
**Prevention:** Always define a baseline `Content-Security-Policy` to restrict sources for scripts, styles, images, and other resources.

### React Security and `dangerouslySetInnerHTML`

When injecting dynamic styles in React, using `dangerouslySetInnerHTML` to render a `<style>` block introduces an XSS vulnerability if variables like `id` can be controlled. React securely handles children inside `<style>` tags by automatically escaping potentially malicious HTML tags during SSR and correctly setting text content during CSR. Always replace `dangerouslySetInnerHTML` with direct JSX children (e.g., `<style>{dynamicCssString}</style>`) to resolve these issues securely without adding bloat like DOMPurify.

## 2024-05-18 - [Add rel="noopener noreferrer" to target="_blank" links]

**Vulnerability:** Found `target="_blank"` links in `src/components/RaceEntry.tsx` without `rel="noopener noreferrer"`.
**Learning:** External or new-tab links opening via `target="_blank"` are vulnerable to reverse tabnabbing. The newly opened tab can manipulate the original page using `window.opener`, potentially redirecting the user to a malicious site.
**Prevention:** Always append `rel="noopener noreferrer"` to any anchor tag or `<Link>` component that opens in a new tab to break the `window.opener` reference.

## 2025-02-09 - [Prevent reverse tabnabbing vulnerability]
**Vulnerability:** Found `<Link>` components in `src/components/RaceEntry.tsx` using `target="_blank"` with only `rel="noopener"`.
**Learning:** While `rel="noopener"` prevents the new tab from accessing `window.opener` on modern browsers, adding `noreferrer` is a best practice defense-in-depth approach to ensure no referrer information is leaked and provides broader legacy browser protection against reverse tabnabbing.
**Prevention:** Always use `rel="noopener noreferrer"` when using `target="_blank"` on links opening user-generated or potentially external content.

## 2024-05-20 - [Remove dangerouslySetInnerHTML from AwardIcon]
**Vulnerability:** Found `dangerouslySetInnerHTML` used to render raw SVG strings from `src/assets/awards/*/*.ts` in `src/components/awards/AwardIcon.tsx`.
**Learning:** Injecting raw HTML/SVG strings into the DOM is a classic anti-pattern in React that bypasses its built-in XSS protections. While these strings were trusted static assets, relying on string injection introduces a dormant XSS vulnerability if the SVGs are ever manipulated, sourced externally, or if the logic is copied for user-provided data. It also goes against React best practices and fails to leverage componentization. Furthermore, attempting to "fix" this by adding external sanitization libraries (like DOMPurify) for trusted static assets is considered security theater and introduces unnecessary bundle bloat.
**Prevention:** Always refactor static SVG files into functional React components (`.tsx`). This completely eliminates the need for `dangerouslySetInnerHTML`, removes the XSS vector entirely, reduces reliance on external sanitizers, and provides proper typing and prop passing (e.g., `width`, `height`, `className`) for dynamic control.
