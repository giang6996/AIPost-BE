"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadWpMedia = uploadWpMedia;
exports.testWpConnection = testWpConnection;
exports.updateWpMediaMeta = updateWpMediaMeta;
exports.publishWpPost = publishWpPost;
exports.updateWpPost = updateWpPost;
exports.deleteWpPost = deleteWpPost;
exports.getWpCategories = getWpCategories;
exports.getWpTags = getWpTags;
exports.createWpCategory = createWpCategory;
exports.updateWpCategory = updateWpCategory;
exports.createWpTag = createWpTag;
exports.updateWpTag = updateWpTag;
function normalizeSiteUrl(siteUrl) {
    return siteUrl.trim().replace(/\/+$/, '');
}
async function uploadWpMedia(input) {
    const baseUrl = normalizeSiteUrl(input.siteUrl);
    const authToken = Buffer.from(`${input.wpUsername}:${input.wpApplicationPassword}`).toString('base64');
    const response = await fetch(`${baseUrl}/wp-json/wp/v2/media`, {
        method: 'POST',
        headers: {
            Authorization: `Basic ${authToken}`,
            'Content-Type': input.mimeType,
            'Content-Disposition': `attachment; filename="${input.filename}"`,
        },
        body: new Uint8Array(input.fileBuffer),
    });
    if (!response.ok) {
        const errorText = await response.text();
        return {
            success: false,
            message: `WordPress media upload failed: ${response.status} ${errorText}`,
        };
    }
    const data = await response.json();
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
        });
    }
    return {
        success: true,
        wpMediaId: data?.id,
        sourceUrl: data?.source_url,
        raw: data,
        message: 'WordPress media upload successful',
    };
}
function buildWpMetaPayload(seoMeta) {
    if (!seoMeta) {
        return {};
    }
    return {
        _ai_seo_title: seoMeta.seoTitle ?? '',
        _ai_meta_description: seoMeta.metaDescription ?? '',
        _ai_canonical: seoMeta.canonicalUrl ?? '',
        _ai_focus_keyword: seoMeta.focusKeyword ?? '',
        _ai_og_title: seoMeta.ogTitle ?? '',
        _ai_og_description: seoMeta.ogDescription ?? '',
        _ai_og_image: seoMeta.ogImageUrl ?? '',
    };
}
async function testWpConnection(input) {
    const { siteUrl, wpUsername, wpApplicationPassword } = input;
    const baseUrl = normalizeSiteUrl(siteUrl);
    const authToken = Buffer.from(`${wpUsername}:${wpApplicationPassword}`).toString('base64');
    const response = await fetch(`${baseUrl}/wp-json/wp/v2/users/me`, {
        method: 'GET',
        headers: {
            Authorization: `Basic ${authToken}`,
            'Content-Type': 'application/json',
        },
    });
    if (!response.ok) {
        const errorText = await response.text();
        return {
            success: false,
            message: `WordPress connection failed: ${response.status} ${errorText}`,
        };
    }
    const data = await response.json();
    return {
        success: true,
        siteName: baseUrl,
        user: {
            id: data?.id,
            name: data?.name,
            slug: data?.slug,
        },
        message: 'WordPress connection successful',
    };
}
async function updateWpMediaMeta(input) {
    const baseUrl = normalizeSiteUrl(input.siteUrl);
    const authToken = Buffer.from(`${input.wpUsername}:${input.wpApplicationPassword}`).toString('base64');
    const payload = {};
    if (input.altText !== undefined) {
        payload.alt_text = input.altText;
    }
    if (input.caption !== undefined) {
        payload.caption = input.caption ?? '';
    }
    const response = await fetch(`${baseUrl}/wp-json/wp/v2/media/${input.wpMediaId}`, {
        method: 'POST',
        headers: {
            Authorization: `Basic ${authToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });
    const rawText = await response.text();
    let parsed = null;
    try {
        parsed = rawText ? JSON.parse(rawText) : null;
    }
    catch {
        parsed = rawText;
    }
    if (!response.ok) {
        const details = typeof parsed === 'object' && parsed !== null && 'message' in parsed
            ? String(parsed.message)
            : rawText;
        return {
            success: false,
            raw: parsed,
            message: `WordPress media update failed: ${response.status} ${details}`,
        };
    }
    return {
        success: true,
        raw: parsed,
        message: 'WordPress media metadata updated successfully',
    };
}
async function publishWpPost(input) {
    const baseUrl = normalizeSiteUrl(input.siteUrl);
    const authToken = Buffer.from(`${input.wpUsername}:${input.wpApplicationPassword}`).toString('base64');
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
    });
    if (!response.ok) {
        const errorText = await response.text();
        return {
            success: false,
            message: `WordPress publish failed: ${response.status} ${errorText}`,
        };
    }
    const data = await response.json();
    return {
        success: true,
        wpPostId: data?.id,
        wpPostUrl: data?.link,
        raw: data,
        message: 'WordPress publish successful',
    };
}
async function updateWpPost(input) {
    const baseUrl = normalizeSiteUrl(input.siteUrl);
    const authToken = Buffer.from(`${input.wpUsername}:${input.wpApplicationPassword}`).toString('base64');
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
    };
    const response = await fetch(`${baseUrl}/wp-json/wp/v2/posts/${input.wpPostId}`, {
        method: 'POST',
        headers: {
            Authorization: `Basic ${authToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });
    if (!response.ok) {
        const errorText = await response.text();
        return {
            success: false,
            message: `WordPress update failed: ${response.status} ${errorText}`,
        };
    }
    const data = await response.json();
    return {
        success: true,
        wpPostId: data?.id,
        wpPostUrl: data?.link,
        raw: data,
        message: 'WordPress update successful',
    };
}
async function deleteWpPost(input) {
    const baseUrl = normalizeSiteUrl(input.siteUrl);
    const authToken = Buffer.from(`${input.wpUsername}:${input.wpApplicationPassword}`).toString('base64');
    const response = await fetch(`${baseUrl}/wp-json/wp/v2/posts/${input.wpPostId}?force=${input.force ? 'true' : 'false'}`, {
        method: 'DELETE',
        headers: {
            Authorization: `Basic ${authToken}`,
            'Content-Type': 'application/json',
        },
    });
    const rawText = await response.text();
    let parsed = null;
    try {
        parsed = rawText ? JSON.parse(rawText) : null;
    }
    catch {
        parsed = rawText;
    }
    if (!response.ok) {
        const details = typeof parsed === 'object' && parsed !== null && 'message' in parsed
            ? String(parsed.message)
            : rawText;
        return {
            success: false,
            raw: parsed,
            message: `WordPress delete failed: ${response.status} ${details}`,
        };
    }
    return {
        success: true,
        raw: parsed,
        message: input.force
            ? 'WordPress post deleted permanently'
            : 'WordPress post moved to trash',
    };
}
async function getWpCategories(input) {
    const baseUrl = normalizeSiteUrl(input.siteUrl);
    const authToken = Buffer.from(`${input.wpUsername}:${input.wpApplicationPassword}`).toString('base64');
    const response = await fetch(`${baseUrl}/wp-json/wp/v2/categories?per_page=100&_fields=id,name,slug,count`, {
        method: 'GET',
        headers: {
            Authorization: `Basic ${authToken}`,
            'Content-Type': 'application/json',
        },
    });
    if (!response.ok) {
        const errorText = await response.text();
        return {
            success: false,
            message: `WordPress categories fetch failed: ${response.status} ${errorText}`,
        };
    }
    const data = await response.json();
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
    };
}
async function getWpTags(input) {
    const baseUrl = normalizeSiteUrl(input.siteUrl);
    const authToken = Buffer.from(`${input.wpUsername}:${input.wpApplicationPassword}`).toString('base64');
    const response = await fetch(`${baseUrl}/wp-json/wp/v2/tags?per_page=100&_fields=id,name,slug,count`, {
        method: 'GET',
        headers: {
            Authorization: `Basic ${authToken}`,
            'Content-Type': 'application/json',
        },
    });
    if (!response.ok) {
        const errorText = await response.text();
        return {
            success: false,
            message: `WordPress tags fetch failed: ${response.status} ${errorText}`,
        };
    }
    const data = await response.json();
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
    };
}
async function sendWpTermRequest(endpoint, input) {
    const baseUrl = normalizeSiteUrl(input.siteUrl);
    const authToken = Buffer.from(`${input.wpUsername}:${input.wpApplicationPassword}`).toString('base64');
    const payload = {};
    if (typeof input.name === 'string') {
        payload.name = input.name;
    }
    if (typeof input.slug === 'string') {
        payload.slug = input.slug;
    }
    if (typeof input.description === 'string') {
        payload.description = input.description;
    }
    const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
            Authorization: `Basic ${authToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });
    const rawText = await response.text();
    let parsed = null;
    try {
        parsed = rawText ? JSON.parse(rawText) : null;
    }
    catch {
        parsed = rawText;
    }
    if (!response.ok) {
        const details = typeof parsed === 'object' && parsed !== null && 'message' in parsed
            ? String(parsed.message)
            : rawText;
        return {
            success: false,
            raw: parsed,
            message: `WordPress taxonomy request failed: ${response.status} ${details}`,
        };
    }
    const data = parsed;
    return {
        success: true,
        term: {
            id: Number(data.id),
            name: String(data.name ?? ''),
            slug: String(data.slug ?? ''),
            description: typeof data.description === 'string' ? data.description : undefined,
            count: typeof data.count === 'number' ? data.count : undefined,
        },
        raw: parsed,
        message: 'WordPress taxonomy request successful',
    };
}
async function createWpCategory(input) {
    return sendWpTermRequest('/wp-json/wp/v2/categories', input);
}
async function updateWpCategory(input) {
    return sendWpTermRequest(`/wp-json/wp/v2/categories/${input.termId}`, input);
}
async function createWpTag(input) {
    return sendWpTermRequest('/wp-json/wp/v2/tags', input);
}
async function updateWpTag(input) {
    return sendWpTermRequest(`/wp-json/wp/v2/tags/${input.termId}`, input);
}
