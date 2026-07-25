"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminListUsers = adminListUsers;
exports.adminCreateUser = adminCreateUser;
exports.adminUpdateUser = adminUpdateUser;
exports.adminUpdateUserStatus = adminUpdateUserStatus;
exports.adminResetUserPassword = adminResetUserPassword;
exports.adminListDrafts = adminListDrafts;
exports.adminGetDraftById = adminGetDraftById;
exports.adminDeleteDraft = adminDeleteDraft;
exports.adminListSites = adminListSites;
exports.adminGetSiteById = adminGetSiteById;
exports.adminDeleteSite = adminDeleteSite;
const client_1 = require("@prisma/client");
const prisma_1 = require("../lib/prisma");
const password_1 = require("../utils/password");
const draftService_1 = require("./draftService");
const siteService_1 = require("./siteService");
function sanitizeAdminUser(user) {
    return {
        id: user.id,
        email: user.email,
        name: user.name,
        status: user.status,
        roleId: user.roleId,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        role: {
            id: user.role.id,
            name: user.role.name,
        },
    };
}
async function adminListUsers() {
    const users = await prisma_1.prisma.user.findMany({
        include: {
            role: true,
        },
        orderBy: {
            createdAt: 'desc',
        },
    });
    return users.map(sanitizeAdminUser);
}
async function adminCreateUser(input) {
    const email = input.email.trim().toLowerCase();
    const name = input.name.trim();
    const password = input.password;
    const roleName = input.roleName.trim().toLowerCase();
    const status = input.status ?? client_1.UserStatus.ACTIVE;
    if (!email) {
        throw new Error('Email is required');
    }
    if (!name) {
        throw new Error('Name is required');
    }
    if (!password) {
        throw new Error('Password is required');
    }
    if (password.length < 8) {
        throw new Error('Password must be at least 8 characters');
    }
    // Add must have Uppercase letter, number, and special character here 
    if (!roleName) {
        throw new Error('Role name is required');
    }
    const existingUser = await prisma_1.prisma.user.findUnique({
        where: { email },
    });
    if (existingUser) {
        throw new Error('Email already in use');
    }
    const role = await prisma_1.prisma.role.findUnique({
        where: { name: roleName },
    });
    if (!role) {
        throw new Error('Role not found');
    }
    const passwordHash = await (0, password_1.hashPassword)(password);
    const user = await prisma_1.prisma.user.create({
        data: {
            email,
            name,
            roleId: role.id,
            status,
            credential: {
                create: {
                    passwordHash,
                },
            },
        },
        include: {
            role: true,
        },
    });
    return sanitizeAdminUser(user);
}
async function adminUpdateUser(input) {
    const user = await prisma_1.prisma.user.findUnique({
        where: { id: input.userId },
        include: { role: true },
    });
    if (!user) {
        throw new Error('User not found');
    }
    let nextRoleId = undefined;
    if (input.roleName !== undefined) {
        const roleName = input.roleName.trim().toLowerCase();
        if (!roleName) {
            throw new Error('Role name is required');
        }
        const role = await prisma_1.prisma.role.findUnique({
            where: { name: roleName },
        });
        if (!role) {
            throw new Error('Role not found');
        }
        nextRoleId = role.id;
    }
    let nextEmail = undefined;
    if (input.email !== undefined) {
        nextEmail = input.email.trim().toLowerCase();
        if (!nextEmail) {
            throw new Error('Email is required');
        }
        const existingUser = await prisma_1.prisma.user.findUnique({
            where: { email: nextEmail },
        });
        if (existingUser && existingUser.id !== user.id) {
            throw new Error('Email already in use');
        }
    }
    let nextName = undefined;
    if (input.name !== undefined) {
        nextName = input.name.trim();
        if (!nextName) {
            throw new Error('Name is required');
        }
    }
    const updatedUser = await prisma_1.prisma.user.update({
        where: { id: user.id },
        data: {
            name: nextName,
            email: nextEmail,
            roleId: nextRoleId,
            status: input.status,
        },
        include: {
            role: true,
        },
    });
    return sanitizeAdminUser(updatedUser);
}
async function adminUpdateUserStatus(input) {
    const user = await prisma_1.prisma.user.findUnique({
        where: { id: input.userId },
        include: { role: true },
    });
    if (!user) {
        throw new Error('User not found');
    }
    const updatedUser = await prisma_1.prisma.user.update({
        where: { id: user.id },
        data: {
            status: input.status,
        },
        include: {
            role: true,
        },
    });
    return sanitizeAdminUser(updatedUser);
}
async function adminResetUserPassword(input) {
    const user = await prisma_1.prisma.user.findUnique({
        where: { id: input.userId },
        include: {
            role: true,
            credential: true,
        },
    });
    if (!user) {
        throw new Error('User not found');
    }
    if (!user.credential) {
        throw new Error('User credential not found');
    }
    if (!input.newPassword) {
        throw new Error('New password is required');
    }
    if (input.newPassword.length < 8) {
        throw new Error('Password must be at least 8 characters');
    }
    if (user.role.name === 'admin' && input.userId !== input.adminUserId) {
        throw new Error('Admin password reset for another admin is not allowed');
    }
    const passwordHash = await (0, password_1.hashPassword)(input.newPassword);
    await prisma_1.prisma.userCredential.update({
        where: {
            userId: user.id,
        },
        data: {
            passwordHash,
            passwordUpdatedAt: new Date(),
        },
    });
    return {
        userId: user.id,
        passwordReset: true,
    };
}
async function adminListDrafts() {
    return prisma_1.prisma.draft.findMany({
        include: {
            user: {
                select: {
                    id: true,
                    email: true,
                    name: true,
                },
            },
            defaultSite: {
                select: {
                    id: true,
                    siteName: true,
                    siteUrl: true,
                },
            },
        },
        orderBy: {
            updatedAt: 'desc',
        },
    });
}
async function adminGetDraftById(draftId) {
    const draft = await prisma_1.prisma.draft.findUnique({
        where: { id: draftId },
        include: {
            user: {
                select: {
                    id: true,
                    email: true,
                    name: true,
                },
            },
            defaultSite: true,
            seoMeta: true,
            images: true,
            categories: true,
            tags: true,
            postSyncs: true,
        },
    });
    if (!draft) {
        throw new Error('Draft not found');
    }
    return draft;
}
// Delete User here, with draft redirect to another user (preferrably admin)
// or delete them outright
async function adminDeleteDraft(draftId) {
    const draft = await prisma_1.prisma.draft.findUnique({
        where: { id: draftId },
    });
    if (!draft) {
        throw new Error('Draft not found');
    }
    // Replace this with your shared cleanup delete helper if you extract one.
    await (0, draftService_1.deleteDraft)(draftId, draft.userId);
    return {
        id: draftId,
        deleted: true,
    };
}
async function adminListSites() {
    return prisma_1.prisma.wpSite.findMany({
        include: {
            user: {
                select: {
                    id: true,
                    email: true,
                    name: true,
                },
            },
        },
        orderBy: {
            createdAt: 'desc',
        },
    });
}
async function adminGetSiteById(siteId) {
    const site = await prisma_1.prisma.wpSite.findUnique({
        where: { id: siteId },
        include: {
            user: {
                select: {
                    id: true,
                    email: true,
                    name: true,
                },
            },
        },
    });
    if (!site) {
        throw new Error('Site not found');
    }
    return site;
}
async function adminDeleteSite(siteId) {
    const site = await prisma_1.prisma.wpSite.findUnique({
        where: { id: siteId },
    });
    if (!site) {
        throw new Error('Site not found');
    }
    await (0, siteService_1.deleteSite)(siteId, site.userId);
    return {
        id: siteId,
        deleted: true,
    };
}
