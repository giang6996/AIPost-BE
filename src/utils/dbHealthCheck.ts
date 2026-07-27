import { prisma } from '../lib/prisma'

export async function checkDatabaseHealth() {
  // Readiness checks should prove the app can actually reach PostgreSQL.
  // A tiny query to verify connectivity
  await prisma.$queryRaw`SELECT 1`

  return {
    database: 'ok' as const,
  }
}
