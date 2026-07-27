import fs from 'fs'
import path from 'path'
import { randomBytes } from 'crypto'
import { storagePaths } from '../config/storage'

function normalizeSlashes(value: string) {
  return value.replace(/\\/g, '/')
}

function normalizeUploadPath(value: string) {
  // Storage files should be addressed in a platform-neutral way so Windows and Linux
  // produce the same URL and cleanup behavior.
  return normalizeSlashes(value)
}

function resolveUploadsRelativePath(localPath: string) {
  const normalizedLocalPath = normalizeUploadPath(localPath)
  const uploadsRoot = normalizeUploadPath(path.resolve(process.cwd(), 'uploads'))

  if (!normalizedLocalPath.startsWith(uploadsRoot)) {
    return null
  }

  return normalizedLocalPath
    .slice(uploadsRoot.length)
    .replace(/^\/+/, '')
}

function getPublicBackendBaseUrl() {
  // Local previews still point at the backend itself. Later, this can become a CDN
  // or S3 bucket URL without changing the services that call this module.
  return process.env.PUBLIC_BACKEND_URL || 'http://localhost:3001'
}

export function ensureMediaStorageDirectories() {
  // The storage layer owns the folder layout, not the controllers.
  // Keeping it here makes a future S3 swap much smaller.
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

export function getImagePreviewUrl(localPath?: string | null) {
  if (!localPath) {
    return null
  }

  const relativePath = resolveUploadsRelativePath(localPath)
  if (!relativePath) {
    return null
  }

  return `${getPublicBackendBaseUrl()}/uploads/${relativePath}`
}

export async function storeUploadedImage(input: { localPath: string }) {
  // Today uploads already land on disk, so this adapter mainly normalizes the path.
  // Later this function can upload to S3 and return a provider-neutral storage key.
  return {
    localPath: path.normalize(input.localPath),
  }
}

export async function saveGeneratedImage(input: {
  draftId: number
  buffer: Buffer
  extension: string
}) {
  // Generated images are written through the storage layer so their destination is
  // controlled from one place instead of being spread across services.
  const uploadsDir = storagePaths.generatedImageRoot
  await fs.promises.mkdir(uploadsDir, { recursive: true })

  const fileName = `draft-${input.draftId}-${Date.now()}-${randomBytes(6).toString(
    'hex',
  )}.${input.extension}`
  const localPath = path.join(uploadsDir, fileName)

  await fs.promises.writeFile(localPath, input.buffer)

  return {
    localPath,
  }
}

export async function readImageBuffer(localPath: string) {
  const absolutePath = path.resolve(localPath)

  if (!fs.existsSync(absolutePath)) {
    throw new Error('Local image file not found')
  }

  return fs.promises.readFile(absolutePath)
}

export async function deleteImage(localPath: string) {
  const absolutePath = path.resolve(localPath)

  if (!fs.existsSync(absolutePath)) {
    return
  }

  await fs.promises.unlink(absolutePath)
}
