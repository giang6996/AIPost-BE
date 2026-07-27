import type { Express } from 'express'
import { ensureMediaStorageDirectories } from './services/mediaStorageService.js'

async function bootstrap() {
  // The app still boots locally from .env files, but production should resolve secrets from AWS first.
  if (process.env.NODE_ENV === 'production') {
    // Import the SSM helper lazily so local/test runs do not need AWS credentials or AWS SDK work.
    const { getSsmBootstrapSummary, loadSecretsFromSsm } = await import('./config/ssm.js')

    // Log the AWS region/path only so we can trace the bootstrap source without printing secrets.
    const summary = getSsmBootstrapSummary()
    console.log(
      `Loading production secrets from SSM${
        summary.region ? ` in ${summary.region}` : ''
      }${summary.prefix ? ` using ${summary.prefix}` : ''}`,
    )

    // Pull DATABASE_URL and ENCRYPTION_KEY into process.env before the rest of the app loads.
    await loadSecretsFromSsm()
  }

  // Import the app only after env secrets are present, because app.ts and env.ts validate config at load time.
  const app = (await import('./app.js')).default as unknown as Express
  const { env } = await import('./config/env.js')

  // Storage setup belongs to the storage adapter so the boot path stays agnostic to disk vs cloud.
  ensureMediaStorageDirectories()

  app.listen(env.port, () => {
    console.log(`Server running at http://localhost:${env.port}`)
  })
}

bootstrap().catch((error) => {
  console.error('Server bootstrap failed:', error)
  process.exit(1)
})
