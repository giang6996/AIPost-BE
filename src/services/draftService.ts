import { DraftStatus } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { decrypt } from '../utils/crypto'
import { getWpCategories, getWpTags} from './wordpressService'
import fs from 'fs'
import path from 'path'

export type CreateDraftInput = {
  userId: number
  defaultSiteId?: number | null
  title: string
  slug?: string | null
  excerpt?: string | null
  contentHtml: string
  featuredImageUrl?: string | null
  featuredImageAlt?: string | null
}

export type UpdateDraftInput = {
  defaultSiteId?: number | null
  title?: string
  slug?: string | null
  excerpt?: string | null
  contentHtml?: string
  featuredImageUrl?: string | null
  featuredImageAlt?: string | null
  status?: DraftStatus
}

type DeleteDraftInput = {
  draftId: number
  userId: number
  siteId?: number
  syncRemote?: boolean
  force?: boolean
  deleteLocalDraft?: boolean
}

export type UpdateDraftSeoInput = {
  seoTitle?: string | null
  metaDescription?: string | null
  focusKeyword?: string | null
  canonicalUrl?: string | null
  ogTitle?: string | null
  ogDescription?: string | null
  ogImageUrl?: string | null
}

type ReplaceDraftCategoriesInput = {
  siteId?: number | null
  categoryIds: number[]
}

type ReplaceDraftTagsInput = {
  siteId?: number | null
  tagIds: number[]
}

export async function getAllDrafts(userId: number) {
  return prisma.draft.findMany({
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
  })
}

export async function getDraftById(id: number, userId: number) {
  return prisma.draft.findFirst({
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
  })
}

export async function createDraft(input: CreateDraftInput) {
  if (!input.userId) {
    throw new Error('Local app userId is required to create a draft')
  }

  return prisma.draft.create({
    data: {
      userId: input.userId,
      defaultSiteId: input.defaultSiteId ?? null,
      title: input.title.trim(),
      slug: input.slug?.trim() || null,
      excerpt: input.excerpt?.trim() || null,
      contentHtml: input.contentHtml,
      featuredImageUrl: input.featuredImageUrl?.trim() || null,
      featuredImageAlt: input.featuredImageAlt?.trim() || null,
      status: DraftStatus.DRAFT,
    },
    include: {
      defaultSite: true,
      seoMeta: true,
      categories: true,
      tags: true,
    },
  })
}

