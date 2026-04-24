import crypto from 'crypto'

export function generateSessionToken() {
  return crypto.randomBytes(48).toString('hex')
}

export function hashSessionToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex')
}