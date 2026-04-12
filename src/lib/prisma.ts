import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL,
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// Enable WAL mode + performance pragmas on first connection
// WAL allows concurrent reads while writing (vs default journal mode which locks entire DB)
const walInitialized = globalThis as unknown as { __walInit?: boolean };
if (!walInitialized.__walInit) {
  walInitialized.__walInit = true;
  prisma.$executeRawUnsafe("PRAGMA journal_mode = WAL").catch(() => {});
  prisma.$executeRawUnsafe("PRAGMA busy_timeout = 5000").catch(() => {});  // Wait 5s instead of failing immediately
  prisma.$executeRawUnsafe("PRAGMA synchronous = NORMAL").catch(() => {}); // Faster writes, still safe with WAL
  prisma.$executeRawUnsafe("PRAGMA cache_size = -20000").catch(() => {});   // 20MB cache (default is 2MB)
  prisma.$executeRawUnsafe("PRAGMA foreign_keys = ON").catch(() => {});
}
