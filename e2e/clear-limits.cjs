// Clears the attempt limits between scripts, so one script's sign-ups don't use up the next one's.
// Only ever against a local throwaway database.
const { PrismaClient } = require("@prisma/client");
if (!/@(localhost|127\.0\.0\.1)(:\d+)?\//.test(process.env.DATABASE_URL ?? "")) {
  console.error("clear-limits: DATABASE_URL must be a local throwaway database.");
  process.exit(1);
}
const db = new PrismaClient();
db.authAttempt.deleteMany().then(() => db.$disconnect());
