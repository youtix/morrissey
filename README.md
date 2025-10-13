![CI](https://github.com/youtix/morrissey/actions/workflows/ci.yml/badge.svg)
![License](https://img.shields.io/github/license/youtix/morrissey)
![Bun](https://img.shields.io/badge/runtime-bun-blue?logo=bun)
![TypeScript](https://img.shields.io/badge/language-typescript-blue?logo=typescript)
![Vitest](https://img.shields.io/badge/test-vitest-6E9F18?logo=vitest)

# Morrissey

<img width="225" height="300" alt="image" src="https://github.com/user-attachments/assets/1645b2d4-7381-4e8f-8706-34218a35a59b" />

-Evan Morrissey

Telegram bot looking for insider trading, built with TypeScript and Bun.

- Runtime & PM: Bun 1.2.x
- Tests: Vitest (+ coverage)
- Lint: ESLint (tightened TS rules) + Prettier + import ordering
- Hooks: Husky + lint-staged, commitlint, Commitizen
- CI: GitHub Actions (lint, type-check, test, build)
- Security: CodeQL, Renovate
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
