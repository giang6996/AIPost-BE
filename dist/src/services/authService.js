"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerUser = registerUser;
exports.loginUser = loginUser;
exports.getCurrentUserFromToken = getCurrentUserFromToken;
exports.updateProfile = updateProfile;
exports.changePassword = changePassword;
exports.logoutUser = logoutUser;
const client_1 = require("@prisma/client");
const prisma_1 = require("../lib/prisma");
const password_1 = require("../utils/password");
const sessionToken_1 = require("../utils/sessionToken");
const SESSION_TTL_DAYS = 30;
function normalizeEmail(email) {
    return email.trim().toLowerCase();
}
function sanitizeUser(user) {
    return {
        id: user.id,
        email: user.email,
        name: user.name,
        roleId: user.roleId,
        status: user.status,
        role: {
            id: user.role.id,
            name: user.role.name,
        },
    };
}
function getSessionExpiryDate() {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + SESSION_TTL_DAYS);
    return expiresAt;
}
async function registerUser(input) {
    const email = normalizeEmail(input.email);
    const name = input.name.trim();
    const password = input.password;
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
    const existingUser = await prisma_1.prisma.user.findUnique({
        where: { email },
    });
    if (existingUser) {
        throw new Error('Email already in use');
    }
    const editorRole = await prisma_1.prisma.role.findUnique({
        where: { name: 'editor' },
    });
    if (!editorRole) {
        throw new Error('Editor role not found');
    }
    const passwordHash = await (0, password_1.hashPassword)(password);
    const user = await prisma_1.prisma.user.create({
        data: {
            email,
            name,
            roleId: editorRole.id,
            status: client_1.UserStatus.ACTIVE,
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
    return sanitizeUser(user);
}
async function loginUser(input) {
    const email = normalizeEmail(input.email);
    const password = input.password;
    if (!email) {
        throw new Error('Email is required');
    }
    if (!password) {
        throw new Error('Password is required');
    }
    const user = await prisma_1.prisma.user.findUnique({
        where: { email },
        include: {
            role: true,
            credential: true,
        },
    });
    if (!user || !user.credential) {
        throw new Error('Invalid email or password');
    }
    if (user.status !== client_1.UserStatus.ACTIVE) {
        throw new Error('User account is not active');
    }
    const passwordMatches = await (0, password_1.verifyPassword)(password, user.credential.passwordHash);
    if (!passwordMatches) {
        throw new Error('Invalid email or password');
    }
    const token = (0, sessionToken_1.generateSessionToken)();
    const sessionTokenHash = (0, sessionToken_1.hashSessionToken)(token);
    const expiresAt = getSessionExpiryDate();
    const session = await prisma_1.prisma.userSession.create({
        data: {
            userId: user.id,
            sessionTokenHash,
            expiresAt,
            lastUsedAt: new Date(),
        },
    });
    return {
        token,
        session: {
            id: session.id,
            expiresAt: session.expiresAt,
        },
        user: sanitizeUser(user),
    };
}
async function getCurrentUserFromToken(rawToken) {
    const sessionTokenHash = (0, sessionToken_1.hashSessionToken)(rawToken);
    const session = await prisma_1.prisma.userSession.findUnique({
        where: {
            sessionTokenHash,
        },
        include: {
            user: {
                include: {
                    role: true,
                },
            },
        },
    });
    if (!session) {
        throw new Error('Invalid session');
    }
    if (session.revokedAt) {
        throw new Error('Session has been revoked');
    }
    if (session.expiresAt.getTime() <= Date.now()) {
        throw new Error('Session has expired');
    }
    if (session.user.status !== client_1.UserStatus.ACTIVE) {
        throw new Error('User account is not active');
    }
    await prisma_1.prisma.userSession.update({
        where: { id: session.id },
        data: {
            lastUsedAt: new Date(),
        },
    });
    return {
        sessionId: session.id,
        user: sanitizeUser(session.user),
    };
}
async function updateProfile(input) {
    const user = await prisma_1.prisma.user.findUnique({
        where: { id: input.userId },
        include: {
            role: true,
        },
    });
    if (!user) {
        throw new Error('User not found');
    }
    const nextName = typeof input.name === 'string' && input.name.trim().length > 0
        ? input.name.trim()
        : undefined;
    const nextEmail = typeof input.email === 'string' && input.email.trim().length > 0
        ? normalizeEmail(input.email)
        : undefined;
    if (nextName === undefined && nextEmail === undefined) {
        throw new Error('At least one field is required');
    }
    if (nextEmail && nextEmail !== user.email) {
        const existingUser = await prisma_1.prisma.user.findUnique({
            where: { email: nextEmail },
        });
        if (existingUser && existingUser.id !== user.id) {
            throw new Error('Email already in use');
        }
    }
    const updatedUser = await prisma_1.prisma.user.update({
        where: { id: user.id },
        data: {
            name: nextName ?? user.name,
            email: nextEmail ?? user.email,
        },
        include: {
            role: true,
        },
    });
    return sanitizeUser(updatedUser);
}
async function changePassword(input) {
    const user = await prisma_1.prisma.user.findUnique({
        where: { id: input.userId },
        include: {
            credential: true,
        },
    });
    if (!user) {
        throw new Error('User not found');
    }
    if (!user.credential) {
        throw new Error('User credential not found');
    }
    const currentPassword = input.currentPassword;
    const newPassword = input.newPassword;
    if (!currentPassword) {
        throw new Error('Current password is required');
    }
    if (!newPassword) {
        throw new Error('New password is required');
    }
    if (newPassword.length < 8) {
        throw new Error('New password must be at least 8 characters');
    }
    const passwordMatches = await (0, password_1.verifyPassword)(currentPassword, user.credential.passwordHash);
    if (!passwordMatches) {
        throw new Error('Current password is incorrect');
    }
    const newPasswordHash = await (0, password_1.hashPassword)(newPassword);
    await prisma_1.prisma.userCredential.update({
        where: {
            userId: user.id,
        },
        data: {
            passwordHash: newPasswordHash,
            passwordUpdatedAt: new Date(),
        },
    });
    return {
        userId: user.id,
    };
}
async function logoutUser(rawToken) {
    const sessionTokenHash = (0, sessionToken_1.hashSessionToken)(rawToken);
    const session = await prisma_1.prisma.userSession.findUnique({
        where: {
            sessionTokenHash,
        },
    });
    if (!session) {
        throw new Error('Session not found');
    }
    if (!session.revokedAt) {
        await prisma_1.prisma.userSession.update({
            where: { id: session.id },
            data: {
                revokedAt: new Date(),
            },
        });
    }
    return {
        sessionId: session.id,
    };
}
