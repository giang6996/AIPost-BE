import type { Express } from 'express'
import { ensureMediaStorageDirectories } from './services/mediaStorageService.js'

type AppModule = {
  default?: Express | { default?: Express }
}

function isExpressApp(value: unknown): value is Express {
  return (
    (typeof value === 'function' || typeof value === 'object') &&
    value !== null &&
    'listen' in value
  )
}

function unwrapExpressApp(moduleExport: AppModule): Express {
  // In NodeNext/CommonJS builds, dynamic import() can wrap the CommonJS export
  // inside one or two `default` properties. Normalize that shape here so the
  // bootstrap always gets the real Express app instance before calling listen().
  const candidate = moduleExport.default

  if (isExpressApp(candidate)) {
    return candidate as Express
  }

  if (
    candidate &&
    (typeof candidate === 'function' || typeof candidate === 'object') &&
    'default' in candidate &&
    isExpressApp(candidate.default)
  ) {
    return candidate.default as Express
  }

  throw new Error('App module did not export a valid Express instance')
}

async function bootstrap() {
  // The app still boots locally from .env files, but production should resolve secrets from AWS first.
  if (process.env.NODE_ENV === 'production') {
    // Import the SSM helper lazily so local/test runs do not need AWS credentials or AWS SDK work.
    const { getSsmBootstrapSummary, loadRuntimeSecrets } = await import('./config/ssm.js')

    // Log the AWS region/path only so we can trace the bootstrap source without printing secrets.
    const summary = getSsmBootstrapSummary()
    console.log(
      `Loading production secrets from SSM${
        summary.region ? ` in ${summary.region}` : ''
      }${summary.prefix ? ` using ${summary.prefix}` : ''}`,
    )

    // Pull DATABASE_URL and ENCRYPTION_KEY into process.env before the rest of the app loads.
    await loadRuntimeSecrets()
  }

  // Import the app only after env secrets are present, because app.ts and env.ts validate config at load time.
  const app = unwrapExpressApp((await import('./app.js')) as AppModule)
  const { env } = await import('./config/env.js')

  // Storage setup belongs to the storage adapter so the boot path stays agnostic to disk vs cloud.
  ensureMediaStorageDirectories()

  app.listen(env.port, () => {
    console.log(`Server is running at http://localhost:${env.port}`)
    console.log(`Hello`)
  })
}

bootstrap().catch((error) => {
  console.error('Server bootstrap failed:', error)
  process.exit(1)
})
