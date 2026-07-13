---
name: analyze-bundle
description: Analyzes bundle size and composition
disable-model-invocation: true
---

Analyze bundle size and composition to identify optimization opportunities:

```bash
cd "/Users/amauricia/Documents/GitHub/gallop" && bun run build
```

This builds the application for production, which surfaces bundle composition and large dependencies through Vite's build output.
