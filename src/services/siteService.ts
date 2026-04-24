import { SiteStatus }  from '@prisma/client'
import { prisma } from '../lib/prisma'
import { encrypt, decrypt } from '../utils/crypto'
import { testWpConnection, getWpCategories, getWpTags, createWpCategory, createWpTag, updateWpCategory, updateWpTag } from './wordpressService'

// Note that Prisma exposes model in camelCase here
type CreateSiteInput = {
  userId: number
  siteName: string
  siteUrl: string
  wpUsername: string
  wpApplicationPassword: string
  snippetEnabled?: boolean
}

type UpdateSiteInput = {
  siteName?: string
  siteUrl?: string
  wpUsername?: string
  wpApplicationPassword?: string
  snippetEnabled?: boolean
}

type SaveSiteTermInput = {
  name?: string
  slug?: string
  description?: string
}

function normalizeSiteUrl(siteUrl: string): string {
  return siteUrl.trim().replace(/\/+$/, '')
}

export async function getAllSites(userId: number) {
  return prisma.wpSite.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  })
}

async function getOwnedSiteOrThrow(siteId: number, userId: number) {
  const site = await prisma.wpSite.findFirst({
    where: {
      id: siteId,
      userId,
    },
  })

  if (!site) {
    throw new Error('Site not found')
  }

  return site
}

export async function createSite(input: CreateSiteInput) {
  const connectionResult = await testWpConnection({
    siteUrl: input.siteUrl,
    wpUsername: input.wpUsername,
    wpApplicationPassword: input.wpApplicationPassword,
  })

  if (!connectionResult.success) {
    throw new Error(connectionResult.message)
  }

  return prisma.wpSite.create({
    data: {
      userId: input.userId,
      siteName: input.siteName.trim(),
      siteUrl: normalizeSiteUrl(input.siteUrl),
      wpUsername: input.wpUsername.trim(),
      wpApplicationPasswordEncrypted: encrypt(input.wpApplicationPassword),
      snippetEnabled: input.snippetEnabled ?? false,
      status: SiteStatus.ACTIVE,
    },
  })
}

export async function updateSite(
  siteId: number,
  userId: number,
  input: UpdateSiteInput
) {
  const site = await prisma.wpSite.findFirst({
    where: {
      id: siteId,
      userId,
    },
  })

  if (!site) {
    throw new Error('Site not found')
  }

  const nextSiteName = input.siteName ?? site.siteName
  const nextSiteUrl = input.siteUrl ?? site.siteUrl
  const nextWpUsername = input.wpUsername ?? site.wpUsername
  const nextSnippetEnabled = input.snippetEnabled ?? site.snippetEnabled

  const passwordWasProvided =
    typeof input.wpApplicationPassword === 'string' &&
    input.wpApplicationPassword.trim().length > 0

  const nextWpApplicationPassword = passwordWasProvided
    ? input.wpApplicationPassword!.trim()
    : decrypt(site.wpApplicationPasswordEncrypted)

  const connectionSensitiveChanged =
    nextSiteUrl !== site.siteUrl ||
    nextWpUsername !== site.wpUsername ||
    passwordWasProvided

  if (connectionSensitiveChanged) {
    const connectionResult = await testWpConnection({
      siteUrl: nextSiteUrl,
      wpUsername: nextWpUsername,
      wpApplicationPassword: nextWpApplicationPassword,
    })

    if (!connectionResult.success) {
      throw new Error(connectionResult.message)
    }
  }

  const updatedSite = await prisma.wpSite.update({
    where: {
      id: site.id,
    },
    data: {
      siteName: nextSiteName,
      siteUrl: nextSiteUrl,
      wpUsername: nextWpUsername,
      wpApplicationPasswordEncrypted: passwordWasProvided
        ? encrypt(nextWpApplicationPassword)
        : site.wpApplicationPasswordEncrypted,
      snippetEnabled: nextSnippetEnabled,
    },
  })

  return updatedSite
}

export async function deleteSite(siteId: number, userId: number) {
  const site = await prisma.wpSite.findFirst({
    where: {
      id: siteId,
      userId,
    },
  })

  if (!site) {
    throw new Error('Site not found')
  }

  await prisma.wpSite.delete({
    where: {
      id: site.id,
    },
  })

  return {
    id: site.id,
  }
}

export async function testSiteConnectionOnly(input: {
  siteUrl: string
  wpUsername: string
  wpApplicationPassword: string
}) {
  return testWpConnection(input)
}

export async function getSiteCategories(siteId: number, userId: number) {
  const site = await prisma.wpSite.findFirst({
    where: {
      id: siteId,
      userId,
    },
  })

  if (!site) {
    throw new Error('Site not found')
  }

  const result = await getWpCategories({
    siteUrl: site.siteUrl,
    wpUsername: site.wpUsername,
    wpApplicationPassword: decrypt(site.wpApplicationPasswordEncrypted),
  })

  if (!result.success) {
    throw new Error(result.message)
  }

  return result.categories ?? []
}

export async function getSiteTags(siteId: number, userId: number) {
  const site = await prisma.wpSite.findFirst({
    where: {
      id: siteId,
      userId,
    },
  })

  if (!site) {
    throw new Error('Site not found')
  }

  const result = await getWpTags({
    siteUrl: site.siteUrl,
    wpUsername: site.wpUsername,
    wpApplicationPassword: decrypt(site.wpApplicationPasswordEncrypted),
  })

  if (!result.success) {
    throw new Error(result.message)
  }

  return result.tags ?? []
}

export async function createSiteCategory(
  siteId: number,
  userId: number,
  input: SaveSiteTermInput
) {
  const site = await getOwnedSiteOrThrow(siteId, userId)

  const result = await createWpCategory({
    siteUrl: site.siteUrl,
    wpUsername: site.wpUsername,
    wpApplicationPassword: decrypt(site.wpApplicationPasswordEncrypted),
    name: input.name,
    slug: input.slug,
    description: input.description,
  })

  if (!result.success) {
    throw new Error(result.message)
  }

  return result.term
}

export async function updateSiteCategory(
  siteId: number,
  categoryId: number,
  userId: number,
  input: SaveSiteTermInput
) {
  const site = await getOwnedSiteOrThrow(siteId, userId)

  const result = await updateWpCategory({
    siteUrl: site.siteUrl,
    wpUsername: site.wpUsername,
    wpApplicationPassword: decrypt(site.wpApplicationPasswordEncrypted),
    termId: categoryId,
    name: input.name,
    slug: input.slug,
    description: input.description,
  })

  if (!result.success) {
    throw new Error(result.message)
  }

  return result.term
}

export async function createSiteTag(
  siteId: number,
  userId: number,
  input: SaveSiteTermInput
) {
  const site = await getOwnedSiteOrThrow(siteId, userId)

  const result = await createWpTag({
    siteUrl: site.siteUrl,
    wpUsername: site.wpUsername,
    wpApplicationPassword: decrypt(site.wpApplicationPasswordEncrypted),
    name: input.name,
    slug: input.slug,
    description: input.description,
  })

  if (!result.success) {
    throw new Error(result.message)
  }

  return result.term
}

export async function updateSiteTag(
  siteId: number,
  tagId: number,
  userId: number,
  input: SaveSiteTermInput
) {
  const site = await getOwnedSiteOrThrow(siteId, userId)

  const result = await updateWpTag({
    siteUrl: site.siteUrl,
    wpUsername: site.wpUsername,
    wpApplicationPassword: decrypt(site.wpApplicationPasswordEncrypted),
    termId: tagId,
    name: input.name,
    slug: input.slug,
    description: input.description,
  })

  if (!result.success) {
    throw new Error(result.message)
  }

  return result.term
}
