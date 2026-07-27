import { ImageSourceType, ImageInsertType } from '@prisma/client'
import { Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { 
  createDraftImage, 
  getDraftImages, 
  uploadDraftImageToWp, 
  setDraftFeaturedImage, 
  insertDraftImage, 
  saveGeneratedDraftImage,
  updateDraftImage,
  deleteDraftImage, } from '../services/mediaService'
import { storeUploadedImage } from '../services/mediaStorageService'
import { sendError, sendErrorNormalized, sendSuccess } from '../utils/apiResponse'
import { getParamAsString } from '../utils/paramString'
import { parsePositiveInt} from '../utils/positiveInt'

export async function listDraftImagesHandler(req: Request, res: Response) {
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



    const images = await getDraftImages(draftId, userId)

    return sendSuccess(res, images, 'Draft images fetched successfully')
  } catch (error) {
    const message =
      error instanceof Error && error.message === 'Draft not found'
        ? 'Draft not found'
        : 'Failed to fetch draft images'

    const code =
      error instanceof Error && error.message === 'Draft not found'
        ? 'DRAFT_NOT_FOUND'
        : 'FETCH_DRAFT_IMAGES_FAILED'

    const statusCode =
      error instanceof Error && error.message === 'Draft not found' ? 404 : 500

    return sendErrorNormalized(res, error, {
      message,
      code,
      status: statusCode,
    })
  }
}

export async function uploadDraftImageHandler(req: Request, res: Response) {
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



    if (!req.file) {
      return sendError(
        res,
        'No image file uploaded',
        { code: 'FILE_REQUIRED' },
        400
      )
    }

    const { altText, caption, positionMarker } = req.body

    const storedImage = await storeUploadedImage({
      localPath: req.file.path,
    })

    const image = await createDraftImage({
      draftId,
      userId: userId,
      sourceType: ImageSourceType.UPLOADED,
      localPath: storedImage.localPath,
      altText,
      caption,
      positionMarker,
    })

    return sendSuccess(res, image, 'Draft image uploaded successfully', 201)
  } catch (error) {
    const message =
      error instanceof Error && error.message === 'Draft not found'
        ? 'Draft not found'
        : 'Failed to upload draft image'

    const code =
      error instanceof Error && error.message === 'Draft not found'
        ? 'DRAFT_NOT_FOUND'
        : 'UPLOAD_DRAFT_IMAGE_FAILED'

    const statusCode =
      error instanceof Error && error.message === 'Draft not found' ? 404 : 500

    return sendErrorNormalized(res, error, {
      message,
      code,
      status: statusCode,
    })
  }
}

export async function updateDraftImageHandler(req: Request, res: Response) {
  try {
    const draftIdParam = getParamAsString(req.params.id)
    const imageIdParam = getParamAsString(req.params.imageId)

    const draftId = draftIdParam ? parsePositiveInt(draftIdParam) : null
    const imageId = imageIdParam ? parsePositiveInt(imageIdParam) : null

    if (!draftId) {
      return sendError(
        res,
        'Invalid draft id',
        { code: 'INVALID_DRAFT_ID' },
        400
      )
    }

    if (!imageId) {
      return sendError(
        res,
        'Invalid image id',
        { code: 'INVALID_IMAGE_ID' },
        400
      )
    }

    const userId = req.authUser!.id

    const altText =
      typeof req.body.altText === 'string' ? req.body.altText : undefined
    const caption =
      typeof req.body.caption === 'string' ? req.body.caption : undefined
    const positionMarker =
      typeof req.body.positionMarker === 'string'
        ? req.body.positionMarker
        : undefined

    if (
      altText === undefined &&
      caption === undefined &&
      positionMarker === undefined
    ) {
      return sendError(
        res,
        'At least one field is required',
        {
          code: 'VALIDATION_ERROR',
          details: 'Provide at least one of: altText, caption, positionMarker',
        },
        400
      )
    }

    const result = await updateDraftImage({
      draftId,
      imageId,
      userId,
      altText,
      caption,
      positionMarker,
    })

    return sendSuccess(res, result, 'Draft image updated successfully')
  } catch (error) {
    const message =
      error instanceof Error && error.message === 'Draft not found'
        ? 'Draft not found'
        : error instanceof Error && error.message === 'Draft image not found'
        ? 'Draft image not found'
        : error instanceof Error &&
          error.message === 'Target site not found for WordPress media sync'
        ? 'Target site not found for WordPress media sync'
        : 'Failed to update draft image'

    const code =
      error instanceof Error && error.message === 'Draft not found'
        ? 'DRAFT_NOT_FOUND'
        : error instanceof Error && error.message === 'Draft image not found'
        ? 'DRAFT_IMAGE_NOT_FOUND'
        : error instanceof Error &&
          error.message === 'Target site not found for WordPress media sync'
        ? 'TARGET_SITE_NOT_FOUND'
        : 'UPDATE_DRAFT_IMAGE_FAILED'

    const statusCode =
      error instanceof Error &&
      (
        error.message === 'Draft not found' ||
        error.message === 'Draft image not found' ||
        error.message === 'Target site not found for WordPress media sync'
      )
        ? 404
        : 500

    return sendErrorNormalized(res, error, {
      message,
      code,
      status: statusCode,
    })
  }
}

