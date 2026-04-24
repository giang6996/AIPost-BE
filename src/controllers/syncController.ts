import { Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { sendError, sendErrorNormalized, sendSuccess } from '../utils/apiResponse'
import { getParamAsString } from '../utils/paramString'
import { parsePositiveInt } from '../utils/positiveInt'
import { publishDraft, deleteDraftSync } from '../services/syncService'

function parseId(value: string): number | null {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

export async function publishDraftHandler(req: Request, res: Response) {
  try {
    const idParam = getParamAsString(req.params.id)
    const draftId = idParam ? parseId(idParam) : null

    if (!draftId) {
      return sendError(
        res,
        'Invalid draft id',
        { code: 'INVALID_DRAFT_ID' },
        400
      )
    }

    const userId = req.authUser!.id



    const { siteId, status } = req.body

    const result = await publishDraft({
      draftId,
      userId: userId,
      siteId,
      wpStatus: status === 'publish' ? 'publish' : 'draft',
    })

    return sendSuccess(res, result, 'Draft published successfully')
  } catch (error) {
    return sendErrorNormalized(res, error, {
      message: 'Failed to publish draft',
      code: 'PUBLISH_DRAFT_FAILED',
      status: 500,
    })
  }
}

export async function deleteDraftSyncHandler(
  req: Request,
  res: Response
) {
  try {
    const draftIdParam = getParamAsString(req.params.id)
    const siteIdParam = getParamAsString(req.params.siteId)

    const draftId = draftIdParam ? parseId(draftIdParam) : null
    const siteId = siteIdParam ? parsePositiveInt(siteIdParam) : null

    if (!draftId) {
      return sendError(
        res,
        'Invalid draft id',
        { code: 'INVALID_DRAFT_ID' },
        400
      )
    }

    if (!siteId) {
      return sendError(
        res,
        'Invalid site id',
        { code: 'INVALID_SITE_ID' },
        400
      )
    }

    const syncRemote = req.query.syncRemote === 'true'
    const force = req.query.force === 'true'

    if (!syncRemote) {
      return sendError(
        res,
        'syncRemote=true is required',
        { code: 'SYNC_REMOTE_REQUIRED' },
        400
      )
    }

    const userId = req.authUser!.id



    const result = await deleteDraftSync({
      draftId,
      siteId,
      userId: userId,
      force,
    })

    return sendSuccess(
      res,
      result,
      force
        ? 'Remote WordPress post deleted successfully'
        : 'Remote WordPress post moved to trash successfully'
    )
  } catch (error) {
    const message =
      error instanceof Error &&
      (
        error.message === 'Draft not found' ||
        error.message === 'Target site not found' ||
        error.message === 'No synced post found for this draft and site' ||
        error.message === 'Synced post has no WordPress post id'
      )
        ? error.message
        : 'Failed to delete remote WordPress post'

    const code =
      error instanceof Error && error.message === 'Draft not found'
        ? 'DRAFT_NOT_FOUND'
        : error instanceof Error && error.message === 'Target site not found'
        ? 'SITE_NOT_FOUND'
        : error instanceof Error && error.message === 'No synced post found for this draft and site'
        ? 'SYNC_NOT_FOUND'
        : error instanceof Error && error.message === 'Synced post has no WordPress post id'
        ? 'INVALID_SYNC_STATE'
        : 'DELETE_REMOTE_POST_FAILED'

    const statusCode =
      error instanceof Error &&
      (
        error.message === 'Draft not found' ||
        error.message === 'Target site not found' ||
        error.message === 'No synced post found for this draft and site'
      )
        ? 404
        : error instanceof Error && error.message === 'Synced post has no WordPress post id'
        ? 400
        : 500

    return sendErrorNormalized(res, error, {
      message,
      code,
      status: statusCode,
    })
  }
}
