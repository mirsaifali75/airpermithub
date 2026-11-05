/**
 * Work people save in the tools (calculation sets, compliance tasks, tool
 * entries, saved jobs) is kept in the browser under keys like
 * "aph.tools.deviations.v1". When someone is signed in, the same keys are
 * copied to their account so the work is there on any device. Shared by the
 * browser and the server, so both accept exactly the same keys.
 */

const SAVED_KEY = /^aph\.(tools|calc|compliance|jobs)(\.[a-z0-9-]+)+$/;

export const isSavedKey = (key: unknown): key is string => typeof key === "string" && key.length <= 100 && SAVED_KEY.test(key);

export const SAVED_LIMITS = {
  /** One tool's saved work, as JSON. */
  bytesPerKey: 200_000,
  /** All of an account's saved work, as JSON. */
  bytesPerAccount: 2_000_000,
  keysPerAccount: 60,
  itemsPerPush: 30,
};

const idOf = (x: unknown) => (x && typeof x === "object" && "id" in x && typeof (x as { id: unknown }).id === "string" ? (x as { id: string }).id : null);
const isPrimitive = (x: unknown) => x === null || ["string", "number", "boolean"].includes(typeof x);

/**
 * Combines what this browser saved before signing in with what the account
 * already holds, the first time the two meet. Lists of records with ids are
 * joined by id, the account's copy winning a clash; lists of plain values
 * (saved job ids) are joined; anything else keeps the account's copy.
 */
export function mergeSaved(browser: unknown, account: unknown): unknown {
  if (account === undefined || account === null) return browser;
  if (browser === undefined || browser === null) return account;
  if (Array.isArray(browser) && Array.isArray(account)) {
    if ([...browser, ...account].every(isPrimitive)) return [...new Set([...account, ...browser])];
    if ([...browser, ...account].every((x) => idOf(x) !== null)) {
      const have = new Set(account.map(idOf));
      return [...account, ...browser.filter((x) => !have.has(idOf(x)))];
    }
  }
  return account;
}
