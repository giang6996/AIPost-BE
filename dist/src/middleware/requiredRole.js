"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRole = requireRole;
const apiResponse_1 = require("../utils/apiResponse");
function requireRole(...allowedRoles) {
    return (req, res, next) => {
        if (!req.authUser) {
            return (0, apiResponse_1.sendError)(res, 'Unauthorized', { code: 'UNAUTHORIZED', details: 'Missing authenticated user' }, 401);
        }
        const currentRole = req.authUser.role.name;
        if (!allowedRoles.includes(currentRole)) {
            return (0, apiResponse_1.sendError)(res, 'Forbidden', {
                code: 'FORBIDDEN',
                details: `Allowed roles: ${allowedRoles.join(', ')}`,
            }, 403);
        }
        return next();
    };
}
