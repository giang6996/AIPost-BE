import { Request, Response } from 'express'
import { getParamAsString } from '../utils/paramString'
import { parsePositiveInt } from '../utils/positiveInt'
import { prisma } from '../lib/prisma'
import { sendError, sendErrorNormalized, sendSuccess } from '../utils/apiResponse'
import {
  createDraft,
  getAllDrafts,
  getDraftById,
  getDraftCategories,
  getDraftTags,
  replaceDraftCategories,
  replaceDraftTags,
  updateDraft,
  upsertDraftSeoMeta,
  getDraftSeoMeta,
  deleteDraft
} from '../services/draftService'

function parseId(value: string): number | null {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

export async function listDrafts(req: Request, res: Response) {
  try {
    const userId = req.authUser!.id



    const drafts = await getAllDrafts(userId)
    return sendSuccess(res, drafts, 'Drafts fetched successfully')
  } catch (error) {
    return sendErrorNormalized(res, error, {
      message: 'Failed to fetch drafts',
      code: 'FETCH_DRAFTS_FAILED',
      status: 500,
    })
  }
}

export async function getDraftHandler(req: Request, res: Response) {
  try {
    const Id = getParamAsString(req.params.id)
    const draftId = Id ? parseId(Id) : null

    if (!draftId) {
      return sendError(
        res,
        'Invalid draft id',
        { code: 'INVALID_DRAFT_ID' },
        400
      )
    }

    const userId = req.authUser!.id



    const draft = await getDraftById(draftId, userId)

    if (!draft) {
      return sendError(
        res,
        'Draft not found',
        { code: 'DRAFT_NOT_FOUND' },
        404
      )
    }

    return sendSuccess(res, draft, 'Draft fetched successfully')
  } catch (error) {
    return sendErrorNormalized(res, error, {
      message: 'Failed to fetch draft',
      code: 'FETCH_DRAFT_FAILED',
      status: 500,
    })
  }
}

export async function createDraftHandler(req: Request, res: Response) {
  try {
    const {
      defaultSiteId,
      title,
      slug,
      excerpt,
      contentHtml,
      featuredImageUrl,
      featuredImageAlt,
    } = req.body

    if (!title || !contentHtml) {
      return sendError(
        res,
        'Missing required fields',
        { code: 'VALIDATION_ERROR', details: 'title and contentHtml are required' },
        400
      )
    }

    const userId = req.authUser!.id



    const draft = await createDraft({
      userId: userId,
      defaultSiteId: defaultSiteId ?? null,
      title,
      slug,
      excerpt,
      contentHtml,
      featuredImageUrl,
      featuredImageAlt,
    })

    return sendSuccess(res, draft, 'Draft created successfully', 201)
  } catch (error) {
    return sendErrorNormalized(res, error, {
      message: 'Failed to create draft',
      code: 'CREATE_DRAFT_FAILED',
      status: 500,
    })
  }
}

export async function updateDraftHandler(req: Request, res: Response) {
  try {
    const Id = getParamAsString(req.params.id)
    const draftId = Id ? parseId(Id) : null

    if (!draftId) {
      return sendError(
        res,
        'Invalid draft id',
        { code: 'INVALID_DRAFT_ID' },
        400
      )
    }

    const userId = req.authUser!.id



    const updatedDraft = await updateDraft(draftId, userId, req.body)

    return sendSuccess(res, updatedDraft, 'Draft updated successfully')
  } catch (error) {
    const message =
      error instanceof Error && error.message === 'Draft not found'
        ? 'Draft not found'
        : 'Failed to update draft'

    const code =
      error instanceof Error && error.message === 'Draft not found'
        ? 'DRAFT_NOT_FOUND'
        : 'UPDATE_DRAFT_FAILED'

    const statusCode =
      error instanceof Error && error.message === 'Draft not found' ? 404 : 500

    return sendErrorNormalized(res, error, {
      message,
      code,
      status: statusCode,
    })
  }
}

export async function deleteDraftHandler(req: Request, res: Response) {
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



    const deletedDraft = await deleteDraft(draftId, userId)

    return sendSuccess(res, deletedDraft, 'Draft deleted successfully')
  } catch (error) {
    const isDraftNotFound =
      error instanceof Error && error.message === 'Draft not found'

    return sendErrorNormalized(res, error, {
      message: isDraftNotFound ? 'Draft not found' : 'Failed to delete draft',
      code: isDraftNotFound ? 'DRAFT_NOT_FOUND' : 'DELETE_DRAFT_FAILED',
      status: isDraftNotFound ? 404 : 500,
    })
  }
}

export async function getDraftCategoriesHandler(req: Request, res: Response) {
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



    const categories = await getDraftCategories(draftId, userId)

    return sendSuccess(res, categories, 'Draft categories fetched successfully')
  } catch (error) {
    const message =
      error instanceof Error && error.message === 'Draft not found'
        ? 'Draft not found'
        : 'Failed to fetch draft categories'

    const code =
      error instanceof Error && error.message === 'Draft not found'
        ? 'DRAFT_NOT_FOUND'
        : 'FETCH_DRAFT_CATEGORIES_FAILED'

    const statusCode =
      error instanceof Error && error.message === 'Draft not found' ? 404 : 500

    return sendErrorNormalized(res, error, {
      message,
      code,
      status: statusCode,
    })
  }
}

