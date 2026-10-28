# AirPermitHub

Air Permitting. Compliance. Simplified.

Phase 1 of the AirPermitHub web app: Next.js 15 (App Router) + TypeScript + Tailwind CSS v4, with a Prisma/PostgreSQL schema ready for Phase 2.

## Run locally

```bash
npm install
npm run dev          # http://localhost:3000
npm run build && npm start
```

Checks (CI runs the same on every push to `main`):

```bash
npm run check        # typecheck + ESLint + unit tests
npm test             # Vitest: calculator math, screening rules, API validation, data integrity
npm run check-links  # checks every outbound source link; needs open internet (runs weekly in GitHub Actions)
```

Optional database tooling:

```bash
cp .env.example .env   # set DATABASE_URL
npx prisma validate
npx prisma generate
npx prisma migrate dev
```

## State data

State hubs render from `data/states/*.json`. Refresh them from the research dataset with:

```bash
node scripts/sync-state-data.mjs /path/to/air-permits
```

Then rebuild; each JSON file becomes a live `/states/[slug]` hub.

## Content rules

- Regulatory summaries never state thresholds, limits, or deadlines; numbers appear only as verbatim quotes from a cited agency page.
- Demo data (jobs, permits, compliance, calculator demo values) is always labeled.
- Calculators ship with no emission factors; users enter and cite them.

See `docs/ARCHITECTURE.md` for the information architecture, component system, and database design.
