import type { Prisma, PrismaClient } from "@prisma/client";
import { isSavedKey, SAVED_LIMITS } from "./saved";

/**
 * The server side of saved work: an account's copy of what its tools saved.
 * Each key carries a version (when it last changed). A browser sends the
 * version it last saw with each change, and the change is stored only if the
 * account still has that version; otherwise the browser gets the account's
 * copy back. That way a browser that never saw the account's work can't
 * overwrite it with a blank form.
 */

export interface AccountItem { key: string; value: unknown; version: string }
export interface PushItem { key: string; value: unknown; base: string | null }
export type PushResult =
  | { ok: true; saved: { key: string; version: string | null }[]; conflicts: { key: string; value: unknown; version: string | null }[] }
  | { error: string };

export async function loadSavedWork(db: PrismaClient, userId: string): Promise<AccountItem[]> {
  const rows = await db.savedWork.findMany({ where: { userId }, select: { key: true, value: true, updatedAt: true }, orderBy: { key: "asc" } });
  return rows.map((r) => ({ key: r.key, value: r.value as unknown, version: r.updatedAt.toISOString() }));
}

const validBase = (b: unknown) => b === null || (typeof b === "string" && b.length <= 40 && !Number.isNaN(Date.parse(b)));

/** Stores (or, for a null value, removes) saved work for an account, within the size limits. */
export async function storeSavedWork(db: PrismaClient, userId: string, items: unknown, now = () => new Date()): Promise<PushResult> {
  if (!Array.isArray(items) || items.length === 0 || items.length > SAVED_LIMITS.itemsPerPush) return { error: "Nothing to save, or too much at once." };
  const sizes = new Map<string, number>();
  for (const it of items as PushItem[]) {
    if (!it || typeof it !== "object" || !isSavedKey(it.key) || !validBase(it.base) || sizes.has(it.key)) return { error: "That isn't saved work this site keeps." };
    const raw = JSON.stringify(it.value ?? null);
    const bytes = Buffer.byteLength(raw);
    if (bytes > SAVED_LIMITS.bytesPerKey) return { error: "That tool's saved work is too large to keep in your account. Export it instead." };
    sizes.set(it.key, it.value === null || it.value === undefined ? 0 : bytes);
  }
  const keys = [...sizes.keys()];
  const [others] = await db.$queryRaw<{ n: bigint; bytes: bigint | null }[]>`
    SELECT COUNT(*) AS n, SUM(octet_length("value"::text)) AS bytes FROM "SavedWork" WHERE "userId" = ${userId} AND NOT ("key" = ANY(${keys}))`;
  const keptKeys = Number(others.n) + [...sizes.values()].filter((b) => b > 0).length;
  const keptBytes = Number(others.bytes ?? 0) + [...sizes.values()].reduce((a, b) => a + b, 0);
  if (keptKeys > SAVED_LIMITS.keysPerAccount || keptBytes > SAVED_LIMITS.bytesPerAccount) {
    return { error: "Your account has reached its storage limit. Export older work and clear it from the tools." };
  }

  return db.$transaction(async (tx) => {
    const saved: { key: string; version: string | null }[] = [];
    const conflicts: { key: string; value: unknown; version: string | null }[] = [];
    for (const { key, value, base } of items as PushItem[]) {
      const at = now();
      const remove = value === null || value === undefined;
      const json = value as Prisma.InputJsonValue;
      let done: boolean;
      if (base === null) {
        done = remove
          ? (await tx.savedWork.count({ where: { userId, key } })) === 0
          : (await tx.savedWork.createMany({ data: [{ userId, key, value: json, updatedAt: at }], skipDuplicates: true })).count === 1;
      } else {
        const where = { userId, key, updatedAt: new Date(base) };
        done = (remove ? await tx.savedWork.deleteMany({ where }) : await tx.savedWork.updateMany({ where, data: { value: json, updatedAt: at } })).count === 1;
      }
      if (done) {
        saved.push({ key, version: remove ? null : at.toISOString() });
      } else {
        const current = await tx.savedWork.findUnique({ where: { userId_key: { userId, key } } });
        conflicts.push({ key, value: current?.value ?? null, version: current?.updatedAt.toISOString() ?? null });
      }
    }
    return { ok: true as const, saved, conflicts };
  });
}