export async function updateDraftCategoriesHandler(req: Request, res: Response) {
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



    const { siteId, categoryIds } = req.body

    if (!Array.isArray(categoryIds)) {
      return sendError(
        res,
        'categoryIds must be an array',
        { code: 'VALIDATION_ERROR' },
        400
      )
    }

    const updatedDraft = await replaceDraftCategories(draftId, userId, {
      siteId: siteId ?? null,
      categoryIds,
    })

    return sendSuccess(res, updatedDraft, 'Draft categories updated successfully')
  } catch (error) {
    const message =
      error instanceof Error &&
      (
        error.message === 'Draft not found' ||
        error.message === 'Target site not found'
      )
        ? error.message
        : 'Failed to update draft categories'

    const code =
      error instanceof Error && error.message === 'Draft not found'
        ? 'DRAFT_NOT_FOUND'
        : error instanceof Error && error.message === 'Target site not found'
        ? 'SITE_NOT_FOUND'
        : error instanceof Error && error.message === 'No target site selected'
        ? 'SITE_REQUIRED'
        : 'UPDATE_DRAFT_CATEGORIES_FAILED'

    const statusCode =
      error instanceof Error &&
      (error.message === 'Draft not found' || error.message === 'Target site not found')
        ? 404
        : error instanceof Error && error.message === 'No target site selected'
        ? 400
        : 500

    return sendErrorNormalized(res, error, {
      message,
      code,
      status: statusCode,
    })
  }
}

export async function getDraftTagsHandler(req: Request, res: Response) {
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



    const tags = await getDraftTags(draftId, userId)

    return sendSuccess(res, tags, 'Draft tags fetched successfully')
  } catch (error) {
    const message =
      error instanceof Error && error.message === 'Draft not found'
        ? 'Draft not found'
        : 'Failed to fetch draft tags'

    const code =
      error instanceof Error && error.message === 'Draft not found'
        ? 'DRAFT_NOT_FOUND'
        : 'FETCH_DRAFT_TAGS_FAILED'

    const statusCode =
      error instanceof Error && error.message === 'Draft not found' ? 404 : 500

    return sendErrorNormalized(res, error, {
      message,
      code,
      status: statusCode,
    })
  }
}

export async function updateDraftTagsHandler(req: Request, res: Response) {
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



    const { siteId, tagIds } = req.body

    if (!Array.isArray(tagIds)) {
      return sendError(
        res,
        'tagIds must be an array',
        { code: 'VALIDATION_ERROR' },
        400
      )
    }

    const updatedDraft = await replaceDraftTags(draftId, userId, {
      siteId: siteId ?? null,
      tagIds,
    })

    return sendSuccess(res, updatedDraft, 'Draft tags updated successfully')
  } catch (error) {
    const message =
      error instanceof Error &&
      (
        error.message === 'Draft not found' ||
        error.message === 'Target site not found'
      )
        ? error.message
        : 'Failed to update draft tags'

    const code =
      error instanceof Error && error.message === 'Draft not found'
        ? 'DRAFT_NOT_FOUND'
        : error instanceof Error && error.message === 'Target site not found'
        ? 'SITE_NOT_FOUND'
        : error instanceof Error && error.message === 'No target site selected'
        ? 'SITE_REQUIRED'
        : 'UPDATE_DRAFT_TAGS_FAILED'

    const statusCode =
      error instanceof Error &&
      (error.message === 'Draft not found' || error.message === 'Target site not found')
        ? 404
        : error instanceof Error && error.message === 'No target site selected'
        ? 400
        : 500

    return sendErrorNormalized(res, error, {
      message,
      code,
      status: statusCode,
    })
  }
}

export async function updateDraftSeoHandler(req: Request, res: Response) {
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



    const {
      seoTitle,
      metaDescription,
      canonicalUrl,
      focusKeyword,
      ogTitle,
      ogDescription,
      ogImageUrl,
    } = req.body

    const seoMeta = await upsertDraftSeoMeta(draftId, userId, {
      seoTitle,
      metaDescription,
      canonicalUrl,
      focusKeyword,
      ogTitle,
      ogDescription,
      ogImageUrl,
    })

    return sendSuccess(res, seoMeta, 'Draft SEO metadata updated successfully')
  } catch (error) {
    const message =
      error instanceof Error && error.message === 'Draft not found'
        ? 'Draft not found'
        : 'Failed to update draft SEO metadata'

    const code =
      error instanceof Error && error.message === 'Draft not found'
        ? 'DRAFT_NOT_FOUND'
        : 'UPDATE_DRAFT_SEO_FAILED'

    const statusCode =
      error instanceof Error && error.message === 'Draft not found' ? 404 : 500

    return sendErrorNormalized(res, error, {
      message,
      code,
      status: statusCode,
    })
  }
}

export async function getDraftSeoHandler(req: Request, res: Response) {
  try {
    const idParam = getParamAsString(req.params.id)
    const draftId = idParam ? parsePositiveInt(idParam) : null

    if (!draftId) {
      return sendError(
        res,
        'Invalid draft id',
        { code: 'INVALID_DRAFT_ID' },
        400
      )
    }

    const userId = req.authUser!.id

    const seoMeta = await getDraftSeoMeta(draftId, userId)

    return sendSuccess(res, seoMeta, 'Draft SEO fetched successfully')
  } catch (error) {
    const message =
      error instanceof Error && error.message === 'Draft not found'
        ? 'Draft not found'
        : 'Failed to fetch draft SEO'

    const code =
      error instanceof Error && error.message === 'Draft not found'
        ? 'DRAFT_NOT_FOUND'
        : 'FETCH_DRAFT_SEO_FAILED'

    const statusCode =
      error instanceof Error && error.message === 'Draft not found'
        ? 404
        : 500

    return sendErrorNormalized(res, error, {
      message,
      code,
      status: statusCode,
    })
  }
}
