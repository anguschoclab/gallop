---
name: verify-spec
description: Verifies that code implementation matches a feature spec document. Use when checking whether what was built matches what was specified — invoke with a path to the spec file or paste the spec inline to get a structured gap analysis. Trigger for requests like "check if we implemented the spec", "does the code match the requirements", "verify the feature against the spec", "/verify-spec path/to/spec.md", "did we build everything in the spec", or whenever the user shares a spec and wants to confirm implementation completeness. Also trigger proactively when the user finishes implementing a feature and there's a visible spec nearby.
---

# Verify Spec

Check that the codebase implements everything described in a feature spec, then produce a structured gap report with actionable next steps.

## Invocation

The user will either:

- Give a file path: `/verify-spec path/to/spec.md`
- Paste spec content directly in the chat
- Ask you to check against a spec already visible in the conversation

If no spec is provided and none is obvious, ask the user where the spec lives before proceeding.

## Process

### Step 1: Read the spec

Read the spec document in full. Accept any format — Markdown, plain text, exported docs, etc. If it's a URL, fetch it.

### Step 2: Extract requirements

Parse the spec into a flat list of concrete, checkable requirements. Group by feature area if the spec has sections.

Categorize each requirement as one of:

- **Functional** — what the feature must do
- **UI/UX** — how it should look or behave in the interface
- **Edge case** — how errors, empty states, and limits should be handled
- **Non-functional** — performance, security, accessibility (note these but flag that they need runtime verification)

Skip purely aspirational language ("should feel fast", "delightful UX") unless there's something concrete behind it. When in doubt, include it marked as unverifiable.

### Step 3: Search the codebase

For each requirement, search for the relevant implementation. Think about where the feature would live — routes, components, services, API handlers, database schemas, tests.

A requirement may be spread across several files. If tests exist that explicitly cover a requirement, that's strong positive evidence. Note the file and line when you find something.

### Step 4: Output the report

Use this exact structure:

```
## Verification Report: [Spec Name or Feature Name]

### Summary
- ✅ Implemented: X
- ⚠️ Partial: Y
- ❌ Missing: Z
- ❓ Unverifiable from static analysis: W

---

### [Feature Area]

| Requirement | Status | Evidence / Notes |
|-------------|--------|-----------------|
| User can log in with email and password | ✅ | `src/auth/login.ts:34` |
| Shows validation error on bad input | ⚠️ Partial | Error thrown but not surfaced in UI — `src/auth/login.ts:61` |
| Locks account after 5 failed attempts | ❌ Missing | No rate limiting found |
| Accessible via screen reader | ❓ Unverifiable | Requires manual testing |

---

### Gaps to Address

1. **[Missing or partial requirement]** — [where to look and what to add, in one sentence]
2. ...
```

#### Status meanings

- **✅ Implemented** — clear evidence the requirement is met
- **⚠️ Partial** — implementation exists but something concrete is missing (e.g., happy path works, error case doesn't)
- **❌ Missing** — no implementation found
- **❓ Unverifiable** — can't determine from static analysis (runtime behavior, visual rendering, manual flows)

### Step 5: Prioritize gaps

After the table, list gaps in rough priority order (missing critical paths first, edge cases and non-functionals last). For each gap, suggest in one sentence where the fix should go. Don't implement anything unless asked — the goal is to hand the user a clear punch list.

## Tips

- Be honest about uncertainty. If you can't find something, say so — don't assume it's implemented just because the feature area has some code.
- Partial is better than binary. A requirement that's 80% done shouldn't be marked ❌ or ✅ — ⚠️ with a note is more useful.
- Link to code. Always include file paths when you find evidence. It saves the user from having to re-search.
- Tests count. If a test asserts the behavior, that's evidence of intent and implementation — note it.
