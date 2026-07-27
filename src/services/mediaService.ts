import { ImageSourceType, ImageInsertType } from "@prisma/client";
import { buildImageHtmlBlock } from "../utils/imageBlock";
import { prisma } from "../lib/prisma";
import path from "path";
import { decrypt } from "../utils/crypto";
import { uploadWpMedia, updateWpMediaMeta } from "./wordpressService";
import {
  deleteImage,
  getImagePreviewUrl,
  readImageBuffer,
  saveGeneratedImage,
} from "./mediaStorageService";
import {
  insertAfterParagraphInSection,
  insertInsideSectionEnd,
  insertInsideSectionStart,
  insertAfterHeading,
  insertAtEndOfArticle,
} from "../utils/htmlInsert";

export type CreateDraftImageInput = {
  draftId: number;
  userId: number;
  sourceType: ImageSourceType;
  storageKey?: string | null;
  altText?: string | null;
  caption?: string | null;
  positionMarker?: string | null;
};

type UploadDraftImageToWpInput = {
  draftId: number;
  imageId: number;
  userId: number;
  siteId?: number;
};

type InsertDraftImageInput = {
  draftId: number;
  imageId: number;
  userId: number;
  insertType: ImageInsertType;
  targetHeadingText?: string | null;
  targetHeadingLevel?: number | null;
  paragraphIndexInSection?: number | null;
};

type UpdateDraftImageInput = {
  draftId: number
  imageId: number
  userId: number
  altText?: string | null
  caption?: string | null
  positionMarker?: string | null
}

type DeleteDraftImageInput = {
  draftId: number
  imageId: number
  userId: number
}

type SaveGeneratedDraftImageInput = {
  draftId: number;
  userId: number;
  imageBase64: string;
  mimeType: string;
  altText?: string;
  caption?: string;
  positionMarker?: string;
  prompt?: string;
  revisedPrompt?: string;
};



function getExtensionFromMimeType(mimeType: string) {
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

function normalizeSlashes(value: string) {
  return value.replace(/\\/g, "/");
}

function mapDraftImageWithPreviewUrl<
  T extends { remoteUrl?: string | null; storageKey?: string | null },
>(image: T) {
  return {
    ...image,
    previewUrl: getPreviewUrlForDraftImage(image),
  };
}

function getPreviewUrlForDraftImage(image: {
  remoteUrl?: string | null;
  storageKey?: string | null;
}) {
  if (image.remoteUrl) {
    return image.remoteUrl;
  }

  if (!image.storageKey) {
    return null;
  }

  const normalizedStorageKey = normalizeSlashes(image.storageKey);
  const uploadsRoot = normalizeSlashes(path.resolve(process.cwd(), "uploads"));

  if (!normalizedStorageKey.startsWith(uploadsRoot)) {
    return null;
  }

  const relativePath = normalizedStorageKey
    .slice(uploadsRoot.length)
    .replace(/^\/+/, "");

  return `${getPublicBackendBaseUrl()}/uploads/${relativePath}`;
}

function sanitizeBase64ImageData(imageBase64: string) {
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

export async function getDraftImages(draftId: number, userId: number) {
  const draft = await prisma.draft.findFirst({
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

export async function createDraftImage(input: CreateDraftImageInput) {
  const draft = await prisma.draft.findFirst({
    where: {
      id: input.draftId,
      userId: input.userId,
    },
  });

  if (!draft) {
    throw new Error("Draft not found");
  }

  const image = await prisma.draftImage.create({
    data: {
      draftId: input.draftId,
      sourceType: input.sourceType,
      storageKey: input.storageKey ?? null,
      altText: input.altText?.trim() || null,
      caption: input.caption?.trim() || null,
      positionMarker: input.positionMarker?.trim() || null,
    },
  });

  return mapDraftImageWithPreviewUrl(image);
}

export async function saveGeneratedDraftImage(
  input: SaveGeneratedDraftImageInput,
) {
  const draft = await prisma.draft.findFirst({
    where: {
      id: input.draftId,
      userId: input.userId,
    },
  });

  if (!draft) {
    throw new Error("Draft not found");
  }

  const { mimeTypeFromDataUrl, rawBase64 } = sanitizeBase64ImageData(
    input.imageBase64,
  );

  const effectiveMimeType = mimeTypeFromDataUrl || input.mimeType;
  const extension = getExtensionFromMimeType(effectiveMimeType);

  if (!extension) {
    throw new Error("Unsupported image mime type");
  }

  let fileBuffer: Buffer;
  try {
    fileBuffer = Buffer.from(rawBase64, "base64");
  } catch {
    throw new Error("Invalid base64 image data");
  }

  if (!fileBuffer || fileBuffer.length === 0) {
    throw new Error("Invalid base64 image data");
  }

  const { storageKey } = await saveGeneratedImage({
    draftId: draft.id,
    buffer: fileBuffer,
    extension,
  });

  const image = await prisma.draftImage.create({
    data: {
      draftId: draft.id,
      sourceType: ImageSourceType.GENERATED,
      storageKey,
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

export async function uploadDraftImageToWp(input: UploadDraftImageToWpInput) {
  const draft = await prisma.draft.findFirst({
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

  const image = await prisma.draftImage.findFirst({
    where: {
      id: input.imageId,
      draftId: input.draftId,
    },
  });

  if (!image) {
    throw new Error("Draft image not found");
  }

  if (!image.storageKey) {
    throw new Error("Draft image storage key is missing");
  }

  const resolvedSiteId = input.siteId ?? draft.defaultSiteId;

  if (!resolvedSiteId) {
    throw new Error("No target site selected");
  }

  const site = await prisma.wpSite.findFirst({
    where: {
      id: resolvedSiteId,
      userId: input.userId,
    },
  });

  if (!site) {
    throw new Error("Target site not found");
  }

  const fileBuffer = await readImageBuffer(image.storageKey);
  const filename = path.basename(image.storageKey);
  const ext = path.extname(filename).toLowerCase();

  let mimeType = "application/octet-stream";
  if (ext === ".jpg" || ext === ".jpeg") mimeType = "image/jpeg";
  if (ext === ".png") mimeType = "image/png";
  if (ext === ".webp") mimeType = "image/webp";
  if (ext === ".gif") mimeType = "image/gif";

  const uploadResult = await uploadWpMedia({
    siteUrl: site.siteUrl,
    wpUsername: site.wpUsername,
    wpApplicationPassword: decrypt(site.wpApplicationPasswordEncrypted),
    fileBuffer,
    filename,
    mimeType,
    altText: image.altText,
    caption: image.caption,
  });

  if (!uploadResult.success) {
    throw new Error(uploadResult.message);
  }

  const updatedImage = await prisma.draftImage.update({
    where: { id: image.id },
    data: {
      remoteUrl: uploadResult.sourceUrl ?? null,
      wpMediaId: uploadResult.wpMediaId ?? null,
    },
  });

  return mapDraftImageWithPreviewUrl(updatedImage);
}

export async function insertDraftImage(input: InsertDraftImageInput) {
  const draft = await prisma.draft.findFirst({
    where: {
      id: input.draftId,
      userId: input.userId,
    },
  });

  if (!draft) {
    throw new Error("Draft not found");
  }

  const image = await prisma.draftImage.findFirst({
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

  const imageHtml = buildImageHtmlBlock({
    remoteUrl: image.remoteUrl,
    altText: image.altText,
    caption: image.caption,
  });

  let updatedHtml = draft.contentHtml;

  switch (input.insertType) {
    case ImageInsertType.END_OF_ARTICLE:
      updatedHtml = insertAtEndOfArticle(draft.contentHtml, imageHtml);
      break;

    case ImageInsertType.AFTER_HEADING:
      if (!input.targetHeadingText) {
        throw new Error("targetHeadingText is required for AFTER_HEADING");
      }

      updatedHtml = insertAfterHeading(
        draft.contentHtml,
        input.targetHeadingText,
        input.targetHeadingLevel ?? null,
        imageHtml,
      );
      break;

    case ImageInsertType.INSIDE_SECTION_START:
      if (!input.targetHeadingText) {
        throw new Error(
          "targetHeadingText is required for INSIDE_SECTION_START",
        );
      }

      updatedHtml = insertInsideSectionStart({
        contentHtml: draft.contentHtml,
        targetHeadingText: input.targetHeadingText,
        targetHeadingLevel: input.targetHeadingLevel ?? null,
        imageHtml,
      });
      break;

    case ImageInsertType.INSIDE_SECTION_END:
      if (!input.targetHeadingText) {
        throw new Error("targetHeadingText is required for INSIDE_SECTION_END");
      }

      updatedHtml = insertInsideSectionEnd({
        contentHtml: draft.contentHtml,
        targetHeadingText: input.targetHeadingText,
        targetHeadingLevel: input.targetHeadingLevel ?? null,
        imageHtml,
      });
      break;

    case ImageInsertType.AFTER_PARAGRAPH_IN_SECTION:
      if (!input.targetHeadingText) {
        throw new Error(
          "targetHeadingText is required for AFTER_PARAGRAPH_IN_SECTION",
        );
      }

      if (
        input.paragraphIndexInSection === null ||
        input.paragraphIndexInSection === undefined ||
        input.paragraphIndexInSection < 1
      ) {
        throw new Error(
          "paragraphIndexInSection must be a positive integer for AFTER_PARAGRAPH_IN_SECTION",
        );
      }

      updatedHtml = insertAfterParagraphInSection({
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

  await prisma.draft.update({
    where: { id: draft.id },
    data: {
      contentHtml: updatedHtml,
    },
  });

  const updatedImage = await prisma.draftImage.update({
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
  }
}

export async function updateDraftImage(input: UpdateDraftImageInput) {
  const draft = await prisma.draft.findFirst({
    where: {
      id: input.draftId,
      userId: input.userId,
    },
  })

  if (!draft) {
    throw new Error('Draft not found')
  }

  const image = await prisma.draftImage.findFirst({
    where: {
      id: input.imageId,
      draftId: input.draftId,
    },
  })

  if (!image) {
    throw new Error('Draft image not found')
  }

  const updatedImage = await prisma.draftImage.update({
    where: { id: image.id },
    data: {
      altText:
        input.altText !== undefined ? input.altText?.trim() || null : undefined,
      caption:
        input.caption !== undefined ? input.caption?.trim() || null : undefined,
      positionMarker:
        input.positionMarker !== undefined
          ? input.positionMarker?.trim() || null
          : undefined,
    },
  })

  if (updatedImage.wpMediaId && draft.defaultSiteId) {
    const site = await prisma.wpSite.findFirst({
      where: {
        id: draft.defaultSiteId,
        userId: input.userId,
      },
    })

    if (!site) {
      throw new Error('Target site not found for WordPress media sync')
    }

    const remoteUpdate = await updateWpMediaMeta({
      siteUrl: site.siteUrl,
      wpUsername: site.wpUsername,
      wpApplicationPassword: decrypt(site.wpApplicationPasswordEncrypted),
      wpMediaId: updatedImage.wpMediaId,
      altText:
        input.altText !== undefined ? updatedImage.altText : undefined,
      caption:
        input.caption !== undefined ? updatedImage.caption : undefined,
    })

    if (!remoteUpdate.success) {
      throw new Error(remoteUpdate.message)
    }
  }

  return mapDraftImageWithPreviewUrl(updatedImage)
}

export async function deleteDraftImage(input: DeleteDraftImageInput) {
  const draft = await prisma.draft.findFirst({
    where: {
      id: input.draftId,
      userId: input.userId,
    },
  })

  if (!draft) {
    throw new Error('Draft not found')
  }

  const image = await prisma.draftImage.findFirst({
    where: {
      id: input.imageId,
      draftId: input.draftId,
    },
  })

  if (!image) {
    throw new Error('Draft image not found')
  }

  const wasFeaturedImage = draft.featuredImageId === image.id

  if (wasFeaturedImage) {
    await prisma.draft.update({
      where: { id: draft.id },
      data: {
        featuredImageId: null,
        featuredImageUrl: null,
        featuredImageAlt: null,
      },
    })
  }

  if (image.storageKey) {
    try {
      await deleteImage(image.storageKey)
    } catch {
      // ignore local file delete errors
    }
  }

  await prisma.draftImage.delete({
    where: { id: image.id },
  })

  return {
    id: image.id,
    draftId: draft.id,
    deleted: true,
    wasFeaturedImage,
  }
}

export async function setDraftFeaturedImage(
  draftId: number,
  imageId: number,
  userId: number,
) {
  const draft = await prisma.draft.findFirst({
    where: {
      id: draftId,
      userId,
    },
  });

  if (!draft) {
    throw new Error("Draft not found");
  }

  const image = await prisma.draftImage.findFirst({
    where: {
      id: imageId,
      draftId,
    },
  });

  if (!image) {
    throw new Error("Draft image not found");
  }

  return prisma.draft.update({
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
