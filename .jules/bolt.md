## Bolt's Core Principles

* When performing performance optimization tasks (as the 'Bolt' persona), always run linting and tests before creating a PR, add comments explaining optimizations, measure and document the performance impact, do not modify configuration files (like package.json) without instruction, and log only critical, codebase-specific learnings in .jules/bolt.md.
* The project uses Vitest as its testing framework, with configurations in vitest.config.ts.
* The project utilizes Bun as the primary package manager and runtime; use `bun` commands for installation and script execution as `npm` and `npx` are prone to failure in this environment.
* The frontend architecture uses React, TypeScript, TanStack Router for routing, and shadcn/ui components (located in src/components/ui/).
* The project implements an OPFS (Origin Private File System) abstraction in src/services/opfsService.ts, while src/services/storageAdapter.ts manages a fallback to localStorage if OPFS is unavailable.
* Use 'bun test' to run the test suite in this repository; 'npm test' and 'npx vitest' may fail due to environment or network restrictions.
* The pedigreeMap in src/game/pedigreeData.ts stores horse names as lowercased keys, and findHorseByName performs case-insensitive lookups using .toLowerCase().
* The SidebarProvider in src/components/ui/sidebar.tsx persists the 'sidebar_state' cookie using 'Secure' and 'SameSite=Lax' attributes.
