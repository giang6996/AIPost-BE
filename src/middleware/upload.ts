import fs from 'fs'
import multer from 'multer'
import path from 'path'
import { storagePaths } from '../config/storage'

if (!fs.existsSync(storagePaths.uploadedImageRoot)) {
  fs.mkdirSync(storagePaths.uploadedImageRoot, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, storagePaths.uploadedImageRoot)
  },
  filename: (_req, file, cb) => {
    const timestamp = Date.now()
    const safeOriginalName = file.originalname.replace(/\s+/g, '_')
    cb(null, `${timestamp}-${safeOriginalName}`)
  },
})

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