export async function updateDraft(
  id: number,
  userId: number,
  input: UpdateDraftInput
) {
  const existingDraft = await prisma.draft.findFirst({
    where: {
      id,
      userId,
    },
  })

  if (!existingDraft) {
    throw new Error('Draft not found')
  }

  return prisma.draft.update({
    where: { id },
    data: {
      defaultSiteId:
        input.defaultSiteId !== undefined ? input.defaultSiteId : undefined,
      title: input.title !== undefined ? input.title.trim() : undefined,
      slug: input.slug !== undefined ? input.slug?.trim() || null : undefined,
      excerpt:
        input.excerpt !== undefined ? input.excerpt?.trim() || null : undefined,
      contentHtml:
        input.contentHtml !== undefined ? input.contentHtml : undefined,
      featuredImageUrl:
        input.featuredImageUrl !== undefined
          ? input.featuredImageUrl?.trim() || null
          : undefined,
      featuredImageAlt:
        input.featuredImageAlt !== undefined
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
  })
}

export async function deleteDraft(draftId: number, userId: number) {
  const draft = await prisma.draft.findFirst({
    where: {
      id: draftId,
      userId,
    },
    include: {
      images: true,
    },
  })

  if (!draft) {
    throw new Error('Draft not found')
  }

  const localPaths = draft.images
    .map((image) => image.localPath)
    .filter((localPath): localPath is string => typeof localPath === 'string')

  await prisma.draft.delete({
    where: {
      id: draft.id,
    },
  })

  if (localPaths.length > 0) {
    await Promise.all(
      localPaths.map(async (localPath) => {
        try {
          const absolutePath = path.resolve(localPath)
          if (fs.existsSync(absolutePath)) {
            await fs.promises.unlink(absolutePath)
          }
        } catch {
          // ignore local file delete errors
        }
      })
    )
  }

  return {
    id: draft.id,
  }
}

export async function getDraftCategories(draftId: number, userId: number) {
  const draft = await prisma.draft.findFirst({
    where: {
      id: draftId,
      userId,
    },
  })

  if (!draft) {
    throw new Error('Draft not found')
  }

  return prisma.draftCategory.findMany({
    where: { draftId },
    orderBy: { categoryName: 'asc' },
  })
}

export async function replaceDraftCategories(
  draftId: number,
  userId: number,
  input: ReplaceDraftCategoriesInput
) {
  const draft = await prisma.draft.findFirst({
    where: {
      id: draftId,
      userId,
    },
    include: {
      defaultSite: true,
    },
  })

  if (!draft) {
    throw new Error('Draft not found')
  }

  const resolvedSiteId = input.siteId ?? draft.defaultSiteId

  if (!resolvedSiteId) {
    throw new Error('No target site selected')
  }

  const site = await prisma.wpSite.findFirst({
    where: {
      id: resolvedSiteId,
      userId,
    },
  })

  if (!site) {
    throw new Error('Target site not found')
  }

  const normalizedCategoryIds = Array.isArray(input.categoryIds)
    ? [...new Set(input.categoryIds.filter((value) => Number.isInteger(value) && value > 0))]
    : []

  const wpCategoriesResult = await getWpCategories({
    siteUrl: site.siteUrl,
    wpUsername: site.wpUsername,
    wpApplicationPassword: decrypt(site.wpApplicationPasswordEncrypted),
  })

  if (!wpCategoriesResult.success) {
    throw new Error(wpCategoriesResult.message)
  }

  const availableCategories = wpCategoriesResult.categories ?? []
  const availableMap = new Map(
    availableCategories.map((category) => [category.id, category])
  )

  const invalidCategoryIds = normalizedCategoryIds.filter(
    (categoryId) => !availableMap.has(categoryId)
  )

  if (invalidCategoryIds.length > 0) {
    throw new Error(`Invalid category ids for target site: ${invalidCategoryIds.join(', ')}`)
  }

  await prisma.$transaction(async (tx) => {
    await tx.draftCategory.deleteMany({
      where: { draftId },
    })

    if (normalizedCategoryIds.length > 0) {
      await tx.draftCategory.createMany({
        data: normalizedCategoryIds.map((categoryId) => {
          const category = availableMap.get(categoryId)!

          return {
            draftId,
            siteId: resolvedSiteId,
            wpCategoryId: category.id,
            categoryName: category.name,
            slug: category.slug ?? null,
          }
        }),
      })
    }

    if (!draft.defaultSiteId && input.siteId) {
      await tx.draft.update({
        where: { id: draftId },
        data: {
          defaultSiteId: resolvedSiteId,
        },
      })
    }
  })

  return prisma.draft.findFirst({
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
  })
}

export async function getDraftTags(draftId: number, userId: number) {
  const draft = await prisma.draft.findFirst({
    where: {
      id: draftId,
      userId,
    },
  })

  if (!draft) {
    throw new Error('Draft not found')
  }

  return prisma.draftTag.findMany({
    where: { draftId },
    orderBy: { tagName: 'asc' },
  })
}

export async function replaceDraftTags(
  draftId: number,
  userId: number,
  input: ReplaceDraftTagsInput
) {
  const draft = await prisma.draft.findFirst({
    where: {
      id: draftId,
      userId,
    },
    include: {
      defaultSite: true,
    },
  })

  if (!draft) {
    throw new Error('Draft not found')
  }

  const resolvedSiteId = input.siteId ?? draft.defaultSiteId

  if (!resolvedSiteId) {
    throw new Error('No target site selected')
  }

  const site = await prisma.wpSite.findFirst({
    where: {
      id: resolvedSiteId,
      userId,
    },
  })

  if (!site) {
    throw new Error('Target site not found')
  }

  const normalizedTagIds = Array.isArray(input.tagIds)
    ? [...new Set(input.tagIds.filter((value) => Number.isInteger(value) && value > 0))]
    : []

  const wpTagsResult = await getWpTags({
    siteUrl: site.siteUrl,
    wpUsername: site.wpUsername,
    wpApplicationPassword: decrypt(site.wpApplicationPasswordEncrypted),
  })

  if (!wpTagsResult.success) {
    throw new Error(wpTagsResult.message)
  }

  const availableTags = wpTagsResult.tags ?? []
  const availableMap = new Map(
    availableTags.map((tag) => [tag.id, tag])
  )

  const invalidTagIds = normalizedTagIds.filter(
    (tagId) => !availableMap.has(tagId)
  )

  if (invalidTagIds.length > 0) {
    throw new Error(`Invalid tag ids for target site: ${invalidTagIds.join(', ')}`)
  }

  await prisma.$transaction(async (tx) => {
    await tx.draftTag.deleteMany({
      where: { draftId },
    })

    if (normalizedTagIds.length > 0) {
      await tx.draftTag.createMany({
        data: normalizedTagIds.map((tagId) => {
          const tag = availableMap.get(tagId)!

          return {
            draftId,
            siteId: resolvedSiteId,
            wpTagId: tag.id,
            tagName: tag.name,
            slug: tag.slug ?? null,
          }
        }),
      })
    }

    if (!draft.defaultSiteId && input.siteId) {
      await tx.draft.update({
        where: { id: draftId },
        data: {
          defaultSiteId: resolvedSiteId,
        },
      })
    }
  })

  return prisma.draft.findFirst({
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
  })
}

export async function upsertDraftSeoMeta(
  draftId: number,
  userId: number,
  input: UpdateDraftSeoInput
) {
  const existingDraft = await prisma.draft.findFirst({
    where: {
      id: draftId,
      userId,
    },
  })

  if (!existingDraft) {
    throw new Error('Draft not found')
  }

  return prisma.draftSeoMeta.upsert({
    where: { draftId },
    update: {
      seoTitle:
        input.seoTitle !== undefined ? input.seoTitle?.trim() || null : undefined,
      metaDescription:
        input.metaDescription !== undefined
          ? input.metaDescription?.trim() || null
          : undefined,
      canonicalUrl:
        input.canonicalUrl !== undefined
          ? input.canonicalUrl?.trim() || null
          : undefined,
      focusKeyword:
        input.focusKeyword !== undefined
          ? input.focusKeyword?.trim() || null
          : undefined,
      ogTitle:
        input.ogTitle !== undefined ? input.ogTitle?.trim() || null : undefined,
      ogDescription:
        input.ogDescription !== undefined
          ? input.ogDescription?.trim() || null
          : undefined,
      ogImageUrl:
        input.ogImageUrl !== undefined
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
  })
}

export async function getDraftSeoMeta(draftId: number, userId: number) {
  const draft = await prisma.draft.findFirst({
    where: {
      id: draftId,
      userId,
    },
    include: {
      seoMeta: true,
    },
  })

  if (!draft) {
    throw new Error('Draft not found')
  }

  return draft.seoMeta
}
