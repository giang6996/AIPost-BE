import dotenv from 'dotenv'

dotenv.config()

function requireEnv(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

export const env = {
  port: Number(process.env.PORT ?? 3001),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  databaseUrl: requireEnv('DATABASE_URL'),
  encryptionKey: requireEnv('ENCRYPTION_KEY', '12345678901234567890123456789012'),
}