import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import fs from 'fs'
import path from 'path'
import { randomBytes } from 'crypto'
import { env } from '../config/env'
import { storagePaths } from '../config/storage'

function normalizeSlashes(value: string) {
  return value.replace(/\\/g, '/')
}

function normalizeStorageReference(value: string) {
  // Storage references must behave the same on Windows and Linux.
  // This keeps local paths and S3 object keys comparable in logs and URLs.
  return normalizeSlashes(value).replace(/^\/+/, '')
}

function getUploadsRoot() {
  return normalizeSlashes(path.resolve(process.cwd(), 'uploads'))
}

function resolveStorageReference(storageKey: string) {
  return path.resolve(storageKey)
}

function isLocalStorage() {
  return env.mediaStorageProvider === 'local'
}

function requireS3BucketName() {
  if (!env.s3BucketName) {
    throw new Error('Missing required environment variable: S3_BUCKET_NAME')
  }

  return env.s3BucketName
}

function requireS3Region() {
  const region = process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION

  if (!region) {
    throw new Error('Missing required environment variable: AWS_REGION')
  }

  return region
}

function getS3Client() {
  return new S3Client({
    region: requireS3Region(),
  })
}

function getPublicBackendBaseUrl() {
  // Local previews still come from the backend URL.
  // In S3 mode, this becomes the public bucket/CDN URL that serves object bytes.
  if (isLocalStorage()) {
    return process.env.PUBLIC_BACKEND_URL || 'http://localhost:3001'
  }

  const explicitBaseUrl = env.mediaPublicBaseUrl?.trim().replace(/\/+$/, '')
  if (explicitBaseUrl) {
    return explicitBaseUrl
  }

  const bucket = requireS3BucketName()
  const region = requireS3Region()
  return `https://${bucket}.s3.${region}.amazonaws.com`
}

function createStorageKey(prefix: 'uploaded' | 'generated', fileName: string) {
  // We keep the key layout simple and readable so operators can inspect it in S3.
  const safeName = fileName.replace(/\s+/g, '_')
  return `${prefix}/${Date.now()}-${randomBytes(6).toString('hex')}-${safeName}`
}

async function uploadBufferToS3(input: {
  storageKey: string
  buffer: Buffer
  mimeType: string
}) {
  const client = getS3Client()
  const bucket = requireS3BucketName()

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: input.storageKey,
      Body: input.buffer,
      ContentType: input.mimeType,
    }),
  )
}

async function readBufferFromS3(storageKey: string) {
  const client = getS3Client()
  const bucket = requireS3BucketName()

  const response = await client.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: normalizeStorageReference(storageKey),
    }),
  )

  if (!response.Body) {
    throw new Error('Remote image file not found')
  }

  const body = response.Body as {
    transformToByteArray?: () => Promise<Uint8Array>
  }

  if (typeof body.transformToByteArray === 'function') {
    return Buffer.from(await body.transformToByteArray())
  }

  throw new Error('Unable to read remote image buffer')
}

async function deleteFromS3(storageKey: string) {
  const client = getS3Client()
  const bucket = requireS3BucketName()

  await client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: normalizeStorageReference(storageKey),
    }),
  )
}

export function ensureMediaStorageDirectories() {
  // Only local development and tests need on-disk folders.
  // S3 mode intentionally does nothing here so production does not depend on EC2 disk state.
  if (!isLocalStorage()) {
    return
  }

  const dirs = [storagePaths.uploadedImageRoot, storagePaths.generatedImageRoot]

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  }
}

export function getUploadedImageRoot() {
  return storagePaths.uploadedImageRoot
}

export function getImagePreviewUrl(storageKey?: string | null) {
  if (!storageKey) {
    return null
  }

  if (isLocalStorage()) {
    const normalizedStoragePath = normalizeSlashes(resolveStorageReference(storageKey))
    const uploadsRoot = getUploadsRoot()

    if (!normalizedStoragePath.startsWith(uploadsRoot)) {
      return null
    }

    const relativePath = normalizedStoragePath
      .slice(uploadsRoot.length)
      .replace(/^\/+/, '')

    return `${getPublicBackendBaseUrl()}/uploads/${relativePath}`
  }

  return `${getPublicBackendBaseUrl()}/${normalizeStorageReference(storageKey)}`
}

export async function storeUploadedImage(input: {
  storageKey?: string
  buffer?: Buffer
  originalName: string
  mimeType: string
}) {
  // The DB stores a neutral storage key so the same field can point to local disk or S3.
  if (isLocalStorage()) {
    if (!input.storageKey) {
      throw new Error('Storage key is required for local storage')
    }

    return {
      storageKey: path.normalize(input.storageKey),
    }
  }

  if (!input.buffer) {
    throw new Error('Image buffer is required for S3 storage')
  }

  const storageKey = createStorageKey('uploaded', input.originalName)
  await uploadBufferToS3({
    storageKey,
    buffer: input.buffer,
    mimeType: input.mimeType,
  })

  return {
    storageKey,
  }
}

export async function saveGeneratedImage(input: {
  draftId: number
  buffer: Buffer
  extension: string
}) {
  // Generated images follow the same provider switch as uploaded images.
  // That keeps the rest of the app unaware of whether the bytes ended up on disk or in S3.
  const fileName = `draft-${input.draftId}-${Date.now()}-${randomBytes(6).toString(
    'hex',
  )}.${input.extension}`

  if (isLocalStorage()) {
    const uploadsDir = storagePaths.generatedImageRoot
    await fs.promises.mkdir(uploadsDir, { recursive: true })

    const storageKey = path.join(uploadsDir, fileName)
    await fs.promises.writeFile(storageKey, input.buffer)

    return {
      storageKey,
    }
  }

  const storageKey = createStorageKey('generated', fileName)
  await uploadBufferToS3({
    storageKey,
    buffer: input.buffer,
    mimeType: `image/${input.extension === 'jpg' ? 'jpeg' : input.extension}`,
  })

  return {
    storageKey,
  }
}

export async function readImageBuffer(storageKey: string) {
  if (isLocalStorage()) {
    const absolutePath = resolveStorageReference(storageKey)

    if (!fs.existsSync(absolutePath)) {
      throw new Error('Local image file not found')
    }

    return fs.promises.readFile(absolutePath)
  }

  return readBufferFromS3(storageKey)
}

export async function deleteImage(storageKey: string) {
  if (isLocalStorage()) {
    const absolutePath = resolveStorageReference(storageKey)

    if (!fs.existsSync(absolutePath)) {
      return
    }

    await fs.promises.unlink(absolutePath)
    return
  }

  await deleteFromS3(storageKey)
}
