import fs from 'fs'
import multer from 'multer'
import { getUploadedImageRoot } from '../services/mediaStorageService'
import { env } from '../config/env'

const uploadedImageRoot = getUploadedImageRoot()

const storage =
  env.mediaStorageProvider === 's3'
    ? multer.memoryStorage()
    : multer.diskStorage({
        destination: (_req, _file, cb) => {
          if (!fs.existsSync(uploadedImageRoot)) {
            fs.mkdirSync(uploadedImageRoot, { recursive: true })
          }

          cb(null, uploadedImageRoot)
        },
        filename: (_req, file, cb) => {
          const timestamp = Date.now()
          const safeOriginalName = file.originalname.replace(/\s+/g, '_')
          cb(null, `${timestamp}-${safeOriginalName}`)
        },
      })

if (env.mediaStorageProvider === 'local' && !fs.existsSync(uploadedImageRoot)) {
  fs.mkdirSync(uploadedImageRoot, { recursive: true })
}

function fileFilter(
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
  ]

  if (!allowedMimeTypes.includes(file.mimetype)) {
    cb(new Error('Only image files are allowed'))
    return
  }

  cb(null, true)
}

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
})
