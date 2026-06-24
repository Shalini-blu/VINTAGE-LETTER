# Letterpress

A typewriter-themed letter writing app where users compose, seal, and share handcrafted digital letters through a vintage mechanical typewriter interface.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/letterpress run dev` — run the frontend (port 19469)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Tailwind CSS, shadcn/ui, wouter, framer-motion
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI contract (source of truth)
- `lib/api-client-react/src/generated/` — generated React Query hooks
- `lib/api-zod/src/generated/` — generated Zod schemas for server validation
- `lib/db/src/schema/letters.ts` — letters DB schema
- `artifacts/api-server/src/routes/letters.ts` — all letter API routes
- `artifacts/letterpress/src/` — React frontend
  - `pages/dashboard.tsx` — inbox / letter grid
  - `pages/write.tsx` — typewriter writing studio
  - `pages/seal.tsx` — envelope & wax seal customization
  - `pages/preview.tsx` — reveal animation + send/download
  - `components/envelope.tsx` — reusable envelope component
  - `components/wax-seal.tsx` — reusable wax seal SVG component

## Architecture decisions

- OpenAPI-first: all API contracts defined in `lib/api-spec/openapi.yaml` before implementation
- Nullable fields in Letter schema use `nullable: true` in OpenAPI (not just `optional`) to match Postgres NULL returns
- Share tokens are generated server-side with `crypto.randomBytes` and stored on the letter row; no separate share table
- Paper textures and envelope styles are CSS class-based (no image files), making them fast and portable
- Auto-save in the writing studio triggers 1.2s after the last keystroke to avoid excessive API calls

## Product

- **Dashboard**: Grid of saved letters with status badges, paper texture previews, and stats (total / drafts / sent)
- **Writing Studio**: A functional typewriter machine — keyboard keys animate on press, carriage moves right as you type, resets on Enter. Hidden slide-out panel for font (6 options), ink color (6 swatches), and paper texture (5 options). Auto-saves as draft.
- **Envelope & Seal**: Live envelope preview with 4 envelope styles, 6 wax seal symbols, 6 wax colors, and addressing fields
- **Preview & Send**: Sealed envelope reveals letter with animated flap opening when wax seal is clicked. Download as text, copy shareable link, or send via email (mailto)

## Gotchas

- After any OpenAPI spec change, run codegen before using updated types: `pnpm --filter @workspace/api-spec run codegen`
- The `lib/api-zod/src/index.ts` exports only from `./generated/api` (not `./generated/types`) to avoid duplicate export conflicts

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- Google Fonts imported at top of `artifacts/letterpress/src/index.css`: Special Elite, Courier Prime, Playfair Display, IM Fell English, Dancing Script, Libre Baskerville
