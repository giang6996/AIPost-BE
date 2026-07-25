"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listSites = listSites;
exports.createSiteHandler = createSiteHandler;
exports.testConnectionHandler = testConnectionHandler;
exports.updateSiteHandler = updateSiteHandler;
exports.deleteSiteHandler = deleteSiteHandler;
exports.listSiteCategoriesHandler = listSiteCategoriesHandler;
exports.listSiteTagsHandler = listSiteTagsHandler;
exports.createSiteCategoryHandler = createSiteCategoryHandler;
exports.updateSiteCategoryHandler = updateSiteCategoryHandler;
exports.createSiteTagHandler = createSiteTagHandler;
exports.updateSiteTagHandler = updateSiteTagHandler;
const apiResponse_1 = require("../utils/apiResponse");
const paramString_1 = require("../utils/paramString");
const positiveInt_1 = require("../utils/positiveInt");
const siteService_1 = require("../services/siteService");
function isValidUrl(value) {
    try {
        new URL(value);
        return true;
    }
    catch {
        return false;
    }
}
function normalizeOptionalString(value) {
    if (typeof value !== 'string') {
        return undefined;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
}
async function listSites(req, res) {
    try {
        const userId = req.authUser.id;
        const sites = await (0, siteService_1.getAllSites)(userId);
        return (0, apiResponse_1.sendSuccess)(res, sites, 'Sites fetched successfully');
    }
    catch (error) {
        return (0, apiResponse_1.sendErrorNormalized)(res, error, {
            message: 'Failed to fetch sites',
            code: 'FETCH_SITES_FAILED',
            status: 500,
        });
    }
}
async function createSiteHandler(req, res) {
    try {
        const userId = req.authUser.id;
        const siteName = normalizeOptionalString(req.body.siteName);
        const siteUrl = normalizeOptionalString(req.body.siteUrl);
        const wpUsername = normalizeOptionalString(req.body.wpUsername);
        const wpApplicationPassword = normalizeOptionalString(req.body.wpApplicationPassword);
        const snippetEnabled = typeof req.body.snippetEnabled === 'boolean'
            ? req.body.snippetEnabled
            : false;
        if (!siteName || !siteUrl || !wpUsername || !wpApplicationPassword) {
            return (0, apiResponse_1.sendError)(res, 'Missing required fields', {
                code: 'VALIDATION_ERROR',
                details: 'siteName, siteUrl, wpUsername, wpApplicationPassword are required',
            }, 400);
        }
        if (!isValidUrl(siteUrl)) {
            return (0, apiResponse_1.sendError)(res, 'Invalid site URL', { code: 'INVALID_SITE_URL' }, 400);
        }
        const site = await (0, siteService_1.createSite)({
            userId,
            siteName,
            siteUrl,
            wpUsername,
            wpApplicationPassword,
            snippetEnabled,
        });
        return (0, apiResponse_1.sendSuccess)(res, site, 'Site created successfully', 201);
    }
    catch (error) {
        return (0, apiResponse_1.sendErrorNormalized)(res, error, {
            message: 'Failed to create site',
            code: 'CREATE_SITE_FAILED',
            status: 500,
        });
    }
}
async function testConnectionHandler(req, res) {
    try {
        const { siteUrl, wpUsername, wpApplicationPassword } = req.body;
        if (!siteUrl || !wpUsername || !wpApplicationPassword) {
            return (0, apiResponse_1.sendError)(res, 'Missing required fields', { code: 'VALIDATION_ERROR', details: 'siteUrl, wpUsername, wpApplicationPassword are required' }, 400);
        }
        if (!isValidUrl(siteUrl)) {
            return (0, apiResponse_1.sendError)(res, 'Invalid site URL', { code: 'INVALID_SITE_URL' }, 400);
        }
        const result = await (0, siteService_1.testSiteConnectionOnly)({
            siteUrl,
            wpUsername,
            wpApplicationPassword,
        });
        if (!result.success) {
            return (0, apiResponse_1.sendError)(res, result.message, { code: 'WP_CONNECTION_FAILED' }, 401);
        }
        return (0, apiResponse_1.sendSuccess)(res, result, 'WordPress connection successful');
    }
    catch (error) {
        return (0, apiResponse_1.sendErrorNormalized)(res, error, {
            message: 'Failed to test WordPress connection',
            code: 'TEST_CONNECTION_FAILED',
            status: 500,
        });
    }
}
async function updateSiteHandler(req, res) {
    try {
        const idParam = (0, paramString_1.getParamAsString)(req.params.id);
        const siteId = idParam ? (0, positiveInt_1.parsePositiveInt)(idParam) : null;
        if (!siteId) {
            return (0, apiResponse_1.sendError)(res, 'Invalid site id', { code: 'INVALID_SITE_ID' }, 400);
        }
        const siteName = normalizeOptionalString(req.body.siteName);
        const siteUrl = normalizeOptionalString(req.body.siteUrl);
        const wpUsername = normalizeOptionalString(req.body.wpUsername);
        const wpApplicationPassword = normalizeOptionalString(req.body.wpApplicationPassword);
        const snippetEnabled = typeof req.body.snippetEnabled === 'boolean'
            ? req.body.snippetEnabled
            : undefined;
        if (siteName === undefined &&
            siteUrl === undefined &&
            wpUsername === undefined &&
            wpApplicationPassword === undefined &&
            snippetEnabled === undefined) {
            return (0, apiResponse_1.sendError)(res, 'At least one field is required', {
                code: 'VALIDATION_ERROR',
                details: 'Provide at least one of: siteName, siteUrl, wpUsername, wpApplicationPassword, snippetEnabled',
            }, 400);
        }
        const userId = req.authUser.id;
        const updatedSite = await (0, siteService_1.updateSite)(siteId, userId, {
            siteName,
            siteUrl,
            wpUsername,
            wpApplicationPassword,
            snippetEnabled,
        });
        return (0, apiResponse_1.sendSuccess)(res, updatedSite, 'Site updated successfully');
    }
    catch (error) {
        const isSiteNotFound = error instanceof Error && error.message === 'Site not found';
        return (0, apiResponse_1.sendErrorNormalized)(res, error, {
            message: isSiteNotFound ? 'Site not found' : 'Failed to update site',
            code: isSiteNotFound ? 'SITE_NOT_FOUND' : 'UPDATE_SITE_FAILED',
            status: isSiteNotFound ? 404 : 500,
        });
    }
}
async function deleteSiteHandler(req, res) {
    try {
        const idParam = (0, paramString_1.getParamAsString)(req.params.id);
        const siteId = idParam ? (0, positiveInt_1.parsePositiveInt)(idParam) : null;
        if (!siteId) {
            return (0, apiResponse_1.sendError)(res, 'Invalid site id', { code: 'INVALID_SITE_ID' }, 400);
        }
        const userId = req.authUser.id;
        const deletedSite = await (0, siteService_1.deleteSite)(siteId, userId);
        return (0, apiResponse_1.sendSuccess)(res, deletedSite, 'Site deleted successfully');
    }
    catch (error) {
        const isSiteNotFound = error instanceof Error && error.message === 'Site not found';
        return (0, apiResponse_1.sendErrorNormalized)(res, error, {
            message: isSiteNotFound ? 'Site not found' : 'Failed to delete site',
            code: isSiteNotFound ? 'SITE_NOT_FOUND' : 'DELETE_SITE_FAILED',
            status: isSiteNotFound ? 404 : 500,
        });
    }
}
async function listSiteCategoriesHandler(req, res) {
    try {
        const idParam = (0, paramString_1.getParamAsString)(req.params.id);
        const siteId = idParam ? (0, positiveInt_1.parsePositiveInt)(idParam) : null;
        if (!siteId) {
            return (0, apiResponse_1.sendError)(res, 'Invalid site id', { code: 'INVALID_SITE_ID' }, 400);
        }
        const userId = req.authUser.id;
        const categories = await (0, siteService_1.getSiteCategories)(siteId, userId);
        return (0, apiResponse_1.sendSuccess)(res, categories, 'Site categories fetched successfully');
    }
    catch (error) {
        const message = error instanceof Error && error.message === 'Site not found'
            ? 'Site not found'
            : 'Failed to fetch site categories';
        const code = error instanceof Error && error.message === 'Site not found'
            ? 'SITE_NOT_FOUND'
            : 'FETCH_SITE_CATEGORIES_FAILED';
        const statusCode = error instanceof Error && error.message === 'Site not found' ? 404 : 500;
        return (0, apiResponse_1.sendErrorNormalized)(res, error, {
            message,
            code,
            status: statusCode,
        });
    }
}
async function listSiteTagsHandler(req, res) {
    try {
        const idParam = (0, paramString_1.getParamAsString)(req.params.id);
        const siteId = idParam ? (0, positiveInt_1.parsePositiveInt)(idParam) : null;
        if (!siteId) {
            return (0, apiResponse_1.sendError)(res, 'Invalid site id', { code: 'INVALID_SITE_ID' }, 400);
        }
        const userId = req.authUser.id;
        const tags = await (0, siteService_1.getSiteTags)(siteId, userId);
        return (0, apiResponse_1.sendSuccess)(res, tags, 'Site tags fetched successfully');
    }
    catch (error) {
        const message = error instanceof Error && error.message === 'Site not found'
            ? 'Site not found'
            : 'Failed to fetch site tags';
        const code = error instanceof Error && error.message === 'Site not found'
            ? 'SITE_NOT_FOUND'
            : 'FETCH_SITE_TAGS_FAILED';
        const statusCode = error instanceof Error && error.message === 'Site not found' ? 404 : 500;
        return (0, apiResponse_1.sendErrorNormalized)(res, error, {
            message,
            code,
            status: statusCode,
        });
    }
}
async function createSiteCategoryHandler(req, res) {
    try {
        const idParam = (0, paramString_1.getParamAsString)(req.params.id);
        const siteId = idParam ? (0, positiveInt_1.parsePositiveInt)(idParam) : null;
        if (!siteId) {
            return (0, apiResponse_1.sendError)(res, 'Invalid site id', { code: 'INVALID_SITE_ID' }, 400);
        }
        const name = normalizeOptionalString(req.body.name);
        const slug = normalizeOptionalString(req.body.slug);
        const description = normalizeOptionalString(req.body.description);
        if (!name) {
            return (0, apiResponse_1.sendError)(res, 'Category name is required', { code: 'VALIDATION_ERROR', details: 'name is required' }, 400);
        }
        const userId = req.authUser.id;
        const category = await (0, siteService_1.createSiteCategory)(siteId, userId, {
            name,
            slug,
            description,
        });
        return (0, apiResponse_1.sendSuccess)(res, category, 'Category created successfully');
    }
    catch (error) {
        const isSiteNotFound = error instanceof Error && error.message === 'Site not found';
        return (0, apiResponse_1.sendErrorNormalized)(res, error, {
            message: isSiteNotFound ? 'Site not found' : 'Failed to create category',
            code: isSiteNotFound ? 'SITE_NOT_FOUND' : 'CREATE_CATEGORY_FAILED',
            status: isSiteNotFound ? 404 : 500,
        });
    }
}
async function updateSiteCategoryHandler(req, res) {
    try {
        const idParam = (0, paramString_1.getParamAsString)(req.params.id);
        const categoryIdParam = (0, paramString_1.getParamAsString)(req.params.categoryId);
        const siteId = idParam ? (0, positiveInt_1.parsePositiveInt)(idParam) : null;
        const categoryId = categoryIdParam ? (0, positiveInt_1.parsePositiveInt)(categoryIdParam) : null;
        if (!siteId) {
            return (0, apiResponse_1.sendError)(res, 'Invalid site id', { code: 'INVALID_SITE_ID' }, 400);
        }
        if (!categoryId) {
            return (0, apiResponse_1.sendError)(res, 'Invalid category id', { code: 'INVALID_CATEGORY_ID' }, 400);
        }
        const name = normalizeOptionalString(req.body.name);
        const slug = normalizeOptionalString(req.body.slug);
        const description = normalizeOptionalString(req.body.description);
        if (!name && !slug && !description) {
            return (0, apiResponse_1.sendError)(res, 'At least one field is required', {
                code: 'VALIDATION_ERROR',
                details: 'Provide at least one of: name, slug, description',
            }, 400);
        }
        const userId = req.authUser.id;
        const category = await (0, siteService_1.updateSiteCategory)(siteId, categoryId, userId, {
            name,
            slug,
            description,
        });
        return (0, apiResponse_1.sendSuccess)(res, category, 'Category updated successfully');
    }
    catch (error) {
        const isSiteNotFound = error instanceof Error && error.message === 'Site not found';
        return (0, apiResponse_1.sendErrorNormalized)(res, error, {
            message: isSiteNotFound ? 'Site not found' : 'Failed to update category',
            code: isSiteNotFound ? 'SITE_NOT_FOUND' : 'UPDATE_CATEGORY_FAILED',
            status: isSiteNotFound ? 404 : 500,
        });
    }
}
async function createSiteTagHandler(req, res) {
    try {
        const idParam = (0, paramString_1.getParamAsString)(req.params.id);
        const siteId = idParam ? (0, positiveInt_1.parsePositiveInt)(idParam) : null;
        if (!siteId) {
            return (0, apiResponse_1.sendError)(res, 'Invalid site id', { code: 'INVALID_SITE_ID' }, 400);
        }
        const name = normalizeOptionalString(req.body.name);
        const slug = normalizeOptionalString(req.body.slug);
        const description = normalizeOptionalString(req.body.description);
        if (!name) {
            return (0, apiResponse_1.sendError)(res, 'Tag name is required', { code: 'VALIDATION_ERROR', details: 'name is required' }, 400);
        }
        const userId = req.authUser.id;
        const tag = await (0, siteService_1.createSiteTag)(siteId, userId, {
            name,
            slug,
            description,
        });
        return (0, apiResponse_1.sendSuccess)(res, tag, 'Tag created successfully');
    }
    catch (error) {
        const isSiteNotFound = error instanceof Error && error.message === 'Site not found';
        return (0, apiResponse_1.sendErrorNormalized)(res, error, {
            message: isSiteNotFound ? 'Site not found' : 'Failed to create tag',
            code: isSiteNotFound ? 'SITE_NOT_FOUND' : 'CREATE_TAG_FAILED',
            status: isSiteNotFound ? 404 : 500,
        });
    }
}
async function updateSiteTagHandler(req, res) {
    try {
        const idParam = (0, paramString_1.getParamAsString)(req.params.id);
        const tagIdParam = (0, paramString_1.getParamAsString)(req.params.tagId);
        const siteId = idParam ? (0, positiveInt_1.parsePositiveInt)(idParam) : null;
        const tagId = tagIdParam ? (0, positiveInt_1.parsePositiveInt)(tagIdParam) : null;
        if (!siteId) {
            return (0, apiResponse_1.sendError)(res, 'Invalid site id', { code: 'INVALID_SITE_ID' }, 400);
        }
        if (!tagId) {
            return (0, apiResponse_1.sendError)(res, 'Invalid tag id', { code: 'INVALID_TAG_ID' }, 400);
        }
        const name = normalizeOptionalString(req.body.name);
        const slug = normalizeOptionalString(req.body.slug);
        const description = normalizeOptionalString(req.body.description);
        if (!name && !slug && !description) {
            return (0, apiResponse_1.sendError)(res, 'At least one field is required', {
                code: 'VALIDATION_ERROR',
                details: 'Provide at least one of: name, slug, description',
            }, 400);
        }
        const userId = req.authUser.id;
        const tag = await (0, siteService_1.updateSiteTag)(siteId, tagId, userId, {
            name,
            slug,
            description,
        });
        return (0, apiResponse_1.sendSuccess)(res, tag, 'Tag updated successfully');
    }
    catch (error) {
        const isSiteNotFound = error instanceof Error && error.message === 'Site not found';
        return (0, apiResponse_1.sendErrorNormalized)(res, error, {
            message: isSiteNotFound ? 'Site not found' : 'Failed to update tag',
            code: isSiteNotFound ? 'SITE_NOT_FOUND' : 'UPDATE_TAG_FAILED',
            status: isSiteNotFound ? 404 : 500,
        });
    }
}
