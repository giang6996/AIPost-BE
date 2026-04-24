import { Request, Response } from 'express'
import { sendError, sendErrorNormalized, sendSuccess } from '../utils/apiResponse'
import { prisma } from '../lib/prisma'
import { getParamAsString } from '../utils/paramString'
import { parsePositiveInt } from '../utils/positiveInt'
import {
  createSite,
  createSiteCategory,
  createSiteTag,
  getAllSites,
  testSiteConnectionOnly,
  getSiteCategories,
  getSiteTags,
  updateSiteCategory,
  updateSiteTag,
  updateSite,
  deleteSite
} from '../services/siteService'

function isValidUrl(value: string): boolean {
  try {
    new URL(value)
    return true
  } catch {
    return false
  }
}

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

export async function listSites(req: Request, res: Response) {
  try {
    const userId = req.authUser!.id



    const sites = await getAllSites(userId)
    return sendSuccess(res, sites, 'Sites fetched successfully')
  } catch (error) {
    return sendErrorNormalized(res, error, {
      message: 'Failed to fetch sites',
      code: 'FETCH_SITES_FAILED',
      status: 500,
    })
  }
}

export async function createSiteHandler(req: Request, res: Response) {
  try {
    const userId = req.authUser!.id

    const siteName = normalizeOptionalString(req.body.siteName)
    const siteUrl = normalizeOptionalString(req.body.siteUrl)
    const wpUsername = normalizeOptionalString(req.body.wpUsername)
    const wpApplicationPassword = normalizeOptionalString(req.body.wpApplicationPassword)
    const snippetEnabled =
      typeof req.body.snippetEnabled === 'boolean'
        ? req.body.snippetEnabled
        : false

    if (!siteName || !siteUrl || !wpUsername || !wpApplicationPassword) {
      return sendError(
        res,
        'Missing required fields',
        {
          code: 'VALIDATION_ERROR',
          details: 'siteName, siteUrl, wpUsername, wpApplicationPassword are required',
        },
        400
      )
    }

    if (!isValidUrl(siteUrl)) {
      return sendError(
        res,
        'Invalid site URL',
        { code: 'INVALID_SITE_URL' },
        400
      )
    }

    const site = await createSite({
      userId,
      siteName,
      siteUrl,
      wpUsername,
      wpApplicationPassword,
      snippetEnabled,
    })

    return sendSuccess(res, site, 'Site created successfully', 201)
  } catch (error) {
    return sendErrorNormalized(res, error, {
      message: 'Failed to create site',
      code: 'CREATE_SITE_FAILED',
      status: 500,
    })
  }
}

export async function testConnectionHandler(req: Request, res: Response) {
  try {
    const { siteUrl, wpUsername, wpApplicationPassword } = req.body

    if (!siteUrl || !wpUsername || !wpApplicationPassword) {
      return sendError(
        res,
        'Missing required fields',
        { code: 'VALIDATION_ERROR', details: 'siteUrl, wpUsername, wpApplicationPassword are required' },
        400
      )
    }

    if (!isValidUrl(siteUrl)) {
      return sendError(
        res,
        'Invalid site URL',
        { code: 'INVALID_SITE_URL' },
        400
      )
    }

    const result = await testSiteConnectionOnly({
      siteUrl,
      wpUsername,
      wpApplicationPassword,
    })

    if (!result.success) {
      return sendError(
        res,
        result.message,
        { code: 'WP_CONNECTION_FAILED' },
        401
      )
    }

    return sendSuccess(res, result, 'WordPress connection successful')
  } catch (error) {
    return sendErrorNormalized(res, error, {
      message: 'Failed to test WordPress connection',
      code: 'TEST_CONNECTION_FAILED',
      status: 500,
    })
  }
}

export async function updateSiteHandler(req: Request, res: Response) {
  try {
    const idParam = getParamAsString(req.params.id)
    const siteId = idParam ? parsePositiveInt(idParam) : null

    if (!siteId) {
      return sendError(
        res,
        'Invalid site id',
        { code: 'INVALID_SITE_ID' },
        400
      )
    }

    const siteName = normalizeOptionalString(req.body.siteName)
    const siteUrl = normalizeOptionalString(req.body.siteUrl)
    const wpUsername = normalizeOptionalString(req.body.wpUsername)
    const wpApplicationPassword = normalizeOptionalString(req.body.wpApplicationPassword)
    const snippetEnabled =
      typeof req.body.snippetEnabled === 'boolean'
        ? req.body.snippetEnabled
        : undefined

    if (
      siteName === undefined &&
      siteUrl === undefined &&
      wpUsername === undefined &&
      wpApplicationPassword === undefined &&
      snippetEnabled === undefined
    ) {
      return sendError(
        res,
        'At least one field is required',
        {
          code: 'VALIDATION_ERROR',
          details:
            'Provide at least one of: siteName, siteUrl, wpUsername, wpApplicationPassword, snippetEnabled',
        },
        400
      )
    }

    const userId = req.authUser!.id



    const updatedSite = await updateSite(siteId, userId, {
      siteName,
      siteUrl,
      wpUsername,
      wpApplicationPassword,
      snippetEnabled,
    })

    return sendSuccess(res, updatedSite, 'Site updated successfully')
  } catch (error) {
    const isSiteNotFound =
      error instanceof Error && error.message === 'Site not found'

    return sendErrorNormalized(res, error, {
      message: isSiteNotFound ? 'Site not found' : 'Failed to update site',
      code: isSiteNotFound ? 'SITE_NOT_FOUND' : 'UPDATE_SITE_FAILED',
      status: isSiteNotFound ? 404 : 500,
    })
  }
}

