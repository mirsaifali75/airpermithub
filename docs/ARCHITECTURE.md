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

Tokens live in `src/app/globals.css` (`@theme`): navy `#0B1E3A`, brand blue `#1E6FFF`, cyan `#00B4FF`, green `#22C55E` (verified/compliant/success only), canvas `#F5F7FB`, ink `#0F172A`, muted `#64748B`. Fonts: Plus Jakarta Sans (display), Inter (body). Utilities: `text-gradient-brand`, `bg-gradient-brand`, `glass-dark`, `container-page`.

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
