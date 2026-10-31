/**
 * Where the site's reference content comes from at build time.
 *  - "files": data/ and the src/lib/data modules, as reviewed in git (today).
 *  - "database": the published versions in Postgres, exported to .content/ by
 *    scripts/db-build.ts before `next build`. Switch only after the parity
 *    test passes against the production database.
 */
export const CONTENT_SOURCE: "files" | "database" = "files";