export async function deleteSiteHandler(req: Request, res: Response) {
  try {
    const idParam = getParamAsString(req.params.id)
    const siteId = idParam ? parsePositiveInt(idParam) : null

    if (!siteId) {
      return sendError(
        res,
        'Invalid site id',
        { code: 'INVALID_SITE_ID' },
        400
      )
    }

    const userId = req.authUser!.id



    const deletedSite = await deleteSite(siteId, userId)

    return sendSuccess(res, deletedSite, 'Site deleted successfully')
  } catch (error) {
    const isSiteNotFound =
      error instanceof Error && error.message === 'Site not found'

    return sendErrorNormalized(res, error, {
      message: isSiteNotFound ? 'Site not found' : 'Failed to delete site',
      code: isSiteNotFound ? 'SITE_NOT_FOUND' : 'DELETE_SITE_FAILED',
      status: isSiteNotFound ? 404 : 500,
    })
  }
}

export async function listSiteCategoriesHandler(req: Request, res: Response) {
  try {
    const idParam = getParamAsString(req.params.id)
    const siteId = idParam ? parsePositiveInt(idParam) : null

    if (!siteId) {
      return sendError(
        res,
        'Invalid site id',
        { code: 'INVALID_SITE_ID' },
        400
      )
    }

    const userId = req.authUser!.id



    const categories = await getSiteCategories(siteId, userId)

    return sendSuccess(res, categories, 'Site categories fetched successfully')
  } catch (error) {
    const message =
      error instanceof Error && error.message === 'Site not found'
        ? 'Site not found'
        : 'Failed to fetch site categories'

    const code =
      error instanceof Error && error.message === 'Site not found'
        ? 'SITE_NOT_FOUND'
        : 'FETCH_SITE_CATEGORIES_FAILED'

    const statusCode =
      error instanceof Error && error.message === 'Site not found' ? 404 : 500

    return sendErrorNormalized(res, error, {
      message,
      code,
      status: statusCode,
    })
  }
}

export async function listSiteTagsHandler(req: Request, res: Response) {
  try {
    const idParam = getParamAsString(req.params.id)
    const siteId = idParam ? parsePositiveInt(idParam) : null

    if (!siteId) {
      return sendError(
        res,
        'Invalid site id',
        { code: 'INVALID_SITE_ID' },
        400
      )
    }

    const userId = req.authUser!.id



    const tags = await getSiteTags(siteId, userId)

    return sendSuccess(res, tags, 'Site tags fetched successfully')
  } catch (error) {
    const message =
      error instanceof Error && error.message === 'Site not found'
        ? 'Site not found'
        : 'Failed to fetch site tags'

    const code =
      error instanceof Error && error.message === 'Site not found'
        ? 'SITE_NOT_FOUND'
        : 'FETCH_SITE_TAGS_FAILED'

    const statusCode =
      error instanceof Error && error.message === 'Site not found' ? 404 : 500

    return sendErrorNormalized(res, error, {
      message,
      code,
      status: statusCode,
    })
  }
}

export async function createSiteCategoryHandler(req: Request, res: Response) {
  try {
    const idParam = getParamAsString(req.params.id)
    const siteId = idParam ? parsePositiveInt(idParam) : null

    if (!siteId) {
      return sendError(res, 'Invalid site id', { code: 'INVALID_SITE_ID' }, 400)
    }

    const name = normalizeOptionalString(req.body.name)
    const slug = normalizeOptionalString(req.body.slug)
    const description = normalizeOptionalString(req.body.description)

    if (!name) {
      return sendError(
        res,
        'Category name is required',
        { code: 'VALIDATION_ERROR', details: 'name is required' },
        400
      )
    }

    const userId = req.authUser!.id



    const category = await createSiteCategory(siteId, userId, {
      name,
      slug,
      description,
    })

    return sendSuccess(res, category, 'Category created successfully')
  } catch (error) {
    const isSiteNotFound =
      error instanceof Error && error.message === 'Site not found'

    return sendErrorNormalized(res, error, {
      message: isSiteNotFound ? 'Site not found' : 'Failed to create category',
      code: isSiteNotFound ? 'SITE_NOT_FOUND' : 'CREATE_CATEGORY_FAILED',
      status: isSiteNotFound ? 404 : 500,
    })
  }
}

