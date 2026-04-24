type TestWpConnectionInput = {
  siteUrl: string
  wpUsername: string
  wpApplicationPassword: string
}

type TestWpConnectionResult = {
  success: boolean
  siteName?: string
  user?: {
    id?: number
    name?: string
    slug?: string
  }
  message: string
}

type PublishPostInput = {
  siteUrl: string
  wpUsername: string
  wpApplicationPassword: string
  title: string
  contentHtml: string
  excerpt?: string | null
  slug?: string | null
  status?: 'draft' | 'publish'
  seoMeta?: PublishSeoMetaInput | null
  featuredMediaId?: number | null
  categoryIds?: number[]
  tagIds?: number[]
}

type PublishPostResult = {
  success: boolean
  wpPostId?: number
  wpPostUrl?: string
  raw?: unknown
  message: string
}

type GetWpCategoriesInput = {
  siteUrl: string
  wpUsername: string
  wpApplicationPassword: string
}

type WpCategoryItem = {
  id: number
  name: string
  slug: string
  count?: number
}

type GetWpCategoriesResult = {
  success: boolean
  categories?: WpCategoryItem[]
  raw?: unknown
  message: string
}

type GetWpTagsInput = {
  siteUrl: string
  wpUsername: string
  wpApplicationPassword: string
}

type WpTagItem = {
  id: number
  name: string
  slug: string
  count?: number
}

type GetWpTagsResult = {
  success: boolean
  tags?: WpTagItem[]
  raw?: unknown
  message: string
}

type UploadWpMediaInput = {
  siteUrl: string
  wpUsername: string
  wpApplicationPassword: string
  fileBuffer: Buffer
  filename: string
  mimeType: string
  altText?: string | null
  caption?: string | null
}

type UploadWpMediaResult = {
  success: boolean
  wpMediaId?: number
  sourceUrl?: string
  raw?: unknown
  message: string
}

type PublishSeoMetaInput = {
  seoTitle?: string | null
  metaDescription?: string | null
  canonicalUrl?: string | null
  focusKeyword?: string | null
  ogTitle?: string | null
  ogDescription?: string | null
  ogImageUrl?: string | null
}

type UpdateWpPostInput = {
  siteUrl: string
  wpUsername: string
  wpApplicationPassword: string
  wpPostId: number
  title?: string
  contentHtml?: string
  excerpt?: string | null
  slug?: string | null
  status?: 'draft' | 'publish'
  featuredMediaId?: number | null
  seoMeta?: PublishSeoMetaInput | null
  categoryIds?: number[]
  tagIds?: number[]
}

type DeleteWpPostInput = {
  siteUrl: string
  wpUsername: string
  wpApplicationPassword: string
  wpPostId: number
  force?: boolean
}

type DeleteWpPostResult = {
  success: boolean
  message: string
  raw?: unknown
}

type UpdateWpMediaMetaInput = {
  siteUrl: string
  wpUsername: string
  wpApplicationPassword: string
  wpMediaId: number
  altText?: string | null
  caption?: string | null
}

type UpdateWpMediaMetaResult = {
  success: boolean
  message: string
  raw?: unknown
}


type CreateOrUpdateWpTermInput = {
  siteUrl: string
  wpUsername: string
  wpApplicationPassword: string
  termId?: number
  name?: string
  slug?: string
  description?: string
}

type WpTermItem = {
  id: number
  name: string
  slug: string
  description?: string
  count?: number
}

type WpTermResult = {
  success: boolean
  term?: WpTermItem
  raw?: unknown
  message: string
}


function normalizeSiteUrl(siteUrl: string): string {
  return siteUrl.trim().replace(/\/+$/, '')
}

