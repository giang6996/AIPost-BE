"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllSites = getAllSites;
exports.createSite = createSite;
exports.updateSite = updateSite;
exports.deleteSite = deleteSite;
exports.testSiteConnectionOnly = testSiteConnectionOnly;
exports.getSiteCategories = getSiteCategories;
exports.getSiteTags = getSiteTags;
exports.createSiteCategory = createSiteCategory;
exports.updateSiteCategory = updateSiteCategory;
exports.createSiteTag = createSiteTag;
exports.updateSiteTag = updateSiteTag;
const client_1 = require("@prisma/client");
const prisma_1 = require("../lib/prisma");
const crypto_1 = require("../utils/crypto");
const wordpressService_1 = require("./wordpressService");
function normalizeSiteUrl(siteUrl) {
    return siteUrl.trim().replace(/\/+$/, '');
}
async function getAllSites(userId) {
    return prisma_1.prisma.wpSite.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
    });
}
async function getOwnedSiteOrThrow(siteId, userId) {
    const site = await prisma_1.prisma.wpSite.findFirst({
        where: {
            id: siteId,
            userId,
        },
    });
    if (!site) {
        throw new Error('Site not found');
    }
    return site;
}
async function createSite(input) {
    const connectionResult = await (0, wordpressService_1.testWpConnection)({
        siteUrl: input.siteUrl,
        wpUsername: input.wpUsername,
        wpApplicationPassword: input.wpApplicationPassword,
    });
    if (!connectionResult.success) {
        throw new Error(connectionResult.message);
    }
    return prisma_1.prisma.wpSite.create({
        data: {
            userId: input.userId,
            siteName: input.siteName.trim(),
            siteUrl: normalizeSiteUrl(input.siteUrl),
            wpUsername: input.wpUsername.trim(),
            wpApplicationPasswordEncrypted: (0, crypto_1.encrypt)(input.wpApplicationPassword),
            snippetEnabled: input.snippetEnabled ?? false,
            status: client_1.SiteStatus.ACTIVE,
        },
    });
}
async function updateSite(siteId, userId, input) {
    const site = await prisma_1.prisma.wpSite.findFirst({
        where: {
            id: siteId,
            userId,
        },
    });
    if (!site) {
        throw new Error('Site not found');
    }
    const nextSiteName = input.siteName ?? site.siteName;
    const nextSiteUrl = input.siteUrl ?? site.siteUrl;
    const nextWpUsername = input.wpUsername ?? site.wpUsername;
    const nextSnippetEnabled = input.snippetEnabled ?? site.snippetEnabled;
    const passwordWasProvided = typeof input.wpApplicationPassword === 'string' &&
        input.wpApplicationPassword.trim().length > 0;
    const nextWpApplicationPassword = passwordWasProvided
        ? input.wpApplicationPassword.trim()
        : (0, crypto_1.decrypt)(site.wpApplicationPasswordEncrypted);
    const connectionSensitiveChanged = nextSiteUrl !== site.siteUrl ||
        nextWpUsername !== site.wpUsername ||
        passwordWasProvided;
    if (connectionSensitiveChanged) {
        const connectionResult = await (0, wordpressService_1.testWpConnection)({
            siteUrl: nextSiteUrl,
            wpUsername: nextWpUsername,
            wpApplicationPassword: nextWpApplicationPassword,
        });
        if (!connectionResult.success) {
            throw new Error(connectionResult.message);
        }
    }
    const updatedSite = await prisma_1.prisma.wpSite.update({
        where: {
            id: site.id,
        },
        data: {
            siteName: nextSiteName,
            siteUrl: nextSiteUrl,
            wpUsername: nextWpUsername,
            wpApplicationPasswordEncrypted: passwordWasProvided
                ? (0, crypto_1.encrypt)(nextWpApplicationPassword)
                : site.wpApplicationPasswordEncrypted,
            snippetEnabled: nextSnippetEnabled,
        },
    });
    return updatedSite;
}
async function deleteSite(siteId, userId) {
    const site = await prisma_1.prisma.wpSite.findFirst({
        where: {
            id: siteId,
            userId,
        },
    });
    if (!site) {
        throw new Error('Site not found');
    }
    await prisma_1.prisma.wpSite.delete({
        where: {
            id: site.id,
        },
    });
    return {
        id: site.id,
    };
}
async function testSiteConnectionOnly(input) {
    return (0, wordpressService_1.testWpConnection)(input);
}
async function getSiteCategories(siteId, userId) {
    const site = await prisma_1.prisma.wpSite.findFirst({
        where: {
            id: siteId,
            userId,
        },
    });
    if (!site) {
        throw new Error('Site not found');
    }
    const result = await (0, wordpressService_1.getWpCategories)({
        siteUrl: site.siteUrl,
        wpUsername: site.wpUsername,
        wpApplicationPassword: (0, crypto_1.decrypt)(site.wpApplicationPasswordEncrypted),
    });
    if (!result.success) {
        throw new Error(result.message);
    }
    return result.categories ?? [];
}
async function getSiteTags(siteId, userId) {
    const site = await prisma_1.prisma.wpSite.findFirst({
        where: {
            id: siteId,
            userId,
        },
    });
    if (!site) {
        throw new Error('Site not found');
    }
    const result = await (0, wordpressService_1.getWpTags)({
        siteUrl: site.siteUrl,
        wpUsername: site.wpUsername,
        wpApplicationPassword: (0, crypto_1.decrypt)(site.wpApplicationPasswordEncrypted),
    });
    if (!result.success) {
        throw new Error(result.message);
    }
    return result.tags ?? [];
}
async function createSiteCategory(siteId, userId, input) {
    const site = await getOwnedSiteOrThrow(siteId, userId);
    const result = await (0, wordpressService_1.createWpCategory)({
        siteUrl: site.siteUrl,
        wpUsername: site.wpUsername,
        wpApplicationPassword: (0, crypto_1.decrypt)(site.wpApplicationPasswordEncrypted),
        name: input.name,
        slug: input.slug,
        description: input.description,
    });
    if (!result.success) {
        throw new Error(result.message);
    }
    return result.term;
}
async function updateSiteCategory(siteId, categoryId, userId, input) {
    const site = await getOwnedSiteOrThrow(siteId, userId);
    const result = await (0, wordpressService_1.updateWpCategory)({
        siteUrl: site.siteUrl,
        wpUsername: site.wpUsername,
        wpApplicationPassword: (0, crypto_1.decrypt)(site.wpApplicationPasswordEncrypted),
        termId: categoryId,
        name: input.name,
        slug: input.slug,
        description: input.description,
    });
    if (!result.success) {
        throw new Error(result.message);
    }
    return result.term;
}
async function createSiteTag(siteId, userId, input) {
    const site = await getOwnedSiteOrThrow(siteId, userId);
    const result = await (0, wordpressService_1.createWpTag)({
        siteUrl: site.siteUrl,
        wpUsername: site.wpUsername,
        wpApplicationPassword: (0, crypto_1.decrypt)(site.wpApplicationPasswordEncrypted),
        name: input.name,
        slug: input.slug,
        description: input.description,
    });
    if (!result.success) {
        throw new Error(result.message);
    }
    return result.term;
}
async function updateSiteTag(siteId, tagId, userId, input) {
    const site = await getOwnedSiteOrThrow(siteId, userId);
    const result = await (0, wordpressService_1.updateWpTag)({
        siteUrl: site.siteUrl,
        wpUsername: site.wpUsername,
        wpApplicationPassword: (0, crypto_1.decrypt)(site.wpApplicationPasswordEncrypted),
        termId: tagId,
        name: input.name,
        slug: input.slug,
        description: input.description,
    });
    if (!result.success) {
        throw new Error(result.message);
    }
    return result.term;
}
