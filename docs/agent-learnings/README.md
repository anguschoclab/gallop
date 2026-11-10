# Agent Learnings Archive

Raw learning journals archived from the deprecated Jules service's `.jules/` folder
(removed 2026-11-10). Each file is a dated log of lessons written by a specialist
agent persona as it worked on the codebase.

The personas — distilled, with their learnings folded in — now live as Claude
agents in `.claude/agents/`:

| Journal      | Claude agent | Specialty                                   |
| ------------ | ------------ | ------------------------------------------- |
| `anvil.md`   | `anvil`      | Type safety — eliminating `any` casts       |
| `bolt.md`    | `bolt`       | Render performance, memoization             |
| `groom.md`   | `groom`      | UX polish — empty states, disabled tooltips |
| `herald.md`  | `herald`     | Narrative/flavor content                    |
| `mason.md`   | `mason`      | Dead-code removal                           |
| `palette.md` | `palette`    | Accessibility                               |
| `sentinel.md`| `sentinel`   | Security patterns                           |
| `tipster.md` | `tipster`    | Horse-insight system domain                 |

These journals are kept for provenance — the agent files carry the actionable
rules; these carry the original dates and context.

The `.claude/agents/` files share a harmonized structure: role, a "Where the
code lives" path map, rules distilled from these journals plus later findings
(e.g. the 2026-11-10 perf-scan protocol in `docs/megaplan/code-ledger.md`),
a method, verification commands, and "Boundaries" for hand-offs between agents.