export async function uploadWpMedia(
  input: UploadWpMediaInput
): Promise<UploadWpMediaResult> {
  const baseUrl = normalizeSiteUrl(input.siteUrl)

  const authToken = Buffer.from(
    `${input.wpUsername}:${input.wpApplicationPassword}`
  ).toString('base64')

  const response = await fetch(`${baseUrl}/wp-json/wp/v2/media`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${authToken}`,
      'Content-Type': input.mimeType,
      'Content-Disposition': `attachment; filename="${input.filename}"`,
    },
    body: new Uint8Array(input.fileBuffer),
  })

  if (!response.ok) {
    const errorText = await response.text()
    return {
      success: false,
      message: `WordPress media upload failed: ${response.status} ${errorText}`,
    }
  }

  const data = await response.json()

  // Optional second pass for alt text / caption
  if (input.altText || input.caption) {
    await fetch(`${baseUrl}/wp-json/wp/v2/media/${data.id}`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        alt_text: input.altText ?? '',
        caption: input.caption ?? '',
      }),
    })
  }

  return {
    success: true,
    wpMediaId: data?.id,
    sourceUrl: data?.source_url,
    raw: data,
    message: 'WordPress media upload successful',
  }
}

function buildWpMetaPayload(seoMeta?: PublishSeoMetaInput | null) {
  if (!seoMeta) {
    return {}
  }

  return {
    _ai_seo_title: seoMeta.seoTitle ?? '',
    _ai_meta_description: seoMeta.metaDescription ?? '',
    _ai_canonical: seoMeta.canonicalUrl ?? '',
    _ai_focus_keyword: seoMeta.focusKeyword ?? '',
    _ai_og_title: seoMeta.ogTitle ?? '',
    _ai_og_description: seoMeta.ogDescription ?? '',
    _ai_og_image: seoMeta.ogImageUrl ?? '',
  }
}

export async function testWpConnection(
  input: TestWpConnectionInput
): Promise<TestWpConnectionResult> {
  const { siteUrl, wpUsername, wpApplicationPassword } = input
  const baseUrl = normalizeSiteUrl(siteUrl)

  const authToken = Buffer.from(
    `${wpUsername}:${wpApplicationPassword}`
  ).toString('base64')

  const response = await fetch(`${baseUrl}/wp-json/wp/v2/users/me`, {
    method: 'GET',
    headers: {
      Authorization: `Basic ${authToken}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    return {
      success: false,
      message: `WordPress connection failed: ${response.status} ${errorText}`,
    }
  }

  const data = await response.json()

  return {
    success: true,
    siteName: baseUrl,
    user: {
      id: data?.id,
      name: data?.name,
      slug: data?.slug,
    },
    message: 'WordPress connection successful',
  }
}

