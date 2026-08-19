import { GetParameterCommand, SSMClient } from '@aws-sdk/client-ssm'

function requireRuntimeSetting(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required runtime setting: ${name}`)
  }
  return value
}

function normalizePrefix(prefix: string) {
  // Store parameters under a shared path like /aipost/prod so each environment stays isolated.
  const trimmed = prefix.trim().replace(/\/+$/, '')
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
}

async function loadParameter(
  client: SSMClient,
  name: string,
): Promise<string> {
  // Fetch one required secret at a time so failures point to the exact parameter.
  const response = await client.send(
    new GetParameterCommand({
      Name: name,
      WithDecryption: true,
    }),
  )

  const value = response.Parameter?.Value
  if (!value) {
    throw new Error(`SSM parameter returned no value: ${name}`)
  }

  return value
}

export async function loadRuntimeSecrets() {
  const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);
  const hasEncryptionKey = Boolean(process.env.ENCRYPTION_KEY);

  if (hasDatabaseUrl && hasEncryptionKey) {
    return;
  }

  const prefix = process.env.SSM_PARAMETER_PREFIX;

  if (!prefix) {
    throw new Error(
      "DATABASE_URL and ENCRYPTION_KEY are required. " +
      "Provide them through the environment or configure SSM_PARAMETER_PREFIX."
    );
  }

  await loadSecretsFromSsm();
}

async function loadSecretsFromSsm() {
  // These settings are expected to come from the AWS runtime, not from checked-in files.
  const region =
    process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION ?? null
  const prefix = process.env.SSM_PARAMETER_PREFIX ?? process.env.SSM_PARAMETER_PATH

  if (!region) {
    throw new Error('Missing required runtime setting: AWS_REGION')
  }

  if (!prefix) {
    throw new Error('Missing required runtime setting: SSM_PARAMETER_PREFIX')
  }

  const normalizedPrefix = normalizePrefix(prefix)
  const client = new SSMClient({ region })

  // Only bootstrap the secrets the app cannot start without.
  // SecureString parameters are fetched with decryption so the app receives plain text values.
  const [databaseUrl, encryptionKey] = await Promise.all([
    loadParameter(client, `${normalizedPrefix}/DATABASE_URL`),
    loadParameter(client, `${normalizedPrefix}/ENCRYPTION_KEY`),
  ])

  process.env.DATABASE_URL = databaseUrl
  process.env.ENCRYPTION_KEY = encryptionKey

  return {
    prefix: normalizedPrefix,
  }
}

export function getSsmBootstrapSummary() {
  // This is only used for startup logs so we can trace which AWS settings were present.
  return {
    region: process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION ?? null,
    prefix:
      process.env.SSM_PARAMETER_PREFIX ?? process.env.SSM_PARAMETER_PATH ?? null,
  }
}
