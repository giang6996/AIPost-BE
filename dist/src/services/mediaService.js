"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDraftImages = getDraftImages;
exports.createDraftImage = createDraftImage;
exports.saveGeneratedDraftImage = saveGeneratedDraftImage;
exports.uploadDraftImageToWp = uploadDraftImageToWp;
exports.insertDraftImage = insertDraftImage;
exports.updateDraftImage = updateDraftImage;
exports.deleteDraftImage = deleteDraftImage;
exports.setDraftFeaturedImage = setDraftFeaturedImage;
const client_1 = require("@prisma/client");
const imageBlock_1 = require("../utils/imageBlock");
const prisma_1 = require("../lib/prisma");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = require("crypto");
const crypto_2 = require("../utils/crypto");
const wordpressService_1 = require("./wordpressService");
const htmlInsert_1 = require("../utils/htmlInsert");
function getExtensionFromMimeType(mimeType) {
    switch (mimeType.toLowerCase()) {
        case "image/png":
            return "png";
        case "image/jpeg":
        case "image/jpg":
            return "jpg";
        case "image/webp":
            return "webp";
        case "image/gif":
            return "gif";
        default:
            return null;
    }
}
function getPublicBackendBaseUrl() {
    return process.env.PUBLIC_BACKEND_URL || "http://localhost:3001";
}
function normalizeSlashes(value) {
    return value.replace(/\\/g, "/");
}
function mapDraftImageWithPreviewUrl(image) {
    return {
        ...image,
        previewUrl: getPreviewUrlForDraftImage(image),
    };
}
function getPreviewUrlForDraftImage(image) {
    if (image.remoteUrl) {
        return image.remoteUrl;
    }
    if (!image.localPath) {
        return null;
    }
    const normalizedLocalPath = normalizeSlashes(image.localPath);
    const uploadsRoot = normalizeSlashes(path_1.default.resolve(process.cwd(), "uploads"));
    if (!normalizedLocalPath.startsWith(uploadsRoot)) {
        return null;
    }
    const relativePath = normalizedLocalPath
        .slice(uploadsRoot.length)
        .replace(/^\/+/, "");
    return `${getPublicBackendBaseUrl()}/uploads/${relativePath}`;
}
function sanitizeBase64ImageData(imageBase64) {
    const trimmed = imageBase64.trim();
    const dataUrlMatch = trimmed.match(/^data:(.+?);base64,(.+)$/);
    if (dataUrlMatch) {
        return {
            mimeTypeFromDataUrl: dataUrlMatch[1],
            rawBase64: dataUrlMatch[2],
        };
    }
    return {
        mimeTypeFromDataUrl: null,
        rawBase64: trimmed,
    };
}
async function getDraftImages(draftId, userId) {
    const draft = await prisma_1.prisma.draft.findFirst({
        where: {
            id: draftId,
            userId,
        },
        include: {
            images: {
                orderBy: {
                    createdAt: "desc",
                },
            },
        },
    });
    if (!draft) {
        throw new Error("Draft not found");
    }
    return draft.images.map(mapDraftImageWithPreviewUrl);
}
async function createDraftImage(input) {
    const draft = await prisma_1.prisma.draft.findFirst({
        where: {
            id: input.draftId,
            userId: input.userId,
        },
    });
    if (!draft) {
        throw new Error("Draft not found");
    }
    const image = await prisma_1.prisma.draftImage.create({
        data: {
            draftId: input.draftId,
            sourceType: input.sourceType,
            localPath: input.localPath ?? null,
            altText: input.altText?.trim() || null,
            caption: input.caption?.trim() || null,
            positionMarker: input.positionMarker?.trim() || null,
        },
    });
    return mapDraftImageWithPreviewUrl(image);
}
async function saveGeneratedDraftImage(input) {
    const draft = await prisma_1.prisma.draft.findFirst({
        where: {
            id: input.draftId,
            userId: input.userId,
        },
    });
    if (!draft) {
        throw new Error("Draft not found");
    }
    const { mimeTypeFromDataUrl, rawBase64 } = sanitizeBase64ImageData(input.imageBase64);
    const effectiveMimeType = mimeTypeFromDataUrl || input.mimeType;
    const extension = getExtensionFromMimeType(effectiveMimeType);
    if (!extension) {
        throw new Error("Unsupported image mime type");
    }
    let fileBuffer;
    try {
        fileBuffer = Buffer.from(rawBase64, "base64");
    }
    catch {
        throw new Error("Invalid base64 image data");
    }
    if (!fileBuffer || fileBuffer.length === 0) {
        throw new Error("Invalid base64 image data");
    }
    const uploadsDir = path_1.default.resolve(process.cwd(), "uploads", "generated");
    await fs_1.default.promises.mkdir(uploadsDir, { recursive: true });
    const fileName = `draft-${draft.id}-${Date.now()}-${(0, crypto_1.randomBytes)(6).toString("hex")}.${extension}`;
    const localPath = path_1.default.join(uploadsDir, fileName);
    await fs_1.default.promises.writeFile(localPath, fileBuffer);
    const image = await prisma_1.prisma.draftImage.create({
        data: {
            draftId: draft.id,
            sourceType: client_1.ImageSourceType.GENERATED,
            localPath,
            altText: input.altText ?? null,
            caption: input.caption ?? null,
            positionMarker: input.positionMarker ?? null,
        },
    });
    return {
        ...mapDraftImageWithPreviewUrl(image),
        generationMeta: {
            mimeType: effectiveMimeType,
            prompt: input.prompt ?? null,
            revisedPrompt: input.revisedPrompt ?? null,
        },
    };
}
async function uploadDraftImageToWp(input) {
    const draft = await prisma_1.prisma.draft.findFirst({
        where: {
            id: input.draftId,
            userId: input.userId,
        },
        include: {
            defaultSite: true,
        },
    });
    if (!draft) {
        throw new Error("Draft not found");
    }
    const image = await prisma_1.prisma.draftImage.findFirst({
        where: {
            id: input.imageId,
            draftId: input.draftId,
        },
    });
    if (!image) {
        throw new Error("Draft image not found");
    }
    if (!image.localPath) {
        throw new Error("Draft image local file path is missing");
    }
    const resolvedSiteId = input.siteId ?? draft.defaultSiteId;
    if (!resolvedSiteId) {
        throw new Error("No target site selected");
    }
    const site = await prisma_1.prisma.wpSite.findFirst({
        where: {
            id: resolvedSiteId,
            userId: input.userId,
        },
    });
    if (!site) {
        throw new Error("Target site not found");
    }
    const absolutePath = path_1.default.resolve(image.localPath);
    if (!fs_1.default.existsSync(absolutePath)) {
        throw new Error("Local image file not found");
    }
    const fileBuffer = fs_1.default.readFileSync(absolutePath);
    const filename = path_1.default.basename(absolutePath);
    const ext = path_1.default.extname(filename).toLowerCase();
    let mimeType = "application/octet-stream";
    if (ext === ".jpg" || ext === ".jpeg")
        mimeType = "image/jpeg";
    if (ext === ".png")
        mimeType = "image/png";
    if (ext === ".webp")
        mimeType = "image/webp";
    if (ext === ".gif")
        mimeType = "image/gif";
    const uploadResult = await (0, wordpressService_1.uploadWpMedia)({
        siteUrl: site.siteUrl,
        wpUsername: site.wpUsername,
        wpApplicationPassword: (0, crypto_2.decrypt)(site.wpApplicationPasswordEncrypted),
        fileBuffer,
        filename,
        mimeType,
        altText: image.altText,
        caption: image.caption,
    });
    if (!uploadResult.success) {
        throw new Error(uploadResult.message);
    }
    const updatedImage = await prisma_1.prisma.draftImage.update({
        where: { id: image.id },
        data: {
            remoteUrl: uploadResult.sourceUrl ?? null,
            wpMediaId: uploadResult.wpMediaId ?? null,
        },
    });
    return mapDraftImageWithPreviewUrl(updatedImage);
}
async function insertDraftImage(input) {
    const draft = await prisma_1.prisma.draft.findFirst({
        where: {
            id: input.draftId,
            userId: input.userId,
        },
    });
    if (!draft) {
        throw new Error("Draft not found");
    }
    const image = await prisma_1.prisma.draftImage.findFirst({
        where: {
            id: input.imageId,
            draftId: input.draftId,
        },
    });
    if (!image) {
        throw new Error("Draft image not found");
    }
    if (!image.remoteUrl) {
        throw new Error("Draft image is not uploaded to WordPress yet");
    }
    const imageHtml = (0, imageBlock_1.buildImageHtmlBlock)({
        remoteUrl: image.remoteUrl,
        altText: image.altText,
        caption: image.caption,
    });
    let updatedHtml = draft.contentHtml;
    switch (input.insertType) {
        case client_1.ImageInsertType.END_OF_ARTICLE:
            updatedHtml = (0, htmlInsert_1.insertAtEndOfArticle)(draft.contentHtml, imageHtml);
            break;
        case client_1.ImageInsertType.AFTER_HEADING:
            if (!input.targetHeadingText) {
                throw new Error("targetHeadingText is required for AFTER_HEADING");
            }
            updatedHtml = (0, htmlInsert_1.insertAfterHeading)(draft.contentHtml, input.targetHeadingText, input.targetHeadingLevel ?? null, imageHtml);
            break;
        case client_1.ImageInsertType.INSIDE_SECTION_START:
            if (!input.targetHeadingText) {
                throw new Error("targetHeadingText is required for INSIDE_SECTION_START");
            }
            updatedHtml = (0, htmlInsert_1.insertInsideSectionStart)({
                contentHtml: draft.contentHtml,
                targetHeadingText: input.targetHeadingText,
                targetHeadingLevel: input.targetHeadingLevel ?? null,
                imageHtml,
            });
            break;
        case client_1.ImageInsertType.INSIDE_SECTION_END:
            if (!input.targetHeadingText) {
                throw new Error("targetHeadingText is required for INSIDE_SECTION_END");
            }
            updatedHtml = (0, htmlInsert_1.insertInsideSectionEnd)({
                contentHtml: draft.contentHtml,
                targetHeadingText: input.targetHeadingText,
                targetHeadingLevel: input.targetHeadingLevel ?? null,
                imageHtml,
            });
            break;
        case client_1.ImageInsertType.AFTER_PARAGRAPH_IN_SECTION:
            if (!input.targetHeadingText) {
                throw new Error("targetHeadingText is required for AFTER_PARAGRAPH_IN_SECTION");
            }
            if (input.paragraphIndexInSection === null ||
                input.paragraphIndexInSection === undefined ||
                input.paragraphIndexInSection < 1) {
                throw new Error("paragraphIndexInSection must be a positive integer for AFTER_PARAGRAPH_IN_SECTION");
            }
            updatedHtml = (0, htmlInsert_1.insertAfterParagraphInSection)({
                contentHtml: draft.contentHtml,
                targetHeadingText: input.targetHeadingText,
                targetHeadingLevel: input.targetHeadingLevel ?? null,
                paragraphIndexInSection: input.paragraphIndexInSection,
                imageHtml,
            });
            break;
        default:
            throw new Error("Insert type not implemented yet");
    }
    await prisma_1.prisma.draft.update({
        where: { id: draft.id },
        data: {
            contentHtml: updatedHtml,
        },
    });
    const updatedImage = await prisma_1.prisma.draftImage.update({
        where: { id: image.id },
        data: {
            insertType: input.insertType,
            targetHeadingText: input.targetHeadingText ?? null,
            targetHeadingLevel: input.targetHeadingLevel ?? null,
            paragraphIndexInSection: input.paragraphIndexInSection ?? null,
            isInserted: true,
        },
    });
    return {
        image: mapDraftImageWithPreviewUrl(updatedImage),
        contentHtml: updatedHtml,
    };
}
async function updateDraftImage(input) {
    const draft = await prisma_1.prisma.draft.findFirst({
        where: {
            id: input.draftId,
            userId: input.userId,
        },
    });
    if (!draft) {
        throw new Error('Draft not found');
    }
    const image = await prisma_1.prisma.draftImage.findFirst({
        where: {
            id: input.imageId,
            draftId: input.draftId,
        },
    });
    if (!image) {
        throw new Error('Draft image not found');
    }
    const updatedImage = await prisma_1.prisma.draftImage.update({
        where: { id: image.id },
        data: {
            altText: input.altText !== undefined ? input.altText?.trim() || null : undefined,
            caption: input.caption !== undefined ? input.caption?.trim() || null : undefined,
            positionMarker: input.positionMarker !== undefined
                ? input.positionMarker?.trim() || null
                : undefined,
        },
    });
    if (updatedImage.wpMediaId && draft.defaultSiteId) {
        const site = await prisma_1.prisma.wpSite.findFirst({
            where: {
                id: draft.defaultSiteId,
                userId: input.userId,
            },
        });
        if (!site) {
            throw new Error('Target site not found for WordPress media sync');
        }
        const remoteUpdate = await (0, wordpressService_1.updateWpMediaMeta)({
            siteUrl: site.siteUrl,
            wpUsername: site.wpUsername,
            wpApplicationPassword: (0, crypto_2.decrypt)(site.wpApplicationPasswordEncrypted),
            wpMediaId: updatedImage.wpMediaId,
            altText: input.altText !== undefined ? updatedImage.altText : undefined,
            caption: input.caption !== undefined ? updatedImage.caption : undefined,
        });
        if (!remoteUpdate.success) {
            throw new Error(remoteUpdate.message);
        }
    }
    return mapDraftImageWithPreviewUrl(updatedImage);
}
async function deleteDraftImage(input) {
    const draft = await prisma_1.prisma.draft.findFirst({
        where: {
            id: input.draftId,
            userId: input.userId,
        },
    });
    if (!draft) {
        throw new Error('Draft not found');
    }
    const image = await prisma_1.prisma.draftImage.findFirst({
        where: {
            id: input.imageId,
            draftId: input.draftId,
        },
    });
    if (!image) {
        throw new Error('Draft image not found');
    }
    const wasFeaturedImage = draft.featuredImageId === image.id;
    if (wasFeaturedImage) {
        await prisma_1.prisma.draft.update({
            where: { id: draft.id },
            data: {
                featuredImageId: null,
                featuredImageUrl: null,
                featuredImageAlt: null,
            },
        });
    }
    if (image.localPath) {
        try {
            const absolutePath = path_1.default.resolve(image.localPath);
            if (fs_1.default.existsSync(absolutePath)) {
                await fs_1.default.promises.unlink(absolutePath);
            }
        }
        catch {
            // ignore local file delete errors
        }
    }
    await prisma_1.prisma.draftImage.delete({
        where: { id: image.id },
    });
    return {
        id: image.id,
        draftId: draft.id,
        deleted: true,
        wasFeaturedImage,
    };
}
async function setDraftFeaturedImage(draftId, imageId, userId) {
    const draft = await prisma_1.prisma.draft.findFirst({
        where: {
            id: draftId,
            userId,
        },
    });
    if (!draft) {
        throw new Error("Draft not found");
    }
    const image = await prisma_1.prisma.draftImage.findFirst({
        where: {
            id: imageId,
            draftId,
        },
    });
    if (!image) {
        throw new Error("Draft image not found");
    }
    return prisma_1.prisma.draft.update({
        where: { id: draftId },
        data: {
            featuredImageId: image.id,
            featuredImageUrl: getPreviewUrlForDraftImage(image),
            featuredImageAlt: image.altText ?? null,
        },
        include: {
            featuredImage: true,
            images: true,
        },
    });
}
