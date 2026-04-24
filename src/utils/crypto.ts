import * as crypto from 'crypto'
import { env } from '../config/env'

const ALGORITHM = 'aes-256-cbc'
const IV_LENGTH = 16

function getKey(): Buffer {
  return crypto.createHash('sha256').update(env.encryptionKey).digest()
}

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv)

  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  return `${iv.toString('hex')}:${encrypted}`
}

export function decrypt(encryptedText: string): string {
  const [ivHex, contentHex] = encryptedText.split(':')

  if (!ivHex || !contentHex) {
    throw new Error('Invalid encrypted text format')
  }

  const iv = Buffer.from(ivHex, 'hex')
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv)

  let decrypted = decipher.update(contentHex, 'hex', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}