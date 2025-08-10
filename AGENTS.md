# Repository Guidelines

## Project Structure & Module Organization

- Source: `app/` (Next.js App Router), shared UI in `components/`, utilities in `lib/`, assets in `public/`, styles in `styles/`.
- Tests: `__tests__/` mirrors feature folders (e.g., `__tests__/components/Button.test.tsx`).
- Data & infra: SQL in `sql/`, Supabase config in `supabase/`, scripts in `scripts/` (migrations, performance, security).

## Build, Test, and Development Commands

- `npm run dev`: Start local dev server.
- `npm run build`: Production build; use `npm start` to serve.
- `npm run test` | `test:watch` | `test:coverage`: Run Jest; coverage report and thresholds enforced.
- `npm run lint`: ESLint with zero warnings allowed.
- `npm run typecheck`: TypeScript no‑emit type checking.
- `npm run pre-deploy`: Typecheck, lint, tests, and production checks.
- Useful extras: `npm run bundle:report`, `npm run perf:test`, `npm run security:test`.

## Coding Style & Naming Conventions

- Language: TypeScript; React components `.tsx`, utilities `.ts`.
- Indentation: 2 spaces; prefer explicit types in public APIs.
- Naming: directories `kebab-case`; React components `PascalCase` (e.g., `SessionRecoveryModal.tsx`); utilities `kebab-case`.
- Lint/format: ESLint (`.eslintrc.json`) and Prettier. Run `npm run lint` and `npx prettier --write .` before committing.

## Testing Guidelines

- Frameworks: Jest + Testing Library (`jest.setup.js`, jsdom env).
- Locations: co‑locate under `__tests__/`; name as `*.test.ts(x)` or `*.spec.ts(x)`.
- Coverage: minimum 60% global (branches, lines, functions). Generate with `npm run test:coverage`.
- Examples: render components with `__tests__/test-utils.tsx` helpers; mock network with MSW if needed.

## Commit & Pull Request Guidelines

- Commits: follow Conventional Commits where possible (`feat`, `fix`, `docs`, `refactor(api)`, `chore`).
  - Example: `feat(api): add Zod validation to AI routes`.
- PRs: include clear description, linked issue, steps to test, and screenshots/GIFs for UI changes. Ensure CI equivalents pass (`pre-deploy`).

## Security & Configuration Tips

- Env: copy `.env.example` to `.env.local`; never commit secrets.
- Pre‑merge checks: `npm run security:test` and `npm run health-check`.
- Migrations: use `scripts/migrations/*` via `npm run migrate:create` / `migrate:up`.
- Optional: MCP server tooling lives in `mcp-server/` (`npm run mcp:start`).
