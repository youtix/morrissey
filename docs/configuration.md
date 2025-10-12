# Configuration

Environment variables (loaded by Bun from `.env` and optionally `.env.development`):

- `LOG_LEVEL` — `debug` | `info` | `warn` | `error`
- `TELEGRAM_BOT_TOKEN` — Telegram bot token
- `TELEGRAM_BOT_NAME` — Bot username
- `TELEGRAM_ADMIN_IDS` — Comma-separated numeric user IDs
- `HYPERLIQUID_COINS` — Comma-separated list of coins (e.g., `BTC-PERP,ETH-PERP`)

Production best practice

- Do not commit real secrets to the repo. Use GitHub Actions secrets or runtime environment.
