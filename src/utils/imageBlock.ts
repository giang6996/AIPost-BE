export function buildImageHtmlBlock(image: {
  remoteUrl: string
  altText?: string | null
  caption?: string | null
}) {
  const alt = image.altText ?? ''
  const caption = image.caption?.trim()

  if (caption) {
    return `<figure class="wp-aipost-image"><img src="${image.remoteUrl}" alt="${alt}" /><figcaption>${caption}</figcaption></figure>`
  }

  return `<figure class="wp-aipost-image"><img src="${image.remoteUrl}" alt="${alt}" /></figure>`
}