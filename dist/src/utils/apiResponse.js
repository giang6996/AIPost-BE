"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendSuccess = sendSuccess;
exports.sendError = sendError;
exports.sendErrorNormalized = sendErrorNormalized;
function sendSuccess(res, data = {}, message = 'Operation successful', statusCode = 200) {
    return res.status(statusCode).json({
        success: true,
        data,
        message,
    });
}
function sendError(res, message = 'Operation failed', error = { code: 'INTERNAL_ERROR' }, statusCode = 500) {
    return res.status(statusCode).json({
        success: false,
        error,
        message,
    });
}
function sendErrorNormalized(res, error, fallback, mapping) {
    const details = error instanceof Error ? error.message : error;
    const key = error instanceof Error ? error.message : null;
    const match = key && mapping ? mapping[key] : undefined;
    const message = match
        ? match.message ?? (error instanceof Error ? error.message : fallback.message)
        : fallback.message;
    const code = match?.code ?? fallback.code;
    const status = match?.status ?? fallback.status;
    return sendError(res, message, {
        code,
        details,
    }, status);
}
