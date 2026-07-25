"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerHandler = registerHandler;
exports.loginHandler = loginHandler;
exports.meHandler = meHandler;
exports.updateProfileHandler = updateProfileHandler;
exports.changePasswordHandler = changePasswordHandler;
exports.logoutHandler = logoutHandler;
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
async function registerHandler(req, res) {
    try {
        const email = typeof req.body.email === 'string' ? req.body.email.trim() : '';
        const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
        const password = typeof req.body.password === 'string' ? req.body.password : '';
        if (!email || !name || !password) {
            return (0, apiResponse_1.sendError)(res, 'Email, name, and password are required', {
                code: 'VALIDATION_ERROR',
                details: 'email, name, and password are required',
            }, 400);
        }
        const user = await (0, authService_1.registerUser)({
            email,
            name,
            password,
        });
        return (0, apiResponse_1.sendSuccess)(res, user, 'Registration successful', 201);
    }
    catch (error) {
        const message = error instanceof Error &&
            (error.message === 'Email is required' ||
                error.message === 'Name is required' ||
                error.message === 'Password is required' ||
                error.message === 'Password must be at least 8 characters' ||
                error.message === 'Email already in use' ||
                error.message === 'Editor role not found')
            ? error.message
            : 'Failed to register user';
        const code = error instanceof Error && error.message === 'Email already in use'
            ? 'EMAIL_ALREADY_EXISTS'
            : error instanceof Error &&
                (error.message === 'Email is required' ||
                    error.message === 'Name is required' ||
                    error.message === 'Password is required' ||
                    error.message === 'Password must be at least 8 characters')
                ? 'VALIDATION_ERROR'
                : error instanceof Error && error.message === 'Editor role not found'
                    ? 'ROLE_NOT_FOUND'
                    : 'REGISTER_FAILED';
        const statusCode = error instanceof Error && error.message === 'Email already in use'
            ? 409
            : error instanceof Error &&
                (error.message === 'Email is required' ||
                    error.message === 'Name is required' ||
                    error.message === 'Password is required' ||
                    error.message === 'Password must be at least 8 characters' ||
                    error.message === 'Editor role not found')
                ? 400
                : 500;
        return (0, apiResponse_1.sendErrorNormalized)(res, error, {
            message,
            code,
            status: statusCode,
        });
    }
}
async function loginHandler(req, res) {
    try {
        const email = typeof req.body.email === 'string' ? req.body.email.trim() : '';
        const password = typeof req.body.password === 'string' ? req.body.password : '';
        if (!email || !password) {
            return (0, apiResponse_1.sendError)(res, 'Email and password are required', {
                code: 'VALIDATION_ERROR',
                details: 'email and password are required',
            }, 400);
        }
        const result = await (0, authService_1.loginUser)({
            email,
            password,
        });
        return (0, apiResponse_1.sendSuccess)(res, result, 'Login successful');
    }
    catch (error) {
        const message = error instanceof Error &&
            (error.message === 'Email is required' ||
                error.message === 'Password is required' ||
                error.message === 'Invalid email or password' ||
                error.message === 'User account is not active')
            ? error.message
            : 'Failed to login';
        const code = error instanceof Error &&
            (error.message === 'Email is required' ||
                error.message === 'Password is required')
            ? 'VALIDATION_ERROR'
            : error instanceof Error && error.message === 'User account is not active'
                ? 'USER_INACTIVE'
                : 'LOGIN_FAILED';
        const statusCode = error instanceof Error &&
            (error.message === 'Email is required' ||
                error.message === 'Password is required')
            ? 400
            : error instanceof Error &&
                (error.message === 'Invalid email or password' ||
                    error.message === 'User account is not active')
                ? 401
                : 500;
        return (0, apiResponse_1.sendErrorNormalized)(res, error, {
            message,
            code,
            status: statusCode,
        });
    }
}
async function meHandler(req, res) {
    try {
        return (0, apiResponse_1.sendSuccess)(res, req.authUser, 'Current user fetched successfully');
    }
    catch (error) {
        return (0, apiResponse_1.sendErrorNormalized)(res, error, {
            message: 'Unauthorized',
            code: 'UNAUTHORIZED',
            status: 401,
        });
    }
}
async function updateProfileHandler(req, res) {
    try {
        const userId = req.authUser.id;
        const name = typeof req.body.name === 'string' ? req.body.name.trim() : undefined;
        const email = typeof req.body.email === 'string' ? req.body.email.trim() : undefined;
        if ((name === undefined || name.length === 0) &&
            (email === undefined || email.length === 0)) {
            return (0, apiResponse_1.sendError)(res, 'At least one field is required', {
                code: 'VALIDATION_ERROR',
                details: 'Provide at least one of: name, email',
            }, 400);
        }
        const result = await (0, authService_1.updateProfile)({
            userId,
            name,
            email,
        });
        return (0, apiResponse_1.sendSuccess)(res, result, 'Profile updated successfully');
    }
    catch (error) {
        const message = error instanceof Error &&
            (error.message === 'User not found' ||
                error.message === 'At least one field is required' ||
                error.message === 'Email already in use')
            ? error.message
            : 'Failed to update profile';
        const code = error instanceof Error && error.message === 'User not found'
            ? 'USER_NOT_FOUND'
            : error instanceof Error && error.message === 'Email already in use'
                ? 'EMAIL_ALREADY_EXISTS'
                : error instanceof Error && error.message === 'At least one field is required'
                    ? 'VALIDATION_ERROR'
                    : 'UPDATE_PROFILE_FAILED';
        const statusCode = error instanceof Error && error.message === 'User not found'
            ? 404
            : error instanceof Error &&
                (error.message === 'At least one field is required' ||
                    error.message === 'Email already in use')
                ? 400
                : 500;
        return (0, apiResponse_1.sendErrorNormalized)(res, error, {
            message,
            code,
            status: statusCode,
        });
    }
}
async function changePasswordHandler(req, res) {
    try {
        const userId = req.authUser.id;
        const currentPassword = typeof req.body.currentPassword === 'string'
            ? req.body.currentPassword
            : '';
        const newPassword = typeof req.body.newPassword === 'string'
            ? req.body.newPassword
            : '';
        if (!currentPassword || !newPassword) {
            return (0, apiResponse_1.sendError)(res, 'Current password and new password are required', {
                code: 'VALIDATION_ERROR',
                details: 'currentPassword and newPassword are required',
            }, 400);
        }
        const result = await (0, authService_1.changePassword)({
            userId,
            currentPassword,
            newPassword,
        });
        return (0, apiResponse_1.sendSuccess)(res, result, 'Password changed successfully');
    }
    catch (error) {
        const message = error instanceof Error &&
            (error.message === 'User not found' ||
                error.message === 'User credential not found' ||
                error.message === 'Current password is required' ||
                error.message === 'New password is required' ||
                error.message === 'New password must be at least 8 characters' ||
                error.message === 'Current password is incorrect')
            ? error.message
            : 'Failed to change password';
        const code = error instanceof Error && error.message === 'User not found'
            ? 'USER_NOT_FOUND'
            : error instanceof Error && error.message === 'User credential not found'
                ? 'USER_CREDENTIAL_NOT_FOUND'
                : error instanceof Error &&
                    (error.message === 'Current password is required' ||
                        error.message === 'New password is required' ||
                        error.message === 'New password must be at least 8 characters')
                    ? 'VALIDATION_ERROR'
                    : error instanceof Error && error.message === 'Current password is incorrect'
                        ? 'INVALID_CURRENT_PASSWORD'
                        : 'CHANGE_PASSWORD_FAILED';
        const statusCode = error instanceof Error && error.message === 'User not found'
            ? 404
            : error instanceof Error &&
                (error.message === 'User credential not found' ||
                    error.message === 'Current password is required' ||
                    error.message === 'New password is required' ||
                    error.message === 'New password must be at least 8 characters' ||
                    error.message === 'Current password is incorrect')
                ? 400
                : 500;
        return (0, apiResponse_1.sendErrorNormalized)(res, error, {
            message,
            code,
            status: statusCode,
        });
    }
}
async function logoutHandler(req, res) {
    try {
        const token = getBearerToken(req);
        if (!token) {
            return (0, apiResponse_1.sendError)(res, 'Authorization token is required', { code: 'UNAUTHORIZED', details: 'Missing bearer token' }, 401);
        }
        const result = await (0, authService_1.logoutUser)(token);
        return (0, apiResponse_1.sendSuccess)(res, result, 'Logout successful');
    }
    catch (error) {
        const isNotFound = error instanceof Error && error.message === 'Session not found';
        return (0, apiResponse_1.sendErrorNormalized)(res, error, {
            message: isNotFound ? 'Session not found' : 'Failed to logout',
            code: isNotFound ? 'SESSION_NOT_FOUND' : 'LOGOUT_FAILED',
            status: isNotFound ? 404 : 500,
        });
    }
}
