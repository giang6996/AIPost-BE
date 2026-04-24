import { Response } from 'express'

type ErrorPayload = {
  code: string
  details?: unknown
}

export type ErrorFallback = {
  message: string
  code: string
  status: number
}

export type ErrorMapping = Record<
  string,
  {
    code: string
    status: number
    message?: string
  }
>

export function sendSuccess(
  res: Response,
  data: unknown = {},
  message = 'Operation successful',
  statusCode = 200
) {
  return res.status(statusCode).json({
    success: true,
    data,
    message,
  })
}

export function sendError(
  res: Response,
  message = 'Operation failed',
  error: ErrorPayload = { code: 'INTERNAL_ERROR' },
  statusCode = 500
) {
  return res.status(statusCode).json({
    success: false,
    error,
    message,
  })
}

export function sendErrorNormalized(
  res: Response,
  error: unknown,
  fallback: ErrorFallback,
  mapping?: ErrorMapping
) {
  const details = error instanceof Error ? error.message : error
  const key = error instanceof Error ? error.message : null
  const match = key && mapping ? mapping[key] : undefined

  const message = match
    ? match.message ?? (error instanceof Error ? error.message : fallback.message)
    : fallback.message

  const code = match?.code ?? fallback.code
  const status = match?.status ?? fallback.status

  return sendError(
    res,
    message,
    {
      code,
      details,
    },
    status
  )
}
