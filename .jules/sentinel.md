
## 2024-05-18 - [Add Content Security Policy (CSP)]
**Vulnerability:** Found lack of security headers in `src/routes/__root.tsx`.
**Learning:** Without a Content Security Policy (CSP), the application lacks defense-in-depth against Cross-Site Scripting (XSS) and potential data exfiltration. If malicious scripts somehow find their way into the client app, they could freely execute or communicate with external domains.
**Prevention:** Always define a baseline `Content-Security-Policy` to restrict sources for scripts, styles, images, and other resources.

### React Security and `dangerouslySetInnerHTML`
When injecting dynamic styles in React, using `dangerouslySetInnerHTML` to render a `<style>` block introduces an XSS vulnerability if variables like `id` can be controlled. React securely handles children inside `<style>` tags by automatically escaping potentially malicious HTML tags during SSR and correctly setting text content during CSR. Always replace `dangerouslySetInnerHTML` with direct JSX children (e.g., `<style>{dynamicCssString}</style>`) to resolve these issues securely without adding bloat like DOMPurify.
