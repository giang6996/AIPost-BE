"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listDrafts = listDrafts;
exports.getDraftHandler = getDraftHandler;
exports.createDraftHandler = createDraftHandler;
exports.updateDraftHandler = updateDraftHandler;
exports.deleteDraftHandler = deleteDraftHandler;
exports.getDraftCategoriesHandler = getDraftCategoriesHandler;
exports.updateDraftCategoriesHandler = updateDraftCategoriesHandler;
exports.getDraftTagsHandler = getDraftTagsHandler;
exports.updateDraftTagsHandler = updateDraftTagsHandler;
exports.updateDraftSeoHandler = updateDraftSeoHandler;
exports.getDraftSeoHandler = getDraftSeoHandler;
const paramString_1 = require("../utils/paramString");
const positiveInt_1 = require("../utils/positiveInt");
const apiResponse_1 = require("../utils/apiResponse");
const draftService_1 = require("../services/draftService");
function parseId(value) {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}
async function listDrafts(req, res) {
    try {
        const userId = req.authUser.id;
        const drafts = await (0, draftService_1.getAllDrafts)(userId);
        return (0, apiResponse_1.sendSuccess)(res, drafts, 'Drafts fetched successfully');
    }
    catch (error) {
        return (0, apiResponse_1.sendErrorNormalized)(res, error, {
            message: 'Failed to fetch drafts',
            code: 'FETCH_DRAFTS_FAILED',
            status: 500,
        });
    }
}
async function getDraftHandler(req, res) {
    try {
        const Id = (0, paramString_1.getParamAsString)(req.params.id);
        const draftId = Id ? parseId(Id) : null;
        if (!draftId) {
            return (0, apiResponse_1.sendError)(res, 'Invalid draft id', { code: 'INVALID_DRAFT_ID' }, 400);
        }
        const userId = req.authUser.id;
        const draft = await (0, draftService_1.getDraftById)(draftId, userId);
        if (!draft) {
            return (0, apiResponse_1.sendError)(res, 'Draft not found', { code: 'DRAFT_NOT_FOUND' }, 404);
        }
        return (0, apiResponse_1.sendSuccess)(res, draft, 'Draft fetched successfully');
    }
    catch (error) {
        return (0, apiResponse_1.sendErrorNormalized)(res, error, {
            message: 'Failed to fetch draft',
            code: 'FETCH_DRAFT_FAILED',
            status: 500,
        });
    }
}
async function createDraftHandler(req, res) {
    try {
        const { defaultSiteId, title, slug, excerpt, contentHtml, featuredImageUrl, featuredImageAlt, } = req.body;
        if (!title || !contentHtml) {
            return (0, apiResponse_1.sendError)(res, 'Missing required fields', { code: 'VALIDATION_ERROR', details: 'title and contentHtml are required' }, 400);
        }
        const userId = req.authUser.id;
        const draft = await (0, draftService_1.createDraft)({
            userId: userId,
            defaultSiteId: defaultSiteId ?? null,
            title,
            slug,
            excerpt,
            contentHtml,
            featuredImageUrl,
            featuredImageAlt,
        });
        return (0, apiResponse_1.sendSuccess)(res, draft, 'Draft created successfully', 201);
    }
    catch (error) {
        return (0, apiResponse_1.sendErrorNormalized)(res, error, {
            message: 'Failed to create draft',
            code: 'CREATE_DRAFT_FAILED',
            status: 500,
        });
    }
}
async function updateDraftHandler(req, res) {
    try {
        const Id = (0, paramString_1.getParamAsString)(req.params.id);
        const draftId = Id ? parseId(Id) : null;
        if (!draftId) {
            return (0, apiResponse_1.sendError)(res, 'Invalid draft id', { code: 'INVALID_DRAFT_ID' }, 400);
        }
        const userId = req.authUser.id;
        const updatedDraft = await (0, draftService_1.updateDraft)(draftId, userId, req.body);
        return (0, apiResponse_1.sendSuccess)(res, updatedDraft, 'Draft updated successfully');
    }
    catch (error) {
        const message = error instanceof Error && error.message === 'Draft not found'
            ? 'Draft not found'
            : 'Failed to update draft';
        const code = error instanceof Error && error.message === 'Draft not found'
            ? 'DRAFT_NOT_FOUND'
            : 'UPDATE_DRAFT_FAILED';
        const statusCode = error instanceof Error && error.message === 'Draft not found' ? 404 : 500;
        return (0, apiResponse_1.sendErrorNormalized)(res, error, {
            message,
            code,
            status: statusCode,
        });
    }
}
async function deleteDraftHandler(req, res) {
    try {
        const idParam = (0, paramString_1.getParamAsString)(req.params.id);
        const draftId = idParam ? parseId(idParam) : null;
        if (!draftId) {
            return (0, apiResponse_1.sendError)(res, 'Invalid draft id', { code: 'INVALID_DRAFT_ID' }, 400);
        }
        const userId = req.authUser.id;
        const deletedDraft = await (0, draftService_1.deleteDraft)(draftId, userId);
        return (0, apiResponse_1.sendSuccess)(res, deletedDraft, 'Draft deleted successfully');
    }
    catch (error) {
        const isDraftNotFound = error instanceof Error && error.message === 'Draft not found';
        return (0, apiResponse_1.sendErrorNormalized)(res, error, {
            message: isDraftNotFound ? 'Draft not found' : 'Failed to delete draft',
            code: isDraftNotFound ? 'DRAFT_NOT_FOUND' : 'DELETE_DRAFT_FAILED',
            status: isDraftNotFound ? 404 : 500,
        });
    }
}
async function getDraftCategoriesHandler(req, res) {
    try {
        const idParam = (0, paramString_1.getParamAsString)(req.params.id);
        const draftId = idParam ? parseId(idParam) : null;
        if (!draftId) {
            return (0, apiResponse_1.sendError)(res, 'Invalid draft id', { code: 'INVALID_DRAFT_ID' }, 400);
        }
        const userId = req.authUser.id;
        const categories = await (0, draftService_1.getDraftCategories)(draftId, userId);
        return (0, apiResponse_1.sendSuccess)(res, categories, 'Draft categories fetched successfully');
    }
    catch (error) {
        const message = error instanceof Error && error.message === 'Draft not found'
            ? 'Draft not found'
            : 'Failed to fetch draft categories';
        const code = error instanceof Error && error.message === 'Draft not found'
            ? 'DRAFT_NOT_FOUND'
            : 'FETCH_DRAFT_CATEGORIES_FAILED';
        const statusCode = error instanceof Error && error.message === 'Draft not found' ? 404 : 500;
        return (0, apiResponse_1.sendErrorNormalized)(res, error, {
            message,
            code,
            status: statusCode,
        });
    }
}
async function updateDraftCategoriesHandler(req, res) {
    try {
        const idParam = (0, paramString_1.getParamAsString)(req.params.id);
        const draftId = idParam ? parseId(idParam) : null;
        if (!draftId) {
            return (0, apiResponse_1.sendError)(res, 'Invalid draft id', { code: 'INVALID_DRAFT_ID' }, 400);
        }
        const userId = req.authUser.id;
        const { siteId, categoryIds } = req.body;
        if (!Array.isArray(categoryIds)) {
            return (0, apiResponse_1.sendError)(res, 'categoryIds must be an array', { code: 'VALIDATION_ERROR' }, 400);
        }
        const updatedDraft = await (0, draftService_1.replaceDraftCategories)(draftId, userId, {
            siteId: siteId ?? null,
            categoryIds,
        });
        return (0, apiResponse_1.sendSuccess)(res, updatedDraft, 'Draft categories updated successfully');
    }
    catch (error) {
        const message = error instanceof Error &&
            (error.message === 'Draft not found' ||
                error.message === 'Target site not found')
            ? error.message
            : 'Failed to update draft categories';
        const code = error instanceof Error && error.message === 'Draft not found'
            ? 'DRAFT_NOT_FOUND'
            : error instanceof Error && error.message === 'Target site not found'
                ? 'SITE_NOT_FOUND'
                : error instanceof Error && error.message === 'No target site selected'
                    ? 'SITE_REQUIRED'
                    : 'UPDATE_DRAFT_CATEGORIES_FAILED';
        const statusCode = error instanceof Error &&
            (error.message === 'Draft not found' || error.message === 'Target site not found')
            ? 404
            : error instanceof Error && error.message === 'No target site selected'
                ? 400
                : 500;
        return (0, apiResponse_1.sendErrorNormalized)(res, error, {
            message,
            code,
            status: statusCode,
        });
    }
}
async function getDraftTagsHandler(req, res) {
    try {
        const idParam = (0, paramString_1.getParamAsString)(req.params.id);
        const draftId = idParam ? parseId(idParam) : null;
        if (!draftId) {
            return (0, apiResponse_1.sendError)(res, 'Invalid draft id', { code: 'INVALID_DRAFT_ID' }, 400);
        }
        const userId = req.authUser.id;
        const tags = await (0, draftService_1.getDraftTags)(draftId, userId);
        return (0, apiResponse_1.sendSuccess)(res, tags, 'Draft tags fetched successfully');
    }
    catch (error) {
        const message = error instanceof Error && error.message === 'Draft not found'
            ? 'Draft not found'
            : 'Failed to fetch draft tags';
        const code = error instanceof Error && error.message === 'Draft not found'
            ? 'DRAFT_NOT_FOUND'
            : 'FETCH_DRAFT_TAGS_FAILED';
        const statusCode = error instanceof Error && error.message === 'Draft not found' ? 404 : 500;
        return (0, apiResponse_1.sendErrorNormalized)(res, error, {
            message,
            code,
            status: statusCode,
        });
    }
}
async function updateDraftTagsHandler(req, res) {
    try {
        const idParam = (0, paramString_1.getParamAsString)(req.params.id);
        const draftId = idParam ? parseId(idParam) : null;
        if (!draftId) {
            return (0, apiResponse_1.sendError)(res, 'Invalid draft id', { code: 'INVALID_DRAFT_ID' }, 400);
        }
        const userId = req.authUser.id;
        const { siteId, tagIds } = req.body;
        if (!Array.isArray(tagIds)) {
            return (0, apiResponse_1.sendError)(res, 'tagIds must be an array', { code: 'VALIDATION_ERROR' }, 400);
        }
        const updatedDraft = await (0, draftService_1.replaceDraftTags)(draftId, userId, {
            siteId: siteId ?? null,
            tagIds,
        });
        return (0, apiResponse_1.sendSuccess)(res, updatedDraft, 'Draft tags updated successfully');
    }
    catch (error) {
        const message = error instanceof Error &&
            (error.message === 'Draft not found' ||
                error.message === 'Target site not found')
            ? error.message
            : 'Failed to update draft tags';
        const code = error instanceof Error && error.message === 'Draft not found'
            ? 'DRAFT_NOT_FOUND'
            : error instanceof Error && error.message === 'Target site not found'
                ? 'SITE_NOT_FOUND'
                : error instanceof Error && error.message === 'No target site selected'
                    ? 'SITE_REQUIRED'
                    : 'UPDATE_DRAFT_TAGS_FAILED';
        const statusCode = error instanceof Error &&
            (error.message === 'Draft not found' || error.message === 'Target site not found')
            ? 404
            : error instanceof Error && error.message === 'No target site selected'
                ? 400
                : 500;
        return (0, apiResponse_1.sendErrorNormalized)(res, error, {
            message,
            code,
            status: statusCode,
        });
    }
}
async function updateDraftSeoHandler(req, res) {
    try {
        const idParam = (0, paramString_1.getParamAsString)(req.params.id);
        const draftId = idParam ? parseId(idParam) : null;
        if (!draftId) {
            return (0, apiResponse_1.sendError)(res, 'Invalid draft id', { code: 'INVALID_DRAFT_ID' }, 400);
        }
        const userId = req.authUser.id;
        const { seoTitle, metaDescription, canonicalUrl, focusKeyword, ogTitle, ogDescription, ogImageUrl, } = req.body;
        const seoMeta = await (0, draftService_1.upsertDraftSeoMeta)(draftId, userId, {
            seoTitle,
            metaDescription,
            canonicalUrl,
            focusKeyword,
            ogTitle,
            ogDescription,
            ogImageUrl,
        });
        return (0, apiResponse_1.sendSuccess)(res, seoMeta, 'Draft SEO metadata updated successfully');
    }
    catch (error) {
        const message = error instanceof Error && error.message === 'Draft not found'
            ? 'Draft not found'
            : 'Failed to update draft SEO metadata';
        const code = error instanceof Error && error.message === 'Draft not found'
            ? 'DRAFT_NOT_FOUND'
            : 'UPDATE_DRAFT_SEO_FAILED';
        const statusCode = error instanceof Error && error.message === 'Draft not found' ? 404 : 500;
        return (0, apiResponse_1.sendErrorNormalized)(res, error, {
            message,
            code,
            status: statusCode,
        });
    }
}
async function getDraftSeoHandler(req, res) {
    try {
        const idParam = (0, paramString_1.getParamAsString)(req.params.id);
        const draftId = idParam ? (0, positiveInt_1.parsePositiveInt)(idParam) : null;
        if (!draftId) {
            return (0, apiResponse_1.sendError)(res, 'Invalid draft id', { code: 'INVALID_DRAFT_ID' }, 400);
        }
        const userId = req.authUser.id;
        const seoMeta = await (0, draftService_1.getDraftSeoMeta)(draftId, userId);
        return (0, apiResponse_1.sendSuccess)(res, seoMeta, 'Draft SEO fetched successfully');
    }
    catch (error) {
        const message = error instanceof Error && error.message === 'Draft not found'
            ? 'Draft not found'
            : 'Failed to fetch draft SEO';
        const code = error instanceof Error && error.message === 'Draft not found'
            ? 'DRAFT_NOT_FOUND'
            : 'FETCH_DRAFT_SEO_FAILED';
        const statusCode = error instanceof Error && error.message === 'Draft not found'
            ? 404
            : 500;
        return (0, apiResponse_1.sendErrorNormalized)(res, error, {
            message,
            code,
            status: statusCode,
        });
    }
}