export async function deleteDraftImageHandler(req: Request, res: Response) {
  try {
    const draftIdParam = getParamAsString(req.params.id)
    const imageIdParam = getParamAsString(req.params.imageId)

    const draftId = draftIdParam ? parsePositiveInt(draftIdParam) : null
    const imageId = imageIdParam ? parsePositiveInt(imageIdParam) : null

    if (!draftId) {
      return sendError(
        res,
        'Invalid draft id',
        { code: 'INVALID_DRAFT_ID' },
        400
      )
    }

    if (!imageId) {
      return sendError(
        res,
        'Invalid image id',
        { code: 'INVALID_IMAGE_ID' },
        400
      )
    }

    const userId = req.authUser!.id

    const result = await deleteDraftImage({
      draftId,
      imageId,
      userId,
    })

    return sendSuccess(res, result, 'Draft image deleted successfully')
  } catch (error) {
    const message =
      error instanceof Error && error.message === 'Draft not found'
        ? 'Draft not found'
        : error instanceof Error && error.message === 'Draft image not found'
        ? 'Draft image not found'
        : 'Failed to delete draft image'

    const code =
      error instanceof Error && error.message === 'Draft not found'
        ? 'DRAFT_NOT_FOUND'
        : error instanceof Error && error.message === 'Draft image not found'
        ? 'DRAFT_IMAGE_NOT_FOUND'
        : 'DELETE_DRAFT_IMAGE_FAILED'

    const statusCode =
      error instanceof Error &&
      (error.message === 'Draft not found' ||
        error.message === 'Draft image not found')
        ? 404
        : 500

    return sendErrorNormalized(res, error, {
      message,
      code,
      status: statusCode,
    })
  }
}

export async function saveGeneratedDraftImageHandler(req: Request, res: Response) {
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

    const imageBase64 =
      typeof req.body.imageBase64 === 'string' ? req.body.imageBase64.trim() : ''
    const mimeType =
      typeof req.body.mimeType === 'string' ? req.body.mimeType.trim() : ''
    const altText =
      typeof req.body.altText === 'string' ? req.body.altText.trim() : undefined
    const caption =
      typeof req.body.caption === 'string' ? req.body.caption.trim() : undefined
    const positionMarker =
      typeof req.body.positionMarker === 'string'
        ? req.body.positionMarker.trim()
        : undefined
    const prompt =
      typeof req.body.prompt === 'string' ? req.body.prompt.trim() : undefined
    const revisedPrompt =
      typeof req.body.revisedPrompt === 'string'
        ? req.body.revisedPrompt.trim()
        : undefined

    if (!imageBase64 || !mimeType) {
      return sendError(
        res,
        'imageBase64 and mimeType are required',
        {
          code: 'VALIDATION_ERROR',
          details: 'imageBase64 and mimeType are required',
        },
        400
      )
    }

    const result = await saveGeneratedDraftImage({
      draftId,
      userId,
      imageBase64,
      mimeType,
      altText,
      caption,
      positionMarker,
      prompt,
      revisedPrompt,
    })

    return sendSuccess(
      res,
      result,
      'Generated draft image saved successfully',
      201
    )
  } catch (error) {
    const message =
      error instanceof Error &&
      (
        error.message === 'Draft not found' ||
        error.message === 'Unsupported image mime type' ||
        error.message === 'Invalid base64 image data'
      )
        ? error.message
        : 'Failed to save generated draft image'

    const code =
      error instanceof Error && error.message === 'Draft not found'
        ? 'DRAFT_NOT_FOUND'
        : error instanceof Error && error.message === 'Unsupported image mime type'
        ? 'UNSUPPORTED_IMAGE_MIME_TYPE'
        : error instanceof Error && error.message === 'Invalid base64 image data'
        ? 'INVALID_IMAGE_DATA'
        : 'SAVE_GENERATED_DRAFT_IMAGE_FAILED'

    const statusCode =
      error instanceof Error &&
      (
        error.message === 'Draft not found'
      )
        ? 404
        : error instanceof Error &&
          (
            error.message === 'Unsupported image mime type' ||
            error.message === 'Invalid base64 image data'
          )
        ? 400
        : 500

    return sendErrorNormalized(res, error, {
      message,
      code,
      status: statusCode,
    })
  }
}


