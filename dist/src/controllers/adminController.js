"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminListUsersHandler = adminListUsersHandler;
exports.adminCreateUserHandler = adminCreateUserHandler;
exports.adminUpdateUserHandler = adminUpdateUserHandler;
exports.adminResetUserPasswordHandler = adminResetUserPasswordHandler;
exports.adminListDraftsHandler = adminListDraftsHandler;
exports.adminDeleteDraftHandler = adminDeleteDraftHandler;
exports.adminListSitesHandler = adminListSitesHandler;
exports.adminGetSiteHandler = adminGetSiteHandler;
exports.adminDeleteSiteHandler = adminDeleteSiteHandler;
exports.adminUpdateUserStatusHandler = adminUpdateUserStatusHandler;
exports.adminGetDraftHandler = adminGetDraftHandler;
const client_1 = require("@prisma/client");
const apiResponse_1 = require("../utils/apiResponse");
const paramString_1 = require("../utils/paramString");
const positiveInt_1 = require("../utils/positiveInt");
const adminService_1 = require("../services/adminService");
async function adminListUsersHandler(_req, res) {
    try {
        const users = await (0, adminService_1.adminListUsers)();
        return (0, apiResponse_1.sendSuccess)(res, users, 'Users fetched successfully');
    }
    catch (error) {
        return (0, apiResponse_1.sendErrorNormalized)(res, error, {
            message: 'Failed to fetch users',
            code: 'ADMIN_LIST_USERS_FAILED',
            status: 500,
        });
    }
}
async function adminCreateUserHandler(req, res) {
    try {
        const result = await (0, adminService_1.adminCreateUser)({
            name: typeof req.body.name === 'string' ? req.body.name : '',
            email: typeof req.body.email === 'string' ? req.body.email : '',
            password: typeof req.body.password === 'string' ? req.body.password : '',
            roleName: typeof req.body.roleName === 'string' ? req.body.roleName : '',
            status: req.body.status && Object.values(client_1.UserStatus).includes(req.body.status)
                ? req.body.status
                : client_1.UserStatus.ACTIVE,
        });
        return (0, apiResponse_1.sendSuccess)(res, result, 'User created successfully', 201);
    }
    catch (error) {
        return (0, apiResponse_1.sendErrorNormalized)(res, error, {
            message: 'Failed to create user',
            code: 'ADMIN_CREATE_USER_FAILED',
            status: 500,
        }, {
            'Email already in use': {
                code: 'ADMIN_CREATE_USER_FAILED',
                status: 409,
            },
            'Role not found': {
                code: 'ADMIN_CREATE_USER_FAILED',
                status: 400,
            },
            'Email is required': {
                code: 'ADMIN_CREATE_USER_FAILED',
                status: 400,
            },
            'Name is required': {
                code: 'ADMIN_CREATE_USER_FAILED',
                status: 400,
            },
            'Password is required': {
                code: 'ADMIN_CREATE_USER_FAILED',
                status: 400,
            },
            'Password must be at least 8 characters': {
                code: 'ADMIN_CREATE_USER_FAILED',
                status: 400,
            },
            'Role name is required': {
                code: 'ADMIN_CREATE_USER_FAILED',
                status: 400,
            },
        });
    }
}
async function adminUpdateUserHandler(req, res) {
    try {
        const idParam = (0, paramString_1.getParamAsString)(req.params.id);
        const userId = idParam ? (0, positiveInt_1.parsePositiveInt)(idParam) : null;
        if (!userId) {
            return (0, apiResponse_1.sendError)(res, 'Invalid user id', { code: 'INVALID_USER_ID' }, 400);
        }
        const result = await (0, adminService_1.adminUpdateUser)({
            userId,
            name: typeof req.body.name === 'string' ? req.body.name : undefined,
            email: typeof req.body.email === 'string' ? req.body.email : undefined,
            roleName: typeof req.body.roleName === 'string' ? req.body.roleName : undefined,
            status: req.body.status && Object.values(client_1.UserStatus).includes(req.body.status)
                ? req.body.status
                : undefined,
        });
        return (0, apiResponse_1.sendSuccess)(res, result, 'User updated successfully');
    }
    catch (error) {
        return (0, apiResponse_1.sendErrorNormalized)(res, error, {
            message: 'Failed to update user',
            code: 'ADMIN_UPDATE_USER_FAILED',
            status: 500,
        }, {
            'User not found': {
                code: 'ADMIN_UPDATE_USER_FAILED',
                status: 404,
            },
            'Email already in use': {
                code: 'ADMIN_UPDATE_USER_FAILED',
                status: 409,
            },
            'Role not found': {
                code: 'ADMIN_UPDATE_USER_FAILED',
                status: 400,
            },
            'Name is required': {
                code: 'ADMIN_UPDATE_USER_FAILED',
                status: 400,
            },
            'Email is required': {
                code: 'ADMIN_UPDATE_USER_FAILED',
                status: 400,
            },
            'Role name is required': {
                code: 'ADMIN_UPDATE_USER_FAILED',
                status: 400,
            },
        });
    }
}
async function adminResetUserPasswordHandler(req, res) {
    try {
        const idParam = (0, paramString_1.getParamAsString)(req.params.id);
        const userId = idParam ? (0, positiveInt_1.parsePositiveInt)(idParam) : null;
        if (!userId) {
            return (0, apiResponse_1.sendError)(res, 'Invalid user id', { code: 'INVALID_USER_ID' }, 400);
        }
        const newPassword = typeof req.body.newPassword === 'string' ? req.body.newPassword : '';
        if (!newPassword) {
            return (0, apiResponse_1.sendError)(res, 'New password is required', { code: 'VALIDATION_ERROR' }, 400);
        }
        const adminUserId = req.authUser.id;
        const result = await (0, adminService_1.adminResetUserPassword)({
            userId,
            newPassword,
            adminUserId,
        });
        return (0, apiResponse_1.sendSuccess)(res, result, 'User password reset successfully');
    }
    catch (error) {
        return (0, apiResponse_1.sendErrorNormalized)(res, error, {
            message: 'Failed to reset password',
            code: 'ADMIN_RESET_PASSWORD_FAILED',
            status: 500,
        }, {
            'User not found': {
                code: 'ADMIN_RESET_PASSWORD_FAILED',
                status: 404,
            },
            'User credential not found': {
                code: 'ADMIN_RESET_PASSWORD_FAILED',
                status: 404,
            },
            'Admin password reset for another admin is not allowed': {
                code: 'ADMIN_RESET_PASSWORD_FAILED',
                status: 403,
            },
            'New password is required': {
                code: 'ADMIN_RESET_PASSWORD_FAILED',
                status: 400,
            },
            'Password must be at least 8 characters': {
                code: 'ADMIN_RESET_PASSWORD_FAILED',
                status: 400,
            },
        });
    }
}
async function adminListDraftsHandler(_req, res) {
    try {
        const drafts = await (0, adminService_1.adminListDrafts)();
        return (0, apiResponse_1.sendSuccess)(res, drafts, 'Drafts fetched successfully');
    }
    catch (error) {
        return (0, apiResponse_1.sendErrorNormalized)(res, error, {
            message: 'Failed to fetch drafts',
            code: 'ADMIN_LIST_DRAFTS_FAILED',
            status: 500,
        });
    }
}
async function adminDeleteDraftHandler(req, res) {
    try {
        const idParam = (0, paramString_1.getParamAsString)(req.params.id);
        const draftId = idParam ? (0, positiveInt_1.parsePositiveInt)(idParam) : null;
        if (!draftId) {
            return (0, apiResponse_1.sendError)(res, 'Invalid draft id', { code: 'INVALID_DRAFT_ID' }, 400);
        }
        const result = await (0, adminService_1.adminDeleteDraft)(draftId);
        return (0, apiResponse_1.sendSuccess)(res, result, 'Draft deleted successfully');
    }
    catch (error) {
        return (0, apiResponse_1.sendErrorNormalized)(res, error, {
            message: 'Failed to delete draft',
            code: 'ADMIN_DELETE_DRAFT_FAILED',
            status: 500,
        }, {
            'Draft not found': {
                code: 'ADMIN_DELETE_DRAFT_FAILED',
                status: 404,
            },
        });
    }
}
async function adminListSitesHandler(_req, res) {
    try {
        const sites = await (0, adminService_1.adminListSites)();
        return (0, apiResponse_1.sendSuccess)(res, sites, 'Sites fetched successfully');
    }
    catch (error) {
        return (0, apiResponse_1.sendErrorNormalized)(res, error, {
            message: 'Failed to fetch sites',
            code: 'ADMIN_LIST_SITES_FAILED',
            status: 500,
        });
    }
}
async function adminGetSiteHandler(req, res) {
    try {
        const idParam = (0, paramString_1.getParamAsString)(req.params.id);
        const siteId = idParam ? (0, positiveInt_1.parsePositiveInt)(idParam) : null;
        if (!siteId) {
            return (0, apiResponse_1.sendError)(res, 'Invalid site id', { code: 'INVALID_SITE_ID' }, 400);
        }
        const site = await (0, adminService_1.adminGetSiteById)(siteId);
        return (0, apiResponse_1.sendSuccess)(res, site, 'Site fetched successfully');
    }
    catch (error) {
        return (0, apiResponse_1.sendErrorNormalized)(res, error, {
            message: 'Failed to fetch site',
            code: 'ADMIN_GET_SITE_FAILED',
            status: 500,
        }, {
            'Site not found': {
                code: 'ADMIN_GET_SITE_FAILED',
                status: 404,
            },
        });
    }
}
async function adminDeleteSiteHandler(req, res) {
    try {
        const idParam = (0, paramString_1.getParamAsString)(req.params.id);
        const siteId = idParam ? (0, positiveInt_1.parsePositiveInt)(idParam) : null;
        if (!siteId) {
            return (0, apiResponse_1.sendError)(res, 'Invalid site id', { code: 'INVALID_SITE_ID' }, 400);
        }
        const result = await (0, adminService_1.adminDeleteSite)(siteId);
        return (0, apiResponse_1.sendSuccess)(res, result, 'Site deleted successfully');
    }
    catch (error) {
        return (0, apiResponse_1.sendErrorNormalized)(res, error, {
            message: 'Failed to delete site',
            code: 'ADMIN_DELETE_SITE_FAILED',
            status: 500,
        }, {
            'Site not found': {
                code: 'ADMIN_DELETE_SITE_FAILED',
                status: 404,
            },
        });
    }
}
async function adminUpdateUserStatusHandler(req, res) {
    try {
        const idParam = (0, paramString_1.getParamAsString)(req.params.id);
        const userId = idParam ? (0, positiveInt_1.parsePositiveInt)(idParam) : null;
        if (!userId) {
            return (0, apiResponse_1.sendError)(res, 'Invalid user id', { code: 'INVALID_USER_ID' }, 400);
        }
        const status = req.body.status && Object.values(client_1.UserStatus).includes(req.body.status)
            ? req.body.status
            : null;
        if (!status) {
            return (0, apiResponse_1.sendError)(res, 'Invalid status', { code: 'INVALID_STATUS' }, 400);
        }
        const result = await (0, adminService_1.adminUpdateUserStatus)({
            userId,
            status,
        });
        return (0, apiResponse_1.sendSuccess)(res, result, 'User status updated successfully');
    }
    catch (error) {
        return (0, apiResponse_1.sendErrorNormalized)(res, error, {
            message: 'Failed to update user status',
            code: 'ADMIN_UPDATE_USER_STATUS_FAILED',
            status: 500,
        }, {
            'User not found': {
                code: 'ADMIN_UPDATE_USER_STATUS_FAILED',
                status: 404,
            },
        });
    }
}
async function adminGetDraftHandler(req, res) {
    try {
        const idParam = (0, paramString_1.getParamAsString)(req.params.id);
        const draftId = idParam ? (0, positiveInt_1.parsePositiveInt)(idParam) : null;
        if (!draftId) {
            return (0, apiResponse_1.sendError)(res, 'Invalid draft id', { code: 'INVALID_DRAFT_ID' }, 400);
        }
        const draft = await (0, adminService_1.adminGetDraftById)(draftId);
        return (0, apiResponse_1.sendSuccess)(res, draft, 'Draft fetched successfully');
    }
    catch (error) {
        return (0, apiResponse_1.sendErrorNormalized)(res, error, {
            message: 'Failed to fetch draft',
            code: 'ADMIN_GET_DRAFT_FAILED',
            status: 500,
        }, {
            'Draft not found': {
                code: 'ADMIN_GET_DRAFT_FAILED',
                status: 404,
            },
        });
    }
}
