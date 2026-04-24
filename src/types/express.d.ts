import type { Role, User } from '@prisma/client'

declare global {
  namespace Express {
    interface Request {
      authUser?: Pick<User, 'id' | 'email' | 'name' | 'roleId' | 'status'> & {
        role: Pick<Role, 'id' | 'name'>
      }
      authSessionId?: number
    }
  }
}

export {}