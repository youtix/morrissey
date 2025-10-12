# Contributing

- Use Bun 1.2.x and install deps with `bun install`.
- Follow Conventional Commits. Use `bun run commit` to open a guided prompt.
- Run `bun run lint` and `bun run type:check` before pushing.
- Ensure tests pass with `bun run test`.

## Branching

- Work off feature branches and open PRs against `main`.

## Commit message format (Conventional Commits)

- `feat: add new capability`
- `fix: correct a bug`
- `docs: update docs`
- `chore: tooling changes`

## Release process

- Merges to `main` trigger semantic-release to publish a GitHub Release and update the changelog.