export async function updateWpMediaMeta(
  input: UpdateWpMediaMetaInput
): Promise<UpdateWpMediaMetaResult> {
  const baseUrl = normalizeSiteUrl(input.siteUrl)

  const authToken = Buffer.from(
    `${input.wpUsername}:${input.wpApplicationPassword}`
  ).toString('base64')

  const payload: Record<string, unknown> = {}

  if (input.altText !== undefined) {
    payload.alt_text = input.altText
  }

  if (input.caption !== undefined) {
    payload.caption = input.caption ?? ''
  }

  const response = await fetch(
    `${baseUrl}/wp-json/wp/v2/media/${input.wpMediaId}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }
  )

  const rawText = await response.text()

  let parsed: unknown = null
  try {
    parsed = rawText ? JSON.parse(rawText) : null
  } catch {
    parsed = rawText
  }

  if (!response.ok) {
    const details =
      typeof parsed === 'object' && parsed !== null && 'message' in parsed
        ? String((parsed as { message?: unknown }).message)
        : rawText

    return {
      success: false,
      raw: parsed,
      message: `WordPress media update failed: ${response.status} ${details}`,
    }
  }

  return {
    success: true,
    raw: parsed,
    message: 'WordPress media metadata updated successfully',
  }
}

export async function publishWpPost(
  input: PublishPostInput
): Promise<PublishPostResult> {
  const baseUrl = normalizeSiteUrl(input.siteUrl)

  const authToken = Buffer.from(
    `${input.wpUsername}:${input.wpApplicationPassword}`
  ).toString('base64')

  const response = await fetch(`${baseUrl}/wp-json/wp/v2/posts`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${authToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: input.title,
      content: input.contentHtml,
      excerpt: input.excerpt ?? '',
      slug: input.slug ?? undefined,
      status: input.status ?? 'draft',
      meta: buildWpMetaPayload(input.seoMeta),
      featured_media: input.featuredMediaId ?? undefined,
      categories: input.categoryIds?.length ? input.categoryIds : undefined,
      tags: input.tagIds?.length ? input.tagIds : undefined,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    return {
      success: false,
      message: `WordPress publish failed: ${response.status} ${errorText}`,
    }
  }

  const data = await response.json()

  return {
    success: true,
    wpPostId: data?.id,
    wpPostUrl: data?.link,
    raw: data,
    message: 'WordPress publish successful',
  }
}

export async function updateWpPost(
  input: UpdateWpPostInput
) {
  const baseUrl = normalizeSiteUrl(input.siteUrl)

  const authToken = Buffer.from(
    `${input.wpUsername}:${input.wpApplicationPassword}`
  ).toString('base64')

  const payload = {
    title: input.title,
    content: input.contentHtml,
    excerpt: input.excerpt ?? undefined,
    slug: input.slug ?? undefined,
    status: input.status ?? undefined,
    featured_media: input.featuredMediaId ?? undefined,
    meta: buildWpMetaPayload(input.seoMeta),
    categories: input.categoryIds?.length ? input.categoryIds : undefined,
    tags: input.tagIds?.length ? input.tagIds : undefined,
  }

  const response = await fetch(`${baseUrl}/wp-json/wp/v2/posts/${input.wpPostId}`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${authToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errorText = await response.text()
    return {
      success: false,
      message: `WordPress update failed: ${response.status} ${errorText}`,
    }
  }

  const data = await response.json()

  return {
    success: true,
    wpPostId: data?.id,
    wpPostUrl: data?.link,
    raw: data,
    message: 'WordPress update successful',
  }
}

export async function deleteWpPost(
  input: DeleteWpPostInput
): Promise<DeleteWpPostResult> {
  const baseUrl = normalizeSiteUrl(input.siteUrl)

  const authToken = Buffer.from(
    `${input.wpUsername}:${input.wpApplicationPassword}`
  ).toString('base64')

  const response = await fetch(
    `${baseUrl}/wp-json/wp/v2/posts/${input.wpPostId}?force=${
      input.force ? 'true' : 'false'
    }`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Basic ${authToken}`,
        'Content-Type': 'application/json',
      },
    }
  )

  const rawText = await response.text()

  let parsed: unknown = null
  try {
    parsed = rawText ? JSON.parse(rawText) : null
  } catch {
    parsed = rawText
  }

  if (!response.ok) {
    const details =
      typeof parsed === 'object' && parsed !== null && 'message' in parsed
        ? String((parsed as { message?: unknown }).message)
        : rawText

    return {
      success: false,
      raw: parsed,
      message: `WordPress delete failed: ${response.status} ${details}`,
    }
  }

  return {
    success: true,
    raw: parsed,
    message: input.force
      ? 'WordPress post deleted permanently'
      : 'WordPress post moved to trash',
  }
}

