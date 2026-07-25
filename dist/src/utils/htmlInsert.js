"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.insertAtEndOfArticle = insertAtEndOfArticle;
exports.insertAfterHeading = insertAfterHeading;
exports.insertInsideSectionStart = insertInsideSectionStart;
exports.insertInsideSectionEnd = insertInsideSectionEnd;
exports.insertAfterParagraphInSection = insertAfterParagraphInSection;
const cheerio = __importStar(require("cheerio"));
function normalizeText(value) {
    return value.replace(/\s+/g, ' ').trim().toLowerCase();
}
function isHeadingTag(tagName) {
    return !!tagName && /^h[1-6]$/i.test(tagName);
}
function getHeadingLevel(tagName) {
    return Number(tagName.toLowerCase().replace('h', ''));
}
function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function getContentContainerAndChildren($) {
    const article = $('article').first();
    if (article.length > 0) {
        return {
            container: article,
            children: article.children().toArray(),
        };
    }
    const body = $('body').first();
    if (body.length > 0) {
        return {
            container: body,
            children: body.children().toArray(),
        };
    }
    return {
        container: $.root(),
        children: $.root().children().toArray(),
    };
}
function insertAtEndOfArticle(contentHtml, imageHtml) {
    return `${contentHtml}\n${imageHtml}`;
}
function insertAfterHeading(contentHtml, headingText, headingLevel, imageHtml) {
    const levelPattern = headingLevel ? `h${headingLevel}` : "h[1-6]";
    const pattern = new RegExp(`(<${levelPattern}[^>]*>\\s*${escapeRegExp(headingText)}\\s*<\\/${levelPattern}>)`, "i");
    if (!pattern.test(contentHtml)) {
        throw new Error("Target heading not found");
    }
    return contentHtml.replace(pattern, `$1\n${imageHtml}`);
}
function findTargetHeadingIndex(children, $, targetHeadingText, targetHeadingLevel) {
    const normalizedTarget = normalizeText(targetHeadingText);
    for (let i = 0; i < children.length; i += 1) {
        const node = children[i];
        if (node.type !== 'tag' || !isHeadingTag(node.tagName)) {
            continue;
        }
        const headingLevel = getHeadingLevel(node.tagName);
        const headingText = normalizeText($(node).text());
        if (headingText !== normalizedTarget) {
            continue;
        }
        if (targetHeadingLevel && headingLevel !== targetHeadingLevel) {
            continue;
        }
        return i;
    }
    return -1;
}
function findSectionEndIndex(children, startHeadingIndex) {
    const startNode = children[startHeadingIndex];
    if (startNode.type !== 'tag' || !startNode.tagName) {
        return children.length;
    }
    const startHeadingLevel = getHeadingLevel(startNode.tagName);
    for (let i = startHeadingIndex + 1; i < children.length; i += 1) {
        const node = children[i];
        if (node.type === 'tag' && isHeadingTag(node.tagName)) {
            const nextLevel = getHeadingLevel(node.tagName);
            if (nextLevel <= startHeadingLevel) {
                return i;
            }
        }
    }
    return children.length;
}
function insertInsideSectionStart(input) {
    const $ = cheerio.load(input.contentHtml, {
        xml: { xmlMode: false, decodeEntities: false },
    });
    const { children } = getContentContainerAndChildren($);
    const headingIndex = findTargetHeadingIndex(children, $, input.targetHeadingText, input.targetHeadingLevel);
    if (headingIndex === -1) {
        throw new Error('Target heading not found');
    }
    const before = children
        .slice(0, headingIndex + 1)
        .map((child) => $.html(child))
        .join('');
    const after = children
        .slice(headingIndex + 1)
        .map((child) => $.html(child))
        .join('');
    return `${before}\n${input.imageHtml}\n${after}`;
}
function insertInsideSectionEnd(input) {
    const $ = cheerio.load(input.contentHtml, {
        xml: { xmlMode: false, decodeEntities: false },
    });
    const { children } = getContentContainerAndChildren($);
    const headingIndex = findTargetHeadingIndex(children, $, input.targetHeadingText, input.targetHeadingLevel);
    if (headingIndex === -1) {
        throw new Error('Target heading not found');
    }
    const sectionEndIndex = findSectionEndIndex(children, headingIndex);
    const before = children
        .slice(0, sectionEndIndex)
        .map((child) => $.html(child))
        .join('');
    const after = children
        .slice(sectionEndIndex)
        .map((child) => $.html(child))
        .join('');
    return `${before}\n${input.imageHtml}\n${after}`;
}
function insertAfterParagraphInSection(input) {
    const $ = cheerio.load(input.contentHtml, {
        xml: { xmlMode: false, decodeEntities: false },
    });
    const { children } = getContentContainerAndChildren($);
    const headingIndex = findTargetHeadingIndex(children, $, input.targetHeadingText, input.targetHeadingLevel);
    if (headingIndex === -1) {
        throw new Error('Target heading not found');
    }
    const sectionEndIndex = findSectionEndIndex(children, headingIndex);
    let paragraphCounter = 1;
    for (let i = headingIndex + 1; i < sectionEndIndex; i += 1) {
        const node = children[i];
        if (node.type === 'tag' && node.tagName?.toLowerCase() === 'p') {
            if (paragraphCounter === input.paragraphIndexInSection) {
                const before = children
                    .slice(0, i + 1)
                    .map((child) => $.html(child))
                    .join('');
                const after = children
                    .slice(i + 1)
                    .map((child) => $.html(child))
                    .join('');
                return `${before}\n${input.imageHtml}\n${after}`;
            }
            paragraphCounter += 1;
        }
    }
    throw new Error('Target paragraph not found');
}