export async function uploadDraftImageToWpHandler(req: Request, res: Response) {
  try {
    const draftIdParam = getParamAsString(req.params.id)
    const imageIdParam = getParamAsString(req.params.imageId)

    const draftId = draftIdParam ? parsePositiveInt(draftIdParam) : null
    const imageId = imageIdParam ? parsePositiveInt(imageIdParam) : null

    if (!draftId) {
      return sendError(
        res,
        'Invalid draft id',
        { code: 'INVALID_DRAFT_ID' },
        400
      )
    }

    if (!imageId) {
      return sendError(
        res,
        'Invalid image id',
        { code: 'INVALID_IMAGE_ID' },
        400
      )
    }

    const userId = req.authUser!.id



    const { siteId } = req.body

    const result = await uploadDraftImageToWp({
      draftId,
      imageId,
      userId: userId,
      siteId,
    })

    return sendSuccess(res, result, 'Draft image uploaded to WordPress successfully')
  } catch (error) {
    return sendErrorNormalized(res, error, {
      message: 'Failed to upload draft image to WordPress',
      code: 'UPLOAD_DRAFT_IMAGE_TO_WP_FAILED',
      status: 500,
    })
  }
}

export async function setDraftFeaturedImageHandler(req: Request, res: Response) {
  try {
    const draftIdParam = getParamAsString(req.params.id)
    const imageIdParam = getParamAsString(req.params.imageId)

    const draftId = draftIdParam ? parsePositiveInt(draftIdParam) : null
    const imageId = imageIdParam ? parsePositiveInt(imageIdParam) : null

    if (!draftId) {
      return sendError(res, 'Invalid draft id', { code: 'INVALID_DRAFT_ID' }, 400)
    }

    if (!imageId) {
      return sendError(res, 'Invalid image id', { code: 'INVALID_IMAGE_ID' }, 400)
    }

    const userId = req.authUser!.id

    if (!userId) {
      return sendError(res, 'Invalid user!', { code: 'USER_NOT_FOUND' }, 400)
    }

    const result = await setDraftFeaturedImage(draftId, imageId, userId)

    return sendSuccess(res, result, 'Featured image set successfully')
  } catch (error) {
    return sendErrorNormalized(res, error, {
      message: 'Failed to set featured image',
      code: 'SET_FEATURED_IMAGE_FAILED',
      status: 500,
    })
  }
}

export async function insertDraftImageHandler(req: Request, res: Response) {
  try {
    const draftIdParam = getParamAsString(req.params.id)
    const imageIdParam = getParamAsString(req.params.imageId)

    const draftId = draftIdParam ? parsePositiveInt(draftIdParam) : null
    const imageId = imageIdParam ? parsePositiveInt(imageIdParam) : null

    if (!draftId) {
      return sendError(res, 'Invalid draft id', { code: 'INVALID_DRAFT_ID' }, 400)
    }

    if (!imageId) {
      return sendError(res, 'Invalid image id', { code: 'INVALID_IMAGE_ID' }, 400)
    }

    const userId = req.authUser!.id

    if (!userId) {
      return sendError(res, 'Invalid user!', { code: 'USER_NOT_FOUND' }, 400)
    }

    const {
      insertType,
      targetHeadingText,
      targetHeadingLevel,
      paragraphIndexInSection,
    } = req.body

    if (!insertType) {
      return sendError(
        res,
        'insertType is required',
        { code: 'VALIDATION_ERROR' },
        400
      )
    }

    const result = await insertDraftImage({
      draftId,
      imageId,
      userId: userId,
      insertType: insertType as ImageInsertType,
      targetHeadingText,
      targetHeadingLevel,
      paragraphIndexInSection,
    })

    return sendSuccess(res, result, 'Draft image inserted successfully')
  } catch (error) {
    return sendErrorNormalized(res, error, {
      message: 'Failed to insert draft image',
      code: 'INSERT_DRAFT_IMAGE_FAILED',
      status: 500,
    })
  }
}
