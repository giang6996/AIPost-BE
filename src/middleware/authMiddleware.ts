import { NextFunction, Request, Response } from 'express'
import { getCurrentUserFromToken } from '../services/authService'
import { sendError } from '../utils/apiResponse'

function getBearerToken(req: Request) {
  const authHeader = req.headers.authorization

  if (!authHeader) {
    return null
  }

  const [scheme, token] = authHeader.split(' ')

  if (scheme !== 'Bearer' || !token) {
    return null
  }

  return token.trim()
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const token = getBearerToken(req)

    if (!token) {
      return sendError(
        res,
        'Unauthorized',
        { code: 'UNAUTHORIZED', details: 'Missing bearer token' },
        401
      )
    }

    const result = await getCurrentUserFromToken(token)

    req.authUser = result.user
    req.authSessionId = result.sessionId

    return next()
  } catch (error) {
    return sendError(
      res,
      'Unauthorized',
      {
        code: 'UNAUTHORIZED',
        details: error instanceof Error ? error.message : error,
      },
      401
    )
  }
}