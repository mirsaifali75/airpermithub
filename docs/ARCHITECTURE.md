# AirPermitHub architecture (Phase 1)

## Principles

1. **No fabricated regulatory content.** Summaries describe program structure and point to citations. Thresholds, limits, and deadlines appear only as verbatim `quote` fields copied from a cited agency page.
2. **Provenance everywhere.** Every regulatory record shows its source, verification level, and last-reviewed date.
3. **Demo data is labeled.** Jobs, permits, and compliance records in Phase 1 are fictional and carry a "Demo" badge plus an `isDemo` flag.
4. **Dark cinematic top, light workspace.** Navy hero/headers; bright, readable tool surfaces.

## Information architecture

| Area | Route | Status |
| --- | --- | --- |
| Home | `/` | Built |
| Permit Finder | `/permit-finder` | Built (screening wizard) |
| Calculators | `/calculators`, `/calculators/[engines\|heaters\|flares\|tanks\|fugitives]` | Built |
| Applicability Checker | `/applicability` | Overview; screening runs in Permit Finder |
| Regulations | `/regulations`, `/regulations/federal`, `/regulations/[nsps\|neshap\|title-v\|nsr\|psd\|nonattainment-nsr\|ap-42]` | Built |
| State hubs | `/states`, `/states/[slug]` (all 50 + DC routes) | Hubs render from `data/states/*.json` |
| Industries | `/industries`, `/industries/[slug]` | Built; Oil & Gas is the flagship |
| Permit Library | `/permits` | UI with demo records |
| Compliance | `/compliance` | Dashboard + calendar preview (demo) |
| Jobs | `/jobs` | Board with filters (demo) |
| Resources | `/resources`, `/templates` | Catalog of planned guides/templates |
| Account | `/sign-in`, `/sign-up`, `/dashboard`, `/facilities` | UI; auth not wired |
| Admin | `/admin` | Module map |
| Guides | `/resources/[slug]` | 4 published guides (no thresholds; cite the governing text) |
| Templates API | `/api/v1/templates/[slug]` | AirPermitHub CSV templates and checklists |
| Company pages | `/jobs/companies/[slug]` | Fictional demo employers (noindex) |
| Search | `/search` + Ctrl/⌘K dialog | Static site index |
| API | `/api/v1/regulations`, `/api/v1/states`, `POST /api/v1/screening` | JSON for future mobile apps |

SEO aliases (`/nsps`, `/texas-air-permits`, `/oil-gas-air-permits`, …) are permanent redirects in `next.config.ts`. `sitemap.xml`, `robots.txt`, Organization/WebSite/SearchAction, BreadcrumbList, and Legislation JSON-LD are generated.

## Folder layout

```
src/
  app/                 routes (App Router, server components by default)
  components/
    brand/             Logo, LogoMark
    layout/            Header, Footer, PageHeader, ProsePage
    ui/                Button, Badge family, Section/Card, Notices, Accordion, Breadcrumbs
    search/            SearchDialog
    home/              homepage sections
    permit-finder/     PermitFinderWizard
    calculator/        EmissionCalculator
    regulations/ states/ jobs/ permits/ compliance/ auth/ illustrations/
  lib/
    data/              content modules + state profile loader
    calc/methods.ts    calculation math (no hard-coded factors)
    screening.ts       conservative screening logic
    search.ts          index + scoring
    auth/              provider-agnostic session/entitlement contract
    db/prisma.ts       Prisma client singleton
data/states/*.json     researched state profiles (sync with scripts/sync-state-data.mjs)
prisma/schema.prisma   database schema
```

## Design system

Tokens live in `src/app/globals.css` (`@theme`), using the approved 2026-10 palette: deep navy `#071A2B` (`navy-950`), navy `#0B2942` (`navy-900`), primary blue `#147DFF` (`brand-500`, fills/icons/borders), AA-safe blue `#0066DB` (`brand-600`, small text and button fills), electric blue `#0077FF` (`electric`, gradients), cyan `#00B8FF`, success green `#16834B` (`eco-600`, verified/compliant/success only), warning amber `#F5A623` (`amber-500`), error red `#D92D20` (`red-600`), background `#F5F8FC` (`canvas`), text `#0F172A` (`ink`), secondary `#64748B` (`muted`), border `#E2E8F0` (`line`). Fonts: Plus Jakarta Sans (display), Inter (body). Utilities: `text-gradient-brand`, `bg-gradient-brand`, `glass-dark`, `container-page`.

Status components map 1:1 to the brief's status system: `ContentStatusBadge`, `ApplicabilityBadge`, `ComplianceBadge`, `OriginBadge`, `VerificationBadge`, `DemoBadge`, `CitationBadge`, `ReviewedBadge`.

## Database

`prisma/schema.prisma` (validated). Key ideas:

- `Source` holds provenance and is linked from regulations, emission factors, permit programs, and permit documents.
- `Regulation` is a stable identity; content lives in immutable `RegulationVersion` rows with effective/superseded dates, revision notes, and reviewer.
- `EmissionFactor` stores value, units, source, section/table, revision date, version, and a supersession chain. GWPs are dated rows, never constants.
- `Calculation` + `CalculationResult` persist inputs, steps, and the factor (or a user factor with a required reference).
- `FacilityRegulation` records screening status, never a legal determination.
- `ComplianceRequirement` traces each obligation to a permit condition or citation; `ComplianceTask` schedules it.
- `AuditLog`, `ErrorReport`, `Announcement` support the admin console.

## Phase 2 hooks

- Replace `getSession()` in `src/lib/auth/session.ts` with a real provider (e.g. Auth.js + Prisma adapter).
- Swap static content modules for Prisma queries behind the same function signatures (`getRegulation`, `getStateProfile`, `search`).
- Factor library: populate `EmissionFactor` from verified sources and let calculators pick factors instead of manual entry.

## Phase 1.5 redesign notes

- `components/illustrations/Scene.tsx` draws photo-style dusk plant scenes (refinery, oil-gas, midstream, power, chemical, manufacturing, mining, waste, tank-farm). Swap any instance for a licensed photo later.
- `src/lib/data/us-map.json` is generated by `node scripts/build-us-map.mjs` from the Census-derived `us-atlas` package; it powers the State Explorer choropleth.
- Browser-only persistence until accounts launch: calculation set (`aph.calc.saved.v1`), compliance tasks (`aph.compliance.tasks.v1`, exportable to .ics), saved jobs (`aph.jobs.saved.v1`). The dashboard reads all three.
- No real company names or logos appear anywhere; demo employers and permits are labeled.

## Hardening (roadmap Phase 2)

- Security headers and CSP in `next.config.ts`. Pages are static, so inline scripts are allowed but every external origin is blocked.
- `POST /api/v1/screening` validates input strictly (`src/lib/api/validate-screening.ts`) and is rate limited per instance (`src/lib/api/rate-limit.ts`). Move to a shared store or Vercel firewall rules once the database exists.
- `npm audit` is clean via `overrides` in `package.json` (PostCSS inside Next 15, deepmerge-ts inside Prisma). Drop the overrides after upgrading to Next 16 / Prisma 7.
- Tests sit next to the code: `src/lib/calc/methods.test.ts`, `src/lib/screening.test.ts`, `src/lib/api/api.test.ts`, `src/lib/data/data-integrity.test.ts`. The data tests enforce the content rules (sourced thresholds, demo flags).
- Demo permits use `origin: "demo"` and their rows carry `data-nosnippet`.
- Vercel Web Analytics and Speed Insights are mounted in `src/app/layout.tsx`; enable both in the Vercel project for them to collect data.
- `.github/workflows/ci.yml` runs typecheck, lint, tests, and build; `.github/workflows/link-check.yml` runs `scripts/check-links.mjs` weekly and attaches the report.

## Roadmap phases 3–9 (2026-10-28)

- **Palette:** see Design system above. White text sits on `brand-600` or darker; `brand-500` is for fills, icons, and borders. `muted` and `slate-500` are `#5E6D82` so secondary text passes AA on the canvas background.
- **Home:** hero search posts to `/search?q=&type=`; popular chips link only to existing pages.
- **Permit Finder:** 7 steps. `screen()` returns four outcomes (`potentially-applicable`, `more-info-needed` = Additional Review Required, `insufficient-info`, `likely-not-applicable` = based on entered information). "Likely not" is only produced from the user's own answers (non-oil-and-gas industry, area HAP source, all-attainment county); see `src/lib/screening.test.ts`.
- **Calculators:** workspace tabs (Inputs, Method & Factors, Results, References). Inputs flagged `perPollutant` (weight fraction) live on each pollutant row with its factors, control efficiency, GWP, and citation. Saved rows keep the `aph.calc.saved.v1` shape.
- **Tabs (`components/ui/Tabs.tsx`):** pill or underline, arrow keys, `?tab=` and `#hash` deep links, `printAll` for printing every panel. Used by regulation pages, state hubs, the calculator, resources, and company pages.
- **Compliance:** Month, Week, Day, List views (`?view=`).
- **QA:** Playwright sweep of 40 routes at 1440px and 390px (no overflow, no console errors, one h1 each) and axe-core WCAG 2 A/AA on 12 key pages with no violations.

## Practitioner tools (2026-10-29)

Tools built around recurring air permitting problems. The math lives in `src/lib/tools/` as pure, tested functions; components in `src/components/tools/` only render it.

| Route | What it does | Logic |
|---|---|---|
| `/tools` | Hub, framed by the problem each tool answers | `lib/tools/catalog.ts` |
| `/tools/rolling-12-month-tracker` | N-month rolling sum or average vs. a limit, next-month headroom, forecast | `rolling.ts` |
| `/tools/nsr-baseline-calculator` | Highest eligible consecutive baseline window across units; Step 1 and hybrid sums | `nsr.ts` (rule text quoted verbatim from govinfo.gov) |
| `/tools/compliance-matrix-builder` | Permit text to conditions with keyword-suggested type, frequency, citations, deadline phrases; pushes dated rows to the Compliance Calendar store | `matrix.ts` |
| `/tools/deviation-log` | Deviations grouped by the permit's reporting periods; CSV export | `deviations.ts` |
| `/tools/[slug]` | Eight unit converters (ppm, O2, lb/MMBtu, g/hp-hr, tpy, mg/m³, wet/dry) with steps and FAQ schema | `converters.ts` |
| `/regulatory-updates` | EPA rules and proposals from the Federal Register API by 40 CFR part; ISR every 6 hours; falls back to search links | `lib/fedreg.ts` |
| `/glossary` | Terms with plain-language definitions and CFR citations; DefinedTermSet schema | `lib/data/glossary.ts` |

Rules the tools follow: regulatory values (limits, significance levels, F-factors, reference O2) are entered by the user, never prefilled; examples are labeled; tool data stays in localStorage (`aph.tools.*.v1`). The matrix builder writes to `aph.compliance.tasks.v1` in the calendar's existing shape.

Practitioner guides are in `lib/data/practitioner-guides.ts` and merge into `guides`. `src/lib/links-export.test.ts` exports every source URL built in code so the weekly link check covers them; `src/lib/tools/internal-links.test.ts` fails the build if a tool, guide, or glossary link points to a page that doesn't exist.
