import * as cheerio from 'cheerio'
import type { Element } from 'domhandler'

type FindSectionInput = {
  contentHtml: string
  targetHeadingText: string
  targetHeadingLevel?: number
}

type FoundSection = {
  headingHtml: string
  headingText: string
  headingLevel: number
  sectionInnerHtml: string
  paragraphHtmlList: string[]
  startHeadingIndex: number
}

function normalizeText(value: string) {
  return value.replace(/\s+/g, ' ').trim().toLowerCase()
}

export function findSectionByHeading(input: FindSectionInput): FoundSection | null {
  const $ = cheerio.load(input.contentHtml)

  const normalizedTarget = normalizeText(input.targetHeadingText)
  const targetHeadingLevel = input.targetHeadingLevel

  const rootChildren = $.root().children().toArray()

  for (let i = 0; i < rootChildren.length; i += 1) {
    const node = rootChildren[i]

    if (node.type !== 'tag') {
      continue
    }

    const tagName = node.tagName?.toLowerCase()

    if (!tagName || !/^h[1-6]$/.test(tagName)) {
      continue
    }

    const headingLevel = Number(tagName.replace('h', ''))
    const headingText = normalizeText($(node).text())

    if (headingText !== normalizedTarget) {
      continue
    }

    if (targetHeadingLevel && headingLevel !== targetHeadingLevel) {
      continue
    }

    const collectedNodes: Element[] = []
    const paragraphHtmlList: string[] = []

    for (let j = i + 1; j < rootChildren.length; j += 1) {
      const nextNode = rootChildren[j]

      if (
        nextNode.type === 'tag' &&
        nextNode.tagName &&
        /^h[1-6]$/i.test(nextNode.tagName)
      ) {
        const nextLevel = Number(nextNode.tagName.toLowerCase().replace('h', ''))
        if (nextLevel <= headingLevel) {
          break
        }
      }

      collectedNodes.push(nextNode)

      if (nextNode.type === 'tag' && nextNode.tagName?.toLowerCase() === 'p') {
        paragraphHtmlList.push($.html(nextNode))
      }
    }

    const sectionInnerHtml = collectedNodes.map((child) => $.html(child)).join('')

    return {
      headingHtml: $.html(node),
      headingText: $(node).text().trim(),
      headingLevel,
      sectionInnerHtml,
      paragraphHtmlList,
      startHeadingIndex: i,
    }
  }

  return null
}

type ReplaceSectionContentInput = {
  contentHtml: string
  targetHeadingText: string
  targetHeadingLevel?: number
  newSectionInnerHtml: string
}

export function replaceSectionContent(input: ReplaceSectionContentInput): string | null {
  const $ = cheerio.load(input.contentHtml)

  const normalizedTarget = normalizeText(input.targetHeadingText)
  const targetHeadingLevel = input.targetHeadingLevel

  const rootChildren = $.root().children().toArray()

  for (let i = 0; i < rootChildren.length; i += 1) {
    const node = rootChildren[i]

    if (node.type !== 'tag') {
      continue
    }

    const tagName = node.tagName?.toLowerCase()

    if (!tagName || !/^h[1-6]$/.test(tagName)) {
      continue
    }

    const headingLevel = Number(tagName.replace('h', ''))
    const headingText = normalizeText($(node).text())

    if (headingText !== normalizedTarget) {
      continue
    }

    if (targetHeadingLevel && headingLevel !== targetHeadingLevel) {
      continue
    }

    let endIndex = rootChildren.length

    for (let j = i + 1; j < rootChildren.length; j += 1) {
      const nextNode = rootChildren[j]

      if (
        nextNode.type === 'tag' &&
        nextNode.tagName &&
        /^h[1-6]$/i.test(nextNode.tagName)
      ) {
        const nextLevel = Number(nextNode.tagName.toLowerCase().replace('h', ''))
        if (nextLevel <= headingLevel) {
          endIndex = j
          break
        }
      }
    }

    const before = rootChildren.slice(0, i + 1).map((child) => $.html(child)).join('')
    const after = rootChildren.slice(endIndex).map((child) => $.html(child)).join('')

    return `${before}${input.newSectionInnerHtml}${after}`
  }

  return null
}

type ReplaceParagraphInSectionInput = {
  contentHtml: string
  targetHeadingText: string
  targetHeadingLevel?: number
  paragraphIndexInSection: number
  newParagraphHtml: string
}

export function replaceParagraphInSection(
  input: ReplaceParagraphInSectionInput
): string | null {
  const $ = cheerio.load(input.contentHtml)

  const normalizedTarget = normalizeText(input.targetHeadingText)
  const targetHeadingLevel = input.targetHeadingLevel

  const rootChildren = $.root().children().toArray()

  for (let i = 0; i < rootChildren.length; i += 1) {
    const node = rootChildren[i]

    if (node.type !== 'tag') {
      continue
    }

    const tagName = node.tagName?.toLowerCase()

    if (!tagName || !/^h[1-6]$/.test(tagName)) {
      continue
    }

    const headingLevel = Number(tagName.replace('h', ''))
    const headingText = normalizeText($(node).text())

    if (headingText !== normalizedTarget) {
      continue
    }

    if (targetHeadingLevel && headingLevel !== targetHeadingLevel) {
      continue
    }

    let paragraphCounter = 1

    for (let j = i + 1; j < rootChildren.length; j += 1) {
      const nextNode = rootChildren[j]

      if (
        nextNode.type === 'tag' &&
        nextNode.tagName &&
        /^h[1-6]$/i.test(nextNode.tagName)
      ) {
        const nextLevel = Number(nextNode.tagName.toLowerCase().replace('h', ''))
        if (nextLevel <= headingLevel) {
          break
        }
      }

      if (nextNode.type === 'tag' && nextNode.tagName?.toLowerCase() === 'p') {
        if (paragraphCounter === input.paragraphIndexInSection) {
          rootChildren[j] = cheerio.load(input.newParagraphHtml).root().children().first().get(0)!

          return rootChildren.map((child) => $.html(child)).join('')
        }

        paragraphCounter += 1
      }
    }

    return null
  }

  return null
}