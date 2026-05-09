# Gallop: Horse Racing Simulation

Gallop is a high-fidelity, data-driven horse racing management simulation. The project prioritizes authenticity ("Numbers over noise") and provides a deep simulation of breeding, training, and racing.

## Technology Stack

- **Framework:** [TanStack Start](https://tanstack.com/router/v1/docs/guide/start/overview) (React + TypeScript)
- **State Management:** [Zustand](https://github.com/pmndrs/zustand) with domain-specific hooks
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
- **Components:** [Radix UI](https://www.radix-ui.com/) primitives
- **Charts:** [Recharts](https://recharts.org/)
- **Simulation Logic:** Specialized domain logic for genetics, racing physics, and economics. Much of this is offloaded to Web Workers.
- **Concurrency:** [Comlink](https://github.com/GoogleChromeLabs/comlink) for seamless Web Worker communication.
- **Build Tool:** [Vite](https://vitejs.dev/) (via `@lovable.dev/vite-tanstack-config`)
- **Runtime:** [Bun](https://bun.sh/)
- **Deployment:** [Cloudflare Pages](https://pages.cloudflare.com/) (via Wrangler)

## Project Architecture

- `src/core/`: The "Engine". Contains pure domain logic (genetics, breeding, race resolution, financial models).
- `src/game/`: The "Glue". State management (Zustand), game loop orchestration, and system-level hooks.
- `src/game/hooks/`: **CRITICAL.** Custom hooks for accessing state (e.g., `useHorses`, `useCash`).
- `src/components/`: Reusable UI components. Domain-specific components like `HorsePortrait`, `BeyerChart`, and `RacingSilks` are found here.
- `src/routes/`: Application pages and routing using TanStack Router.
- `src/workers/`: Web Workers for computationally intensive tasks (e.g., race resolution, data processing).
- `docs/design-bible/`: The source of truth for UI/UX principles and horse racing domain knowledge.
- `scripts/`: Utility scripts for data ingestion and simulation analysis.

## Key Commands

- `bun dev`: Starts the development server.
- `bun build`: Builds the application for production.
- `bun test`: Runs unit tests using Vitest.
- `bun lint`: Runs ESLint for code quality.
- `bun format`: Formats code with Prettier.
- `bun storybook`: Starts Storybook for component development.

## Development Conventions

### State Management (Zustand)
To prevent infinite re-render loops and ensure performance, follow these rules (see `docs/zustand-best-practices.md`):
- **NEVER** use object selectors like `useGame(s => ({ a: s.a, b: s.b }))`.
- **PREFER** domain-specific hooks from `@/game/hooks/` (e.g., `useHorses`, `useDay`).
- Use `useGameWithShallow` for selecting multiple stable references.

### UI/UX Philosophy
- **Numbers over noise:** Focus on scannable data and tabular figures (`tabular-nums`).
- **Authentic Racing:** Use real terms (Beyer, Furlong, Dosage). Provide tooltips for newcomers.
- **Race Day Atmosphere:** Subtle cues (silk colors, track surfaces) should be consistent across management screens.

### Testing
- Tests are located in `src/**/*.test.ts`.
- Vitest is configured with a custom `testSourceRedirectPlugin`. This allows tests in `src/tests/path/to/module.test.ts` to import from `./module` and correctly resolve to `src/path/to/module.ts`.

### Styling
- Use Tailwind CSS v4 utility classes.
- Follow the design tokens and patterns defined in `docs/design-bible/01-design-system/`.

## Domain Knowledge
Consult the `docs/design-bible/README.md` for a glossary of racing terms and the project's vision. Key concepts include:
- **Beyer Speed Figure:** Standardized performance metric.
- **Dosage:** Genetic profile for speed/stamina.
- **Graded Races:** Top-tier competition (G1, G2, G3).
- **Surfaces:** Turf, Dirt, and Synthetic, each affecting horse performance differently.
