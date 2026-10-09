<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## References

- For Clean Code rules, see docs/CLEAN_CODE.md

## Development

- Package manager is pnpm 9.4.0 (`packageManager` in `package.json`). Enable it with `corepack prepare pnpm@9.4.0 --activate`.
- Copy `.env.example` to `.env`. `DATABASE_URL` is `postgresql://postgres:postgres@localhost:5441/postgres`.
- Cloud Agents start PostgreSQL 17 on `localhost:5441` at boot. With Docker, `docker compose up -d` from `compose.yaml` publishes that same port.
- `MISTRAL_API_KEY` is required for Categorise. `POST /api/ocr` sends the PDF to Mistral model `mistral-ocr-2512`.
- `pnpm exec prisma generate` writes the client to `app/generated/prisma` (gitignored). The schema has no models and no migrations yet.
- Dev server: `pnpm dev` at http://localhost:3000. Checks: `pnpm lint`, `pnpm format:check`, and `pnpm build`.