export async function updateSiteCategoryHandler(req: Request, res: Response) {
  try {
    const idParam = getParamAsString(req.params.id)
    const categoryIdParam = getParamAsString(req.params.categoryId)

    const siteId = idParam ? parsePositiveInt(idParam) : null
    const categoryId = categoryIdParam ? parsePositiveInt(categoryIdParam) : null

    if (!siteId) {
      return sendError(res, 'Invalid site id', { code: 'INVALID_SITE_ID' }, 400)
    }

    if (!categoryId) {
      return sendError(
        res,
        'Invalid category id',
        { code: 'INVALID_CATEGORY_ID' },
        400
      )
    }

    const name = normalizeOptionalString(req.body.name)
    const slug = normalizeOptionalString(req.body.slug)
    const description = normalizeOptionalString(req.body.description)

    if (!name && !slug && !description) {
      return sendError(
        res,
        'At least one field is required',
        {
          code: 'VALIDATION_ERROR',
          details: 'Provide at least one of: name, slug, description',
        },
        400
      )
    }

    const userId = req.authUser!.id



    const category = await updateSiteCategory(siteId, categoryId, userId, {
      name,
      slug,
      description,
    })

    return sendSuccess(res, category, 'Category updated successfully')
  } catch (error) {
    const isSiteNotFound =
      error instanceof Error && error.message === 'Site not found'

    return sendErrorNormalized(res, error, {
      message: isSiteNotFound ? 'Site not found' : 'Failed to update category',
      code: isSiteNotFound ? 'SITE_NOT_FOUND' : 'UPDATE_CATEGORY_FAILED',
      status: isSiteNotFound ? 404 : 500,
    })
  }
}

export async function createSiteTagHandler(req: Request, res: Response) {
  try {
    const idParam = getParamAsString(req.params.id)
    const siteId = idParam ? parsePositiveInt(idParam) : null

    if (!siteId) {
      return sendError(res, 'Invalid site id', { code: 'INVALID_SITE_ID' }, 400)
    }

    const name = normalizeOptionalString(req.body.name)
    const slug = normalizeOptionalString(req.body.slug)
    const description = normalizeOptionalString(req.body.description)

    if (!name) {
      return sendError(
        res,
        'Tag name is required',
        { code: 'VALIDATION_ERROR', details: 'name is required' },
        400
      )
    }

    const userId = req.authUser!.id



    const tag = await createSiteTag(siteId, userId, {
      name,
      slug,
      description,
    })

    return sendSuccess(res, tag, 'Tag created successfully')
  } catch (error) {
    const isSiteNotFound =
      error instanceof Error && error.message === 'Site not found'

    return sendErrorNormalized(res, error, {
      message: isSiteNotFound ? 'Site not found' : 'Failed to create tag',
      code: isSiteNotFound ? 'SITE_NOT_FOUND' : 'CREATE_TAG_FAILED',
      status: isSiteNotFound ? 404 : 500,
    })
  }
}

export async function updateSiteTagHandler(req: Request, res: Response) {
  try {
    const idParam = getParamAsString(req.params.id)
    const tagIdParam = getParamAsString(req.params.tagId)

    const siteId = idParam ? parsePositiveInt(idParam) : null
    const tagId = tagIdParam ? parsePositiveInt(tagIdParam) : null

    if (!siteId) {
      return sendError(res, 'Invalid site id', { code: 'INVALID_SITE_ID' }, 400)
    }

    if (!tagId) {
      return sendError(res, 'Invalid tag id', { code: 'INVALID_TAG_ID' }, 400)
    }

    const name = normalizeOptionalString(req.body.name)
    const slug = normalizeOptionalString(req.body.slug)
    const description = normalizeOptionalString(req.body.description)

    if (!name && !slug && !description) {
      return sendError(
        res,
        'At least one field is required',
        {
          code: 'VALIDATION_ERROR',
          details: 'Provide at least one of: name, slug, description',
        },
        400
      )
    }

    const userId = req.authUser!.id



    const tag = await updateSiteTag(siteId, tagId, userId, {
      name,
      slug,
      description,
    })

    return sendSuccess(res, tag, 'Tag updated successfully')
  } catch (error) {
    const isSiteNotFound =
      error instanceof Error && error.message === 'Site not found'

    return sendErrorNormalized(res, error, {
      message: isSiteNotFound ? 'Site not found' : 'Failed to update tag',
      code: isSiteNotFound ? 'SITE_NOT_FOUND' : 'UPDATE_TAG_FAILED',
      status: isSiteNotFound ? 404 : 500,
    })
  }
}

