import { PrismaClient } from "@prisma/client";

/**
 * Prisma client singleton (reused across hot reloads in development).
 * Phase 1 pages read static content modules; Phase 2 data access goes through here.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
