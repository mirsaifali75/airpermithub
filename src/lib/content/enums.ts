/** "minor-nsr" <-> "MINOR_NSR": the site's lowercase ids and the database enum names. */
export const toEnum = <T extends string>(id: string) => id.toUpperCase().replace(/-/g, "_") as T;
export const fromEnum = <T extends string>(name: string) => name.toLowerCase().replace(/_/g, "-") as T;

/** Date column (UTC midnight) <-> "YYYY-MM-DD". */
export const toDate = (ymd: string) => new Date(`${ymd}T00:00:00Z`);
export const fromDate = (d: Date) => d.toISOString().slice(0, 10);
