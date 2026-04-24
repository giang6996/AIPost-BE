import { SyncStatus } from '@prisma/client'
import { prisma } from '../lib/prisma'
import { decrypt } from '../utils/crypto'
import { publishWpPost, updateWpPost, deleteWpPost } from './wordpressService'

type PublishDraftInput = {
  draftId: number
  userId: number
  siteId?: number
  wpStatus?: 'draft' | 'publish'
}

type DeleteDraftPostSyncInput = {
  draftId: number
  userId: number
  siteId: number
  force?: boolean
}

export async function publishDraft(input: PublishDraftInput) {
  const draft = await prisma.draft.findFirst({
    where: {
      id: input.draftId,
      userId: input.userId,
    },
    include: {
      defaultSite: true,
      seoMeta: true,
      featuredImage: true,
      categories: true,
      tags: true,
      postSyncs: true,
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
      userId: input.userId,
    },
  })

  if (!site) {
    throw new Error('Target site not found')
  }

  const draftCategoryIds = draft.categories
    .filter((category) => category.siteId === site.id)
    .map((category) => category.wpCategoryId)

  const hasForeignSiteCategories = draft.categories.some(
    (category) => category.siteId !== site.id
  )

  if (
    hasForeignSiteCategories &&
    draftCategoryIds.length !== draft.categories.length
  ) {
    throw new Error(
      'Draft categories belong to a different site. Please re-select categories for the target site.'
    )
  }

  const draftTagIds = draft.tags
    .filter((tag) => tag.siteId === site.id)
    .map((tag) => tag.wpTagId)

  const hasForeignSiteTags = draft.tags.some(
    (tag) => tag.siteId !== site.id
  )

  if (hasForeignSiteTags && draftTagIds.length !== draft.tags.length) {
    throw new Error(
      'Draft tags belong to a different site. Please re-select tags for the target site.'
    )
  }

  const existingSync = draft.postSyncs.find((sync) => sync.siteId === site.id)

  const seoMeta = draft.seoMeta
    ? {
        seoTitle: draft.seoMeta.seoTitle,
        metaDescription: draft.seoMeta.metaDescription,
        canonicalUrl: draft.seoMeta.canonicalUrl,
        focusKeyword: draft.seoMeta.focusKeyword,
        ogTitle: draft.seoMeta.ogTitle,
        ogDescription: draft.seoMeta.ogDescription,
        ogImageUrl: draft.seoMeta.ogImageUrl,
      }
    : null

  const wpAuth = {
    siteUrl: site.siteUrl,
    wpUsername: site.wpUsername,
    wpApplicationPassword: decrypt(site.wpApplicationPasswordEncrypted),
  }

  const targetStatus = input.wpStatus ?? 'draft'

  const publishResult =
    existingSync?.wpPostId
      ? await updateWpPost({
          ...wpAuth,
          wpPostId: existingSync.wpPostId,
          title: draft.title,
          contentHtml: draft.contentHtml,
          excerpt: draft.excerpt,
          slug: draft.slug,
          status: targetStatus,
          featuredMediaId: draft.featuredImage?.wpMediaId ?? null,
          categoryIds: draftCategoryIds,
          tagIds: draftTagIds,
          seoMeta,
        })
      : await publishWpPost({
          ...wpAuth,
          title: draft.title,
          contentHtml: draft.contentHtml,
          excerpt: draft.excerpt,
          slug: draft.slug,
          status: targetStatus,
          featuredMediaId: draft.featuredImage?.wpMediaId ?? null,
          categoryIds: draftCategoryIds,
          tagIds: draftTagIds,
          seoMeta,
        })

  if (!publishResult.success) {
    await prisma.wpPostSync.upsert({
      where: {
        draftId_siteId: {
          draftId: draft.id,
          siteId: site.id,
        },
      },
      update: {
        syncStatus: SyncStatus.FAILED,
        syncMessage: publishResult.message,
        lastSyncedAt: new Date(),
      },
      create: {
        draftId: draft.id,
        siteId: site.id,
        syncStatus: SyncStatus.FAILED,
        syncMessage: publishResult.message,
        lastSyncedAt: new Date(),
      },
    })

    throw new Error(publishResult.message)
  }

  const sync = await prisma.wpPostSync.upsert({
    where: {
      draftId_siteId: {
        draftId: draft.id,
        siteId: site.id,
      },
    },
    update: {
      wpPostId: publishResult.wpPostId ?? null,
      wpPostUrl: publishResult.wpPostUrl ?? null,
      syncStatus:
        targetStatus === 'publish'
          ? SyncStatus.PUBLISHED
          : SyncStatus.DRAFT,
      syncMessage: existingSync?.wpPostId
        ? 'WordPress post updated successfully'
        : publishResult.message,
      lastSyncedAt: new Date(),
    },
    create: {
      draftId: draft.id,
      siteId: site.id,
      wpPostId: publishResult.wpPostId ?? null,
      wpPostUrl: publishResult.wpPostUrl ?? null,
      syncStatus:
        targetStatus === 'publish'
          ? SyncStatus.PUBLISHED
          : SyncStatus.DRAFT,
      syncMessage: publishResult.message,
      lastSyncedAt: new Date(),
    },
  })

  return {
    draft,
    site,
    sync,
    publishResult,
    action: existingSync?.wpPostId ? 'updated' : 'created',
  }
}

export async function deleteDraftSync(
  input: DeleteDraftPostSyncInput
) {
  const draft = await prisma.draft.findFirst({
    where: {
      id: input.draftId,
      userId: input.userId,
    },
    include: {
      postSyncs: true,
    },
  })

  if (!draft) {
    throw new Error('Draft not found')
  }

  const site = await prisma.wpSite.findFirst({
    where: {
      id: input.siteId,
      userId: input.userId,
    },
  })

  if (!site) {
    throw new Error('Target site not found')
  }

  const sync = draft.postSyncs.find((item) => item.siteId === site.id)

  if (!sync) {
    throw new Error('No synced post found for this draft and site')
  }

  if (!sync.wpPostId) {
    throw new Error('Synced post has no WordPress post id')
  }

  const deleteResult = await deleteWpPost({
    siteUrl: site.siteUrl,
    wpUsername: site.wpUsername,
    wpApplicationPassword: decrypt(site.wpApplicationPasswordEncrypted),
    wpPostId: sync.wpPostId,
    force: input.force ?? false,
  })

  if (!deleteResult.success) {
    await prisma.wpPostSync.update({
      where: {
        draftId_siteId: {
          draftId: draft.id,
          siteId: site.id,
        },
      },
      data: {
        syncStatus: SyncStatus.FAILED,
        syncMessage: deleteResult.message,
        lastSyncedAt: new Date(),
      },
    })

    throw new Error(deleteResult.message)
  }

  await prisma.wpPostSync.delete({
    where: {
      draftId_siteId: {
        draftId: draft.id,
        siteId: site.id,
      },
    },
  })

  return {
    draftId: draft.id,
    siteId: site.id,
    wpPostId: sync.wpPostId,
    action: input.force ? 'deleted' : 'trashed',
    message: deleteResult.message,
  }
}