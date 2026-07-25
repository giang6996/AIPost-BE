"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllDrafts = getAllDrafts;
exports.getDraftById = getDraftById;
exports.createDraft = createDraft;
exports.updateDraft = updateDraft;
exports.deleteDraft = deleteDraft;
exports.getDraftCategories = getDraftCategories;
exports.replaceDraftCategories = replaceDraftCategories;
exports.getDraftTags = getDraftTags;
exports.replaceDraftTags = replaceDraftTags;
exports.upsertDraftSeoMeta = upsertDraftSeoMeta;
exports.getDraftSeoMeta = getDraftSeoMeta;
const client_1 = require("@prisma/client");
const prisma_1 = require("../lib/prisma");
const crypto_1 = require("../utils/crypto");
const wordpressService_1 = require("./wordpressService");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
async function getAllDrafts(userId) {
    return prisma_1.prisma.draft.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        include: {
            defaultSite: true,
            seoMeta: true,
            categories: {
                orderBy: { categoryName: 'asc' },
            },
            tags: {
                orderBy: { tagName: 'asc' },
            },
        },
    });
}
async function getDraftById(id, userId) {
    return prisma_1.prisma.draft.findFirst({
        where: {
            id,
            userId,
        },
        include: {
            defaultSite: true,
            seoMeta: true,
            postSyncs: true,
            categories: {
                orderBy: { categoryName: 'asc' },
            },
            tags: {
                orderBy: { tagName: 'asc' },
            },
        },
    });
}
async function createDraft(input) {
    if (!input.userId) {
        throw new Error('Local app userId is required to create a draft');
    }
    return prisma_1.prisma.draft.create({
        data: {
            userId: input.userId,
            defaultSiteId: input.defaultSiteId ?? null,
            title: input.title.trim(),
            slug: input.slug?.trim() || null,
            excerpt: input.excerpt?.trim() || null,
            contentHtml: input.contentHtml,
            featuredImageUrl: input.featuredImageUrl?.trim() || null,
            featuredImageAlt: input.featuredImageAlt?.trim() || null,
            status: client_1.DraftStatus.DRAFT,
        },
        include: {
            defaultSite: true,
            seoMeta: true,
            categories: true,
            tags: true,
        },
    });
}
async function updateDraft(id, userId, input) {
    const existingDraft = await prisma_1.prisma.draft.findFirst({
        where: {
            id,
            userId,
        },
    });
    if (!existingDraft) {
        throw new Error('Draft not found');
    }
    return prisma_1.prisma.draft.update({
        where: { id },
        data: {
            defaultSiteId: input.defaultSiteId !== undefined ? input.defaultSiteId : undefined,
            title: input.title !== undefined ? input.title.trim() : undefined,
            slug: input.slug !== undefined ? input.slug?.trim() || null : undefined,
            excerpt: input.excerpt !== undefined ? input.excerpt?.trim() || null : undefined,
            contentHtml: input.contentHtml !== undefined ? input.contentHtml : undefined,
            featuredImageUrl: input.featuredImageUrl !== undefined
                ? input.featuredImageUrl?.trim() || null
                : undefined,
            featuredImageAlt: input.featuredImageAlt !== undefined
                ? input.featuredImageAlt?.trim() || null
                : undefined,
            status: input.status !== undefined ? input.status : undefined,
        },
        include: {
            defaultSite: true,
            seoMeta: true,
            categories: true,
            tags: true,
        },
    });
}
async function deleteDraft(draftId, userId) {
    const draft = await prisma_1.prisma.draft.findFirst({
        where: {
            id: draftId,
            userId,
        },
        include: {
            images: true,
        },
    });
    if (!draft) {
        throw new Error('Draft not found');
    }
    const localPaths = draft.images
        .map((image) => image.localPath)
        .filter((localPath) => typeof localPath === 'string');
    await prisma_1.prisma.draft.delete({
        where: {
            id: draft.id,
        },
    });
    if (localPaths.length > 0) {
        await Promise.all(localPaths.map(async (localPath) => {
            try {
                const absolutePath = path_1.default.resolve(localPath);
                if (fs_1.default.existsSync(absolutePath)) {
                    await fs_1.default.promises.unlink(absolutePath);
                }
            }
            catch {
                // ignore local file delete errors
            }
        }));
    }
    return {
        id: draft.id,
    };
}
async function getDraftCategories(draftId, userId) {
    const draft = await prisma_1.prisma.draft.findFirst({
        where: {
            id: draftId,
            userId,
        },
    });
    if (!draft) {
        throw new Error('Draft not found');
    }
    return prisma_1.prisma.draftCategory.findMany({
        where: { draftId },
        orderBy: { categoryName: 'asc' },
    });
}
async function replaceDraftCategories(draftId, userId, input) {
    const draft = await prisma_1.prisma.draft.findFirst({
        where: {
            id: draftId,
            userId,
        },
        include: {
            defaultSite: true,
        },
    });
    if (!draft) {
        throw new Error('Draft not found');
    }
    const resolvedSiteId = input.siteId ?? draft.defaultSiteId;
    if (!resolvedSiteId) {
        throw new Error('No target site selected');
    }
    const site = await prisma_1.prisma.wpSite.findFirst({
        where: {
            id: resolvedSiteId,
            userId,
        },
    });
    if (!site) {
        throw new Error('Target site not found');
    }
    const normalizedCategoryIds = Array.isArray(input.categoryIds)
        ? [...new Set(input.categoryIds.filter((value) => Number.isInteger(value) && value > 0))]
        : [];
    const wpCategoriesResult = await (0, wordpressService_1.getWpCategories)({
        siteUrl: site.siteUrl,
        wpUsername: site.wpUsername,
        wpApplicationPassword: (0, crypto_1.decrypt)(site.wpApplicationPasswordEncrypted),
    });
    if (!wpCategoriesResult.success) {
        throw new Error(wpCategoriesResult.message);
    }
    const availableCategories = wpCategoriesResult.categories ?? [];
    const availableMap = new Map(availableCategories.map((category) => [category.id, category]));
    const invalidCategoryIds = normalizedCategoryIds.filter((categoryId) => !availableMap.has(categoryId));
    if (invalidCategoryIds.length > 0) {
        throw new Error(`Invalid category ids for target site: ${invalidCategoryIds.join(', ')}`);
    }
    await prisma_1.prisma.$transaction(async (tx) => {
        await tx.draftCategory.deleteMany({
            where: { draftId },
        });
        if (normalizedCategoryIds.length > 0) {
            await tx.draftCategory.createMany({
                data: normalizedCategoryIds.map((categoryId) => {
                    const category = availableMap.get(categoryId);
                    return {
                        draftId,
                        siteId: resolvedSiteId,
                        wpCategoryId: category.id,
                        categoryName: category.name,
                        slug: category.slug ?? null,
                    };
                }),
            });
        }
        if (!draft.defaultSiteId && input.siteId) {
            await tx.draft.update({
                where: { id: draftId },
                data: {
                    defaultSiteId: resolvedSiteId,
                },
            });
        }
    });
    return prisma_1.prisma.draft.findFirst({
        where: {
            id: draftId,
            userId,
        },
        include: {
            defaultSite: true,
            seoMeta: true,
            categories: {
                orderBy: { categoryName: 'asc' },
            },
        },
    });
}
async function getDraftTags(draftId, userId) {
    const draft = await prisma_1.prisma.draft.findFirst({
        where: {
            id: draftId,
            userId,
        },
    });
    if (!draft) {
        throw new Error('Draft not found');
    }
    return prisma_1.prisma.draftTag.findMany({
        where: { draftId },
        orderBy: { tagName: 'asc' },
    });
}
async function replaceDraftTags(draftId, userId, input) {
    const draft = await prisma_1.prisma.draft.findFirst({
        where: {
            id: draftId,
            userId,
        },
        include: {
            defaultSite: true,
        },
    });
    if (!draft) {
        throw new Error('Draft not found');
    }
    const resolvedSiteId = input.siteId ?? draft.defaultSiteId;
    if (!resolvedSiteId) {
        throw new Error('No target site selected');
    }
    const site = await prisma_1.prisma.wpSite.findFirst({
        where: {
            id: resolvedSiteId,
            userId,
        },
    });
    if (!site) {
        throw new Error('Target site not found');
    }
    const normalizedTagIds = Array.isArray(input.tagIds)
        ? [...new Set(input.tagIds.filter((value) => Number.isInteger(value) && value > 0))]
        : [];
    const wpTagsResult = await (0, wordpressService_1.getWpTags)({
        siteUrl: site.siteUrl,
        wpUsername: site.wpUsername,
        wpApplicationPassword: (0, crypto_1.decrypt)(site.wpApplicationPasswordEncrypted),
    });
    if (!wpTagsResult.success) {
        throw new Error(wpTagsResult.message);
    }
    const availableTags = wpTagsResult.tags ?? [];
    const availableMap = new Map(availableTags.map((tag) => [tag.id, tag]));
    const invalidTagIds = normalizedTagIds.filter((tagId) => !availableMap.has(tagId));
    if (invalidTagIds.length > 0) {
        throw new Error(`Invalid tag ids for target site: ${invalidTagIds.join(', ')}`);
    }
    await prisma_1.prisma.$transaction(async (tx) => {
        await tx.draftTag.deleteMany({
            where: { draftId },
        });
        if (normalizedTagIds.length > 0) {
            await tx.draftTag.createMany({
                data: normalizedTagIds.map((tagId) => {
                    const tag = availableMap.get(tagId);
                    return {
                        draftId,
                        siteId: resolvedSiteId,
                        wpTagId: tag.id,
                        tagName: tag.name,
                        slug: tag.slug ?? null,
                    };
                }),
            });
        }
        if (!draft.defaultSiteId && input.siteId) {
            await tx.draft.update({
                where: { id: draftId },
                data: {
                    defaultSiteId: resolvedSiteId,
                },
            });
        }
    });
    return prisma_1.prisma.draft.findFirst({
        where: {
            id: draftId,
            userId,
        },
        include: {
            defaultSite: true,
            seoMeta: true,
            categories: {
                orderBy: { categoryName: 'asc' },
            },
            tags: {
                orderBy: { tagName: 'asc' },
            },
        },
    });
}
async function upsertDraftSeoMeta(draftId, userId, input) {
    const existingDraft = await prisma_1.prisma.draft.findFirst({
        where: {
            id: draftId,
            userId,
        },
    });
    if (!existingDraft) {
        throw new Error('Draft not found');
    }
    return prisma_1.prisma.draftSeoMeta.upsert({
        where: { draftId },
        update: {
            seoTitle: input.seoTitle !== undefined ? input.seoTitle?.trim() || null : undefined,
            metaDescription: input.metaDescription !== undefined
                ? input.metaDescription?.trim() || null
                : undefined,
            canonicalUrl: input.canonicalUrl !== undefined
                ? input.canonicalUrl?.trim() || null
                : undefined,
            focusKeyword: input.focusKeyword !== undefined
                ? input.focusKeyword?.trim() || null
                : undefined,
            ogTitle: input.ogTitle !== undefined ? input.ogTitle?.trim() || null : undefined,
            ogDescription: input.ogDescription !== undefined
                ? input.ogDescription?.trim() || null
                : undefined,
            ogImageUrl: input.ogImageUrl !== undefined
                ? input.ogImageUrl?.trim() || null
                : undefined,
        },
        create: {
            draftId,
            seoTitle: input.seoTitle?.trim() || null,
            metaDescription: input.metaDescription?.trim() || null,
            canonicalUrl: input.canonicalUrl?.trim() || null,
            focusKeyword: input.focusKeyword?.trim() || null,
            ogTitle: input.ogTitle?.trim() || null,
            ogDescription: input.ogDescription?.trim() || null,
            ogImageUrl: input.ogImageUrl?.trim() || null,
        },
    });
}
async function getDraftSeoMeta(draftId, userId) {
    const draft = await prisma_1.prisma.draft.findFirst({
        where: {
            id: draftId,
            userId,
        },
        include: {
            seoMeta: true,
        },
    });
    if (!draft) {
        throw new Error('Draft not found');
    }
    return draft.seoMeta;
}
