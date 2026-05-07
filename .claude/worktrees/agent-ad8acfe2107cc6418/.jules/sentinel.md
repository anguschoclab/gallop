
## 2024-05-18 - [Add Content Security Policy (CSP)]
**Vulnerability:** Found lack of security headers in `src/routes/__root.tsx`.
**Learning:** Without a Content Security Policy (CSP), the application lacks defense-in-depth against Cross-Site Scripting (XSS) and potential data exfiltration. If malicious scripts somehow find their way into the client app, they could freely execute or communicate with external domains.
**Prevention:** Always define a baseline `Content-Security-Policy` to restrict sources for scripts, styles, images, and other resources.
