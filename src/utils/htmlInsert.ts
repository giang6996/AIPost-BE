import * as cheerio from 'cheerio'
import type { Element } from 'domhandler'


type SectionTargetInput = {
  contentHtml: string
  targetHeadingText: string
  targetHeadingLevel?: number | null
}

function normalizeText(value: string) {
  return value.replace(/\s+/g, ' ').trim().toLowerCase()
}

function isHeadingTag(tagName?: string | null) {
  return !!tagName && /^h[1-6]$/i.test(tagName)
}

function getHeadingLevel(tagName: string) {
  return Number(tagName.toLowerCase().replace('h', ''))
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getContentContainerAndChildren($: cheerio.CheerioAPI) {
  const article = $('article').first()

  if (article.length > 0) {
    return {
      container: article,
      children: article.children().toArray(),
    }
  }

  const body = $('body').first()

  if (body.length > 0) {
    return {
      container: body,
      children: body.children().toArray(),
    }
  }

  return {
    container: $.root(),
    children: $.root().children().toArray(),
  }
}





export function insertAtEndOfArticle(contentHtml: string, imageHtml: string) {
  return `${contentHtml}\n${imageHtml}`;
}

export function insertAfterHeading(
  contentHtml: string,
  headingText: string,
  headingLevel: number | null,
  imageHtml: string,
) {
  const levelPattern = headingLevel ? `h${headingLevel}` : "h[1-6]";
  const pattern = new RegExp(
    `(<${levelPattern}[^>]*>\\s*${escapeRegExp(headingText)}\\s*<\\/${levelPattern}>)`,
    "i",
  );

  if (!pattern.test(contentHtml)) {
    throw new Error("Target heading not found");
  }

  return contentHtml.replace(pattern, `$1\n${imageHtml}`);
}



function findTargetHeadingIndex(
  children: Element[],
  $: cheerio.CheerioAPI,
  targetHeadingText: string,
  targetHeadingLevel?: number | null
) {
  const normalizedTarget = normalizeText(targetHeadingText)

  for (let i = 0; i < children.length; i += 1) {
    const node = children[i]

    if (node.type !== 'tag' || !isHeadingTag(node.tagName)) {
      continue
    }

    const headingLevel = getHeadingLevel(node.tagName!)
    const headingText = normalizeText($(node).text())

    if (headingText !== normalizedTarget) {
      continue
    }

    if (targetHeadingLevel && headingLevel !== targetHeadingLevel) {
      continue
    }

    return i
  }

  return -1
}

function findSectionEndIndex(
  children: Element[],
  startHeadingIndex: number
) {
  const startNode = children[startHeadingIndex]

  if (startNode.type !== 'tag' || !startNode.tagName) {
    return children.length
  }

  const startHeadingLevel = getHeadingLevel(startNode.tagName)

  for (let i = startHeadingIndex + 1; i < children.length; i += 1) {
    const node = children[i]

    if (node.type === 'tag' && isHeadingTag(node.tagName)) {
      const nextLevel = getHeadingLevel(node.tagName!)
      if (nextLevel <= startHeadingLevel) {
        return i
      }
    }
  }

  return children.length
}

export function insertInsideSectionStart(
  input: SectionTargetInput & { imageHtml: string }
) {
  const $ = cheerio.load(input.contentHtml, {
    xml: { xmlMode: false, decodeEntities: false },
  })
  const { children } = getContentContainerAndChildren($)

  const headingIndex = findTargetHeadingIndex(
    children,
    $,
    input.targetHeadingText,
    input.targetHeadingLevel
  )

  if (headingIndex === -1) {
    throw new Error('Target heading not found')
  }

  const before = children
    .slice(0, headingIndex + 1)
    .map((child) => $.html(child))
    .join('')
  const after = children
    .slice(headingIndex + 1)
    .map((child) => $.html(child))
    .join('')

  return `${before}\n${input.imageHtml}\n${after}`
}

export function insertInsideSectionEnd(
  input: SectionTargetInput & { imageHtml: string }
) {
  const $ = cheerio.load(input.contentHtml, {
    xml: { xmlMode: false, decodeEntities: false },
  })
  const { children } = getContentContainerAndChildren($)

  const headingIndex = findTargetHeadingIndex(
    children,
    $,
    input.targetHeadingText,
    input.targetHeadingLevel
  )

  if (headingIndex === -1) {
    throw new Error('Target heading not found')
  }

  const sectionEndIndex = findSectionEndIndex(children, headingIndex)

  const before = children
    .slice(0, sectionEndIndex)
    .map((child) => $.html(child))
    .join('')
  const after = children
    .slice(sectionEndIndex)
    .map((child) => $.html(child))
    .join('')

  return `${before}\n${input.imageHtml}\n${after}`
}

export function insertAfterParagraphInSection(
  input: SectionTargetInput & {
    paragraphIndexInSection: number
    imageHtml: string
  }
) {
  const $ = cheerio.load(input.contentHtml, {
    xml: { xmlMode: false, decodeEntities: false },
  })
  const { children } = getContentContainerAndChildren($)

  const headingIndex = findTargetHeadingIndex(
    children,
    $,
    input.targetHeadingText,
    input.targetHeadingLevel
  )

  if (headingIndex === -1) {
    throw new Error('Target heading not found')
  }

  const sectionEndIndex = findSectionEndIndex(children, headingIndex)

  let paragraphCounter = 1

  for (let i = headingIndex + 1; i < sectionEndIndex; i += 1) {
    const node = children[i]

    if (node.type === 'tag' && node.tagName?.toLowerCase() === 'p') {
      if (paragraphCounter === input.paragraphIndexInSection) {
        const before = children
          .slice(0, i + 1)
          .map((child) => $.html(child))
          .join('')
        const after = children
          .slice(i + 1)
          .map((child) => $.html(child))
          .join('')

        return `${before}\n${input.imageHtml}\n${after}`
      }

      paragraphCounter += 1
    }
  }

  throw new Error('Target paragraph not found')
}
