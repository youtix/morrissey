# morrissey

Whale trade watcher and Telegram notifier, built with TypeScript and Bun.

- Runtime & PM: Bun 1.2.x
- Tests: Vitest (+ coverage)
- Lint: ESLint (tightened TS rules) + Prettier + import ordering
- Hooks: Husky + lint-staged, commitlint, Commitizen
- CI: GitHub Actions (lint, type-check, test, build)
- Security: CodeQL, Dependabot
- Releases: semantic-release to GitHub Releases

## Quick start

- Install deps: `bun install`
- Configure env in `.env` (and `.env.development` for local overrides)
- Start: `bun run start`

## Scripts

- Lint: `bun run lint`
- Type check: `bun run type:check`
- Test: `bun run test`
- Build: `bun run build`
- Format: `bun run format`
- Commit (guided): `bun run commit`

## Releasing

Merging to `main` triggers semantic-release to publish a GitHub Release and update `CHANGELOG.md`.

See `docs/` for more.
