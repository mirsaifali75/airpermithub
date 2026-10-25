/**
 * Tile-grid positions for all 50 states + DC. Every state has a route;
 * program detail comes from researched profiles (see state-profiles.ts).
 * States without a profile render an honest "not yet researched" page.
 */

export interface StateTile {
  code: string;
  name: string;
  slug: string;
  /** Position on the tile-grid map. */
  row: number;
  col: number;
}

const t = (code: string, name: string, row: number, col: number): StateTile => ({
  code,
  name,
  slug: name.toLowerCase().replace(/\s+/g, "-"),
  row,
  col,
});

export const stateTiles: StateTile[] = [
  t("AK", "Alaska", 0, 0), t("ME", "Maine", 0, 10),
  t("WI", "Wisconsin", 1, 5), t("VT", "Vermont", 1, 9), t("NH", "New Hampshire", 1, 10),
  t("WA", "Washington", 2, 0), t("ID", "Idaho", 2, 1), t("MT", "Montana", 2, 2), t("ND", "North Dakota", 2, 3),
  t("MN", "Minnesota", 2, 4), t("IL", "Illinois", 2, 5), t("MI", "Michigan", 2, 6), t("NY", "New York", 2, 8),
  t("MA", "Massachusetts", 2, 9), t("RI", "Rhode Island", 2, 10),
  t("OR", "Oregon", 3, 0), t("NV", "Nevada", 3, 1), t("WY", "Wyoming", 3, 2), t("SD", "South Dakota", 3, 3),
  t("IA", "Iowa", 3, 4), t("IN", "Indiana", 3, 5), t("OH", "Ohio", 3, 6), t("PA", "Pennsylvania", 3, 7),
  t("NJ", "New Jersey", 3, 8), t("CT", "Connecticut", 3, 9),
  t("CA", "California", 4, 0), t("UT", "Utah", 4, 1), t("CO", "Colorado", 4, 2), t("NE", "Nebraska", 4, 3),
  t("MO", "Missouri", 4, 4), t("KY", "Kentucky", 4, 5), t("WV", "West Virginia", 4, 6), t("VA", "Virginia", 4, 7),
  t("MD", "Maryland", 4, 8), t("DE", "Delaware", 4, 9),
  t("AZ", "Arizona", 5, 1), t("NM", "New Mexico", 5, 2), t("KS", "Kansas", 5, 3), t("AR", "Arkansas", 5, 4),
  t("TN", "Tennessee", 5, 5), t("NC", "North Carolina", 5, 6), t("SC", "South Carolina", 5, 7),
  t("DC", "District of Columbia", 5, 8),
  t("OK", "Oklahoma", 6, 3), t("LA", "Louisiana", 6, 4), t("MS", "Mississippi", 6, 5), t("AL", "Alabama", 6, 6),
  t("GA", "Georgia", 6, 7),
  t("HI", "Hawaii", 7, 0), t("TX", "Texas", 7, 3), t("FL", "Florida", 7, 8),
];

export function getStateTile(slug: string) {
  return stateTiles.find((s) => s.slug === slug);
}
