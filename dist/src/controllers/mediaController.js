"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listDraftImagesHandler = listDraftImagesHandler;
exports.uploadDraftImageHandler = uploadDraftImageHandler;
exports.updateDraftImageHandler = updateDraftImageHandler;
exports.deleteDraftImageHandler = deleteDraftImageHandler;
exports.saveGeneratedDraftImageHandler = saveGeneratedDraftImageHandler;
exports.uploadDraftImageToWpHandler = uploadDraftImageToWpHandler;
exports.setDraftFeaturedImageHandler = setDraftFeaturedImageHandler;
exports.insertDraftImageHandler = insertDraftImageHandler;
const client_1 = require("@prisma/client");
const path_1 = __importDefault(require("path"));
const mediaService_1 = require("../services/mediaService");
const apiResponse_1 = require("../utils/apiResponse");
const paramString_1 = require("../utils/paramString");
const positiveInt_1 = require("../utils/positiveInt");
async function listDraftImagesHandler(req, res) {
    try {
        const idParam = (0, paramString_1.getParamAsString)(req.params.id);
        const draftId = idParam ? (0, positiveInt_1.parsePositiveInt)(idParam) : null;
        if (!draftId) {
            return (0, apiResponse_1.sendError)(res, 'Invalid draft id', { code: 'INVALID_DRAFT_ID' }, 400);
        }
        const userId = req.authUser.id;
        const images = await (0, mediaService_1.getDraftImages)(draftId, userId);
        return (0, apiResponse_1.sendSuccess)(res, images, 'Draft images fetched successfully');
    }
    catch (error) {
        const message = error instanceof Error && error.message === 'Draft not found'
            ? 'Draft not found'
            : 'Failed to fetch draft images';
        const code = error instanceof Error && error.message === 'Draft not found'
            ? 'DRAFT_NOT_FOUND'
            : 'FETCH_DRAFT_IMAGES_FAILED';
        const statusCode = error instanceof Error && error.message === 'Draft not found' ? 404 : 500;
        return (0, apiResponse_1.sendErrorNormalized)(res, error, {
            message,
            code,
            status: statusCode,
        });
    }
}
async function uploadDraftImageHandler(req, res) {
    try {
        const idParam = (0, paramString_1.getParamAsString)(req.params.id);
        const draftId = idParam ? (0, positiveInt_1.parsePositiveInt)(idParam) : null;
        if (!draftId) {
            return (0, apiResponse_1.sendError)(res, 'Invalid draft id', { code: 'INVALID_DRAFT_ID' }, 400);
        }
        const userId = req.authUser.id;
        if (!req.file) {
            return (0, apiResponse_1.sendError)(res, 'No image file uploaded', { code: 'FILE_REQUIRED' }, 400);
        }
        const { altText, caption, positionMarker } = req.body;
        const image = await (0, mediaService_1.createDraftImage)({
            draftId,
            userId: userId,
            sourceType: client_1.ImageSourceType.UPLOADED,
            localPath: path_1.default.normalize(req.file.path),
            altText,
            caption,
            positionMarker,
        });
        return (0, apiResponse_1.sendSuccess)(res, image, 'Draft image uploaded successfully', 201);
    }
    catch (error) {
        const message = error instanceof Error && error.message === 'Draft not found'
            ? 'Draft not found'
            : 'Failed to upload draft image';
        const code = error instanceof Error && error.message === 'Draft not found'
            ? 'DRAFT_NOT_FOUND'
            : 'UPLOAD_DRAFT_IMAGE_FAILED';
        const statusCode = error instanceof Error && error.message === 'Draft not found' ? 404 : 500;
        return (0, apiResponse_1.sendErrorNormalized)(res, error, {
            message,
            code,
            status: statusCode,
        });
    }
}
async function updateDraftImageHandler(req, res) {
    try {
        const draftIdParam = (0, paramString_1.getParamAsString)(req.params.id);
        const imageIdParam = (0, paramString_1.getParamAsString)(req.params.imageId);
        const draftId = draftIdParam ? (0, positiveInt_1.parsePositiveInt)(draftIdParam) : null;
        const imageId = imageIdParam ? (0, positiveInt_1.parsePositiveInt)(imageIdParam) : null;
        if (!draftId) {
            return (0, apiResponse_1.sendError)(res, 'Invalid draft id', { code: 'INVALID_DRAFT_ID' }, 400);
        }
        if (!imageId) {
            return (0, apiResponse_1.sendError)(res, 'Invalid image id', { code: 'INVALID_IMAGE_ID' }, 400);
        }
        const userId = req.authUser.id;
        const altText = typeof req.body.altText === 'string' ? req.body.altText : undefined;
        const caption = typeof req.body.caption === 'string' ? req.body.caption : undefined;
        const positionMarker = typeof req.body.positionMarker === 'string'
            ? req.body.positionMarker
            : undefined;
        if (altText === undefined &&
            caption === undefined &&
            positionMarker === undefined) {
            return (0, apiResponse_1.sendError)(res, 'At least one field is required', {
                code: 'VALIDATION_ERROR',
                details: 'Provide at least one of: altText, caption, positionMarker',
            }, 400);
        }
        const result = await (0, mediaService_1.updateDraftImage)({
            draftId,
            imageId,
            userId,
            altText,
            caption,
            positionMarker,
        });
        return (0, apiResponse_1.sendSuccess)(res, result, 'Draft image updated successfully');
    }
    catch (error) {
        const message = error instanceof Error && error.message === 'Draft not found'
            ? 'Draft not found'
            : error instanceof Error && error.message === 'Draft image not found'
                ? 'Draft image not found'
                : error instanceof Error &&
                    error.message === 'Target site not found for WordPress media sync'
                    ? 'Target site not found for WordPress media sync'
                    : 'Failed to update draft image';
        const code = error instanceof Error && error.message === 'Draft not found'
            ? 'DRAFT_NOT_FOUND'
            : error instanceof Error && error.message === 'Draft image not found'
                ? 'DRAFT_IMAGE_NOT_FOUND'
                : error instanceof Error &&
                    error.message === 'Target site not found for WordPress media sync'
                    ? 'TARGET_SITE_NOT_FOUND'
                    : 'UPDATE_DRAFT_IMAGE_FAILED';
        const statusCode = error instanceof Error &&
            (error.message === 'Draft not found' ||
                error.message === 'Draft image not found' ||
                error.message === 'Target site not found for WordPress media sync')
            ? 404
            : 500;
        return (0, apiResponse_1.sendErrorNormalized)(res, error, {
            message,
            code,
            status: statusCode,
        });
    }
}
async function deleteDraftImageHandler(req, res) {
    try {
        const draftIdParam = (0, paramString_1.getParamAsString)(req.params.id);
        const imageIdParam = (0, paramString_1.getParamAsString)(req.params.imageId);
        const draftId = draftIdParam ? (0, positiveInt_1.parsePositiveInt)(draftIdParam) : null;
        const imageId = imageIdParam ? (0, positiveInt_1.parsePositiveInt)(imageIdParam) : null;
        if (!draftId) {
            return (0, apiResponse_1.sendError)(res, 'Invalid draft id', { code: 'INVALID_DRAFT_ID' }, 400);
        }
        if (!imageId) {
            return (0, apiResponse_1.sendError)(res, 'Invalid image id', { code: 'INVALID_IMAGE_ID' }, 400);
        }
        const userId = req.authUser.id;
        const result = await (0, mediaService_1.deleteDraftImage)({
            draftId,
            imageId,
            userId,
        });
        return (0, apiResponse_1.sendSuccess)(res, result, 'Draft image deleted successfully');
    }
    catch (error) {
        const message = error instanceof Error && error.message === 'Draft not found'
            ? 'Draft not found'
            : error instanceof Error && error.message === 'Draft image not found'
                ? 'Draft image not found'
                : 'Failed to delete draft image';
        const code = error instanceof Error && error.message === 'Draft not found'
            ? 'DRAFT_NOT_FOUND'
            : error instanceof Error && error.message === 'Draft image not found'
                ? 'DRAFT_IMAGE_NOT_FOUND'
                : 'DELETE_DRAFT_IMAGE_FAILED';
        const statusCode = error instanceof Error &&
            (error.message === 'Draft not found' ||
                error.message === 'Draft image not found')
            ? 404
            : 500;
        return (0, apiResponse_1.sendErrorNormalized)(res, error, {
            message,
            code,
            status: statusCode,
        });
    }
}
async function saveGeneratedDraftImageHandler(req, res) {
    try {
        const idParam = (0, paramString_1.getParamAsString)(req.params.id);
        const draftId = idParam ? (0, positiveInt_1.parsePositiveInt)(idParam) : null;
        if (!draftId) {
            return (0, apiResponse_1.sendError)(res, 'Invalid draft id', { code: 'INVALID_DRAFT_ID' }, 400);
        }
        const userId = req.authUser.id;
        const imageBase64 = typeof req.body.imageBase64 === 'string' ? req.body.imageBase64.trim() : '';
        const mimeType = typeof req.body.mimeType === 'string' ? req.body.mimeType.trim() : '';
        const altText = typeof req.body.altText === 'string' ? req.body.altText.trim() : undefined;
        const caption = typeof req.body.caption === 'string' ? req.body.caption.trim() : undefined;
        const positionMarker = typeof req.body.positionMarker === 'string'
            ? req.body.positionMarker.trim()
            : undefined;
        const prompt = typeof req.body.prompt === 'string' ? req.body.prompt.trim() : undefined;
        const revisedPrompt = typeof req.body.revisedPrompt === 'string'
            ? req.body.revisedPrompt.trim()
            : undefined;
        if (!imageBase64 || !mimeType) {
            return (0, apiResponse_1.sendError)(res, 'imageBase64 and mimeType are required', {
                code: 'VALIDATION_ERROR',
                details: 'imageBase64 and mimeType are required',
            }, 400);
        }
        const result = await (0, mediaService_1.saveGeneratedDraftImage)({
            draftId,
            userId,
            imageBase64,
            mimeType,
            altText,
            caption,
            positionMarker,
            prompt,
            revisedPrompt,
        });
        return (0, apiResponse_1.sendSuccess)(res, result, 'Generated draft image saved successfully', 201);
    }
    catch (error) {
        const message = error instanceof Error &&
            (error.message === 'Draft not found' ||
                error.message === 'Unsupported image mime type' ||
                error.message === 'Invalid base64 image data')
            ? error.message
            : 'Failed to save generated draft image';
        const code = error instanceof Error && error.message === 'Draft not found'
            ? 'DRAFT_NOT_FOUND'
            : error instanceof Error && error.message === 'Unsupported image mime type'
                ? 'UNSUPPORTED_IMAGE_MIME_TYPE'
                : error instanceof Error && error.message === 'Invalid base64 image data'
                    ? 'INVALID_IMAGE_DATA'
                    : 'SAVE_GENERATED_DRAFT_IMAGE_FAILED';
        const statusCode = error instanceof Error &&
            (error.message === 'Draft not found')
            ? 404
            : error instanceof Error &&
                (error.message === 'Unsupported image mime type' ||
                    error.message === 'Invalid base64 image data')
                ? 400
                : 500;
        return (0, apiResponse_1.sendErrorNormalized)(res, error, {
            message,
            code,
            status: statusCode,
        });
    }
}
async function uploadDraftImageToWpHandler(req, res) {
    try {
        const draftIdParam = (0, paramString_1.getParamAsString)(req.params.id);
        const imageIdParam = (0, paramString_1.getParamAsString)(req.params.imageId);
        const draftId = draftIdParam ? (0, positiveInt_1.parsePositiveInt)(draftIdParam) : null;
        const imageId = imageIdParam ? (0, positiveInt_1.parsePositiveInt)(imageIdParam) : null;
        if (!draftId) {
            return (0, apiResponse_1.sendError)(res, 'Invalid draft id', { code: 'INVALID_DRAFT_ID' }, 400);
        }
        if (!imageId) {
            return (0, apiResponse_1.sendError)(res, 'Invalid image id', { code: 'INVALID_IMAGE_ID' }, 400);
        }
        const userId = req.authUser.id;
        const { siteId } = req.body;
        const result = await (0, mediaService_1.uploadDraftImageToWp)({
            draftId,
            imageId,
            userId: userId,
            siteId,
        });
        return (0, apiResponse_1.sendSuccess)(res, result, 'Draft image uploaded to WordPress successfully');
    }
    catch (error) {
        return (0, apiResponse_1.sendErrorNormalized)(res, error, {
            message: 'Failed to upload draft image to WordPress',
            code: 'UPLOAD_DRAFT_IMAGE_TO_WP_FAILED',
            status: 500,
        });
    }
}
async function setDraftFeaturedImageHandler(req, res) {
    try {
        const draftIdParam = (0, paramString_1.getParamAsString)(req.params.id);
        const imageIdParam = (0, paramString_1.getParamAsString)(req.params.imageId);
        const draftId = draftIdParam ? (0, positiveInt_1.parsePositiveInt)(draftIdParam) : null;
        const imageId = imageIdParam ? (0, positiveInt_1.parsePositiveInt)(imageIdParam) : null;
        if (!draftId) {
            return (0, apiResponse_1.sendError)(res, 'Invalid draft id', { code: 'INVALID_DRAFT_ID' }, 400);
        }
        if (!imageId) {
            return (0, apiResponse_1.sendError)(res, 'Invalid image id', { code: 'INVALID_IMAGE_ID' }, 400);
        }
        const userId = req.authUser.id;
        if (!userId) {
            return (0, apiResponse_1.sendError)(res, 'Invalid user!', { code: 'USER_NOT_FOUND' }, 400);
        }
        const result = await (0, mediaService_1.setDraftFeaturedImage)(draftId, imageId, userId);
        return (0, apiResponse_1.sendSuccess)(res, result, 'Featured image set successfully');
    }
    catch (error) {
        return (0, apiResponse_1.sendErrorNormalized)(res, error, {
            message: 'Failed to set featured image',
            code: 'SET_FEATURED_IMAGE_FAILED',
            status: 500,
        });
    }
}
async function insertDraftImageHandler(req, res) {
    try {
        const draftIdParam = (0, paramString_1.getParamAsString)(req.params.id);
        const imageIdParam = (0, paramString_1.getParamAsString)(req.params.imageId);
        const draftId = draftIdParam ? (0, positiveInt_1.parsePositiveInt)(draftIdParam) : null;
        const imageId = imageIdParam ? (0, positiveInt_1.parsePositiveInt)(imageIdParam) : null;
        if (!draftId) {
            return (0, apiResponse_1.sendError)(res, 'Invalid draft id', { code: 'INVALID_DRAFT_ID' }, 400);
        }
        if (!imageId) {
            return (0, apiResponse_1.sendError)(res, 'Invalid image id', { code: 'INVALID_IMAGE_ID' }, 400);
        }
        const userId = req.authUser.id;
        if (!userId) {
            return (0, apiResponse_1.sendError)(res, 'Invalid user!', { code: 'USER_NOT_FOUND' }, 400);
        }
        const { insertType, targetHeadingText, targetHeadingLevel, paragraphIndexInSection, } = req.body;
        if (!insertType) {
            return (0, apiResponse_1.sendError)(res, 'insertType is required', { code: 'VALIDATION_ERROR' }, 400);
        }
        const result = await (0, mediaService_1.insertDraftImage)({
            draftId,
            imageId,
            userId: userId,
            insertType: insertType,
            targetHeadingText,
            targetHeadingLevel,
            paragraphIndexInSection,
        });
        return (0, apiResponse_1.sendSuccess)(res, result, 'Draft image inserted successfully');
    }
    catch (error) {
        return (0, apiResponse_1.sendErrorNormalized)(res, error, {
            message: 'Failed to insert draft image',
            code: 'INSERT_DRAFT_IMAGE_FAILED',
            status: 500,
        });
    }
}
