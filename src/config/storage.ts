import fs from 'fs'
import path from 'path'

const uploadsRoot = path.resolve(process.cwd(), 'uploads')
const uploadedImageRoot = path.join(uploadsRoot, 'uploaded')
const generatedImageRoot = path.join(uploadsRoot, 'generated')

export function ensureStorageDirectories() {
  const dirs = [uploadedImageRoot, generatedImageRoot, uploadedImageRoot]

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  }
}

export const storagePaths = {
  uploadsRoot,
  generatedImageRoot,
  uploadedImageRoot,
}