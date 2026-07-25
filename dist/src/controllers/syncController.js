"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.publishDraftHandler = publishDraftHandler;
exports.deleteDraftSyncHandler = deleteDraftSyncHandler;
const apiResponse_1 = require("../utils/apiResponse");
const paramString_1 = require("../utils/paramString");
const positiveInt_1 = require("../utils/positiveInt");
const syncService_1 = require("../services/syncService");
function parseId(value) {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}
async function publishDraftHandler(req, res) {
    try {
        const idParam = (0, paramString_1.getParamAsString)(req.params.id);
        const draftId = idParam ? parseId(idParam) : null;
        if (!draftId) {
            return (0, apiResponse_1.sendError)(res, 'Invalid draft id', { code: 'INVALID_DRAFT_ID' }, 400);
        }
        const userId = req.authUser.id;
        const { siteId, status } = req.body;
        const result = await (0, syncService_1.publishDraft)({
            draftId,
            userId: userId,
            siteId,
            wpStatus: status === 'publish' ? 'publish' : 'draft',
        });
        return (0, apiResponse_1.sendSuccess)(res, result, 'Draft published successfully');
    }
    catch (error) {
        return (0, apiResponse_1.sendErrorNormalized)(res, error, {
            message: 'Failed to publish draft',
            code: 'PUBLISH_DRAFT_FAILED',
            status: 500,
        });
    }
}
async function deleteDraftSyncHandler(req, res) {
    try {
        const draftIdParam = (0, paramString_1.getParamAsString)(req.params.id);
        const siteIdParam = (0, paramString_1.getParamAsString)(req.params.siteId);
        const draftId = draftIdParam ? parseId(draftIdParam) : null;
        const siteId = siteIdParam ? (0, positiveInt_1.parsePositiveInt)(siteIdParam) : null;
        if (!draftId) {
            return (0, apiResponse_1.sendError)(res, 'Invalid draft id', { code: 'INVALID_DRAFT_ID' }, 400);
        }
        if (!siteId) {
            return (0, apiResponse_1.sendError)(res, 'Invalid site id', { code: 'INVALID_SITE_ID' }, 400);
        }
        const syncRemote = req.query.syncRemote === 'true';
        const force = req.query.force === 'true';
        if (!syncRemote) {
            return (0, apiResponse_1.sendError)(res, 'syncRemote=true is required', { code: 'SYNC_REMOTE_REQUIRED' }, 400);
        }
        const userId = req.authUser.id;
        const result = await (0, syncService_1.deleteDraftSync)({
            draftId,
            siteId,
            userId: userId,
            force,
        });
        return (0, apiResponse_1.sendSuccess)(res, result, force
            ? 'Remote WordPress post deleted successfully'
            : 'Remote WordPress post moved to trash successfully');
    }
    catch (error) {
        const message = error instanceof Error &&
            (error.message === 'Draft not found' ||
                error.message === 'Target site not found' ||
                error.message === 'No synced post found for this draft and site' ||
                error.message === 'Synced post has no WordPress post id')
            ? error.message
            : 'Failed to delete remote WordPress post';
        const code = error instanceof Error && error.message === 'Draft not found'
            ? 'DRAFT_NOT_FOUND'
            : error instanceof Error && error.message === 'Target site not found'
                ? 'SITE_NOT_FOUND'
                : error instanceof Error && error.message === 'No synced post found for this draft and site'
                    ? 'SYNC_NOT_FOUND'
                    : error instanceof Error && error.message === 'Synced post has no WordPress post id'
                        ? 'INVALID_SYNC_STATE'
                        : 'DELETE_REMOTE_POST_FAILED';
        const statusCode = error instanceof Error &&
            (error.message === 'Draft not found' ||
                error.message === 'Target site not found' ||
                error.message === 'No synced post found for this draft and site')
            ? 404
            : error instanceof Error && error.message === 'Synced post has no WordPress post id'
                ? 400
                : 500;
        return (0, apiResponse_1.sendErrorNormalized)(res, error, {
            message,
            code,
            status: statusCode,
        });
    }
}