export async function getWpCategories(
  input: GetWpCategoriesInput
): Promise<GetWpCategoriesResult> {
  const baseUrl = normalizeSiteUrl(input.siteUrl)

  const authToken = Buffer.from(
    `${input.wpUsername}:${input.wpApplicationPassword}`
  ).toString('base64')

  const response = await fetch(
    `${baseUrl}/wp-json/wp/v2/categories?per_page=100&_fields=id,name,slug,count`,
    {
      method: 'GET',
      headers: {
        Authorization: `Basic ${authToken}`,
        'Content-Type': 'application/json',
      },
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    return {
      success: false,
      message: `WordPress categories fetch failed: ${response.status} ${errorText}`,
    }
  }

  const data = await response.json()

  return {
    success: true,
    categories: Array.isArray(data)
      ? data.map((item) => ({
          id: item.id,
          name: item.name,
          slug: item.slug,
          count: item.count,
        }))
      : [],
    raw: data,
    message: 'WordPress categories fetched successfully',
  }
}

export async function getWpTags(
  input: GetWpTagsInput
): Promise<GetWpTagsResult> {
  const baseUrl = normalizeSiteUrl(input.siteUrl)

  const authToken = Buffer.from(
    `${input.wpUsername}:${input.wpApplicationPassword}`
  ).toString('base64')

  const response = await fetch(
    `${baseUrl}/wp-json/wp/v2/tags?per_page=100&_fields=id,name,slug,count`,
    {
      method: 'GET',
      headers: {
        Authorization: `Basic ${authToken}`,
        'Content-Type': 'application/json',
      },
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    return {
      success: false,
      message: `WordPress tags fetch failed: ${response.status} ${errorText}`,
    }
  }

  const data = await response.json()

  return {
    success: true,
    tags: Array.isArray(data)
      ? data.map((item) => ({
          id: item.id,
          name: item.name,
          slug: item.slug,
          count: item.count,
        }))
      : [],
    raw: data,
    message: 'WordPress tags fetched successfully',
  }
}

async function sendWpTermRequest(
  endpoint: string,
  input: CreateOrUpdateWpTermInput
): Promise<WpTermResult> {
  const baseUrl = normalizeSiteUrl(input.siteUrl)

  const authToken = Buffer.from(
    `${input.wpUsername}:${input.wpApplicationPassword}`
  ).toString('base64')

  const payload: Record<string, unknown> = {}

  if (typeof input.name === 'string') {
    payload.name = input.name
  }

  if (typeof input.slug === 'string') {
    payload.slug = input.slug
  }

  if (typeof input.description === 'string') {
    payload.description = input.description
  }

  const response = await fetch(`${baseUrl}${endpoint}`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${authToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const rawText = await response.text()

  let parsed: unknown = null
  try {
    parsed = rawText ? JSON.parse(rawText) : null
  } catch {
    parsed = rawText
  }

  if (!response.ok) {
    const details =
      typeof parsed === 'object' && parsed !== null && 'message' in parsed
        ? String((parsed as { message?: unknown }).message)
        : rawText

    return {
      success: false,
      raw: parsed,
      message: `WordPress taxonomy request failed: ${response.status} ${details}`,
    }
  }

  const data = parsed as Record<string, unknown>

  return {
    success: true,
    term: {
      id: Number(data.id),
      name: String(data.name ?? ''),
      slug: String(data.slug ?? ''),
      description:
        typeof data.description === 'string' ? data.description : undefined,
      count: typeof data.count === 'number' ? data.count : undefined,
    },
    raw: parsed,
    message: 'WordPress taxonomy request successful',
  }
}

export async function createWpCategory(
  input: CreateOrUpdateWpTermInput
): Promise<WpTermResult> {
  return sendWpTermRequest('/wp-json/wp/v2/categories', input)
}

export async function updateWpCategory(
  input: CreateOrUpdateWpTermInput & { termId: number }
): Promise<WpTermResult> {
  return sendWpTermRequest(`/wp-json/wp/v2/categories/${input.termId}`, input)
}

export async function createWpTag(
  input: CreateOrUpdateWpTermInput
): Promise<WpTermResult> {
  return sendWpTermRequest('/wp-json/wp/v2/tags', input)
}

export async function updateWpTag(
  input: CreateOrUpdateWpTermInput & { termId: number }
): Promise<WpTermResult> {
  return sendWpTermRequest(`/wp-json/wp/v2/tags/${input.termId}`, input)
}



