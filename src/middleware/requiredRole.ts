import { NextFunction, Request, Response } from 'express'
import { sendError } from '../utils/apiResponse'

export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.authUser) {
      return sendError(
        res,
        'Unauthorized',
        { code: 'UNAUTHORIZED', details: 'Missing authenticated user' },
        401
      )
    }

    const currentRole = req.authUser.role.name

    if (!allowedRoles.includes(currentRole)) {
      return sendError(
        res,
        'Forbidden',
        {
          code: 'FORBIDDEN',
          details: `Allowed roles: ${allowedRoles.join(', ')}`,
        },
        403
      )
    }

    return next()
  }
}