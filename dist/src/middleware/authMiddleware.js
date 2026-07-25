"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
const authService_1 = require("../services/authService");
const apiResponse_1 = require("../utils/apiResponse");
function getBearerToken(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return null;
    }
    const [scheme, token] = authHeader.split(' ');
    if (scheme !== 'Bearer' || !token) {
        return null;
    }
    return token.trim();
}
async function authMiddleware(req, res, next) {
    try {
        const token = getBearerToken(req);
        if (!token) {
            return (0, apiResponse_1.sendError)(res, 'Unauthorized', { code: 'UNAUTHORIZED', details: 'Missing bearer token' }, 401);
        }
        const result = await (0, authService_1.getCurrentUserFromToken)(token);
        req.authUser = result.user;
        req.authSessionId = result.sessionId;
        return next();
    }
    catch (error) {
        return (0, apiResponse_1.sendError)(res, 'Unauthorized', {
            code: 'UNAUTHORIZED',
            details: error instanceof Error ? error.message : error,
        }, 401);
    }
}
