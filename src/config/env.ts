import dotenv from 'dotenv'

dotenv.config()

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

function parseCsv(value: string): string[] {
  // Keep comma-separated runtime config easy to deploy across local, staging, and prod.
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
}

export const env = {
  port: Number(process.env.PORT ?? 3001),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  databaseUrl: requireEnv('DATABASE_URL'),
  encryptionKey: requireEnv('ENCRYPTION_KEY'),
  corsOrigins: parseCsv(requireEnv('CORS_ORIGINS')),
}
