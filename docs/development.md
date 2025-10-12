# Development

Prerequisites

- Bun 1.2.x installed

Install dependencies

- `bun install`

Environment

- Bun automatically loads `.env`. Use `.env.development` for local overrides (gitignored).

Commands

- Start: `bun run start`
- Lint: `bun run lint`
- Format: `bun run format`
- Type check: `bun run type:check`
- Test: `bun run test` (with coverage)
- Build: `bun run build` (outputs to `dist/`)

Commits

- Use `bun run commit` for Commitizen prompts (Conventional Commits).
