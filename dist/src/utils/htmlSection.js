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
exports.findSectionByHeading = findSectionByHeading;
exports.replaceSectionContent = replaceSectionContent;
exports.replaceParagraphInSection = replaceParagraphInSection;
const cheerio = __importStar(require("cheerio"));
function normalizeText(value) {
    return value.replace(/\s+/g, ' ').trim().toLowerCase();
}
function findSectionByHeading(input) {
    const $ = cheerio.load(input.contentHtml);
    const normalizedTarget = normalizeText(input.targetHeadingText);
    const targetHeadingLevel = input.targetHeadingLevel;
    const rootChildren = $.root().children().toArray();
    for (let i = 0; i < rootChildren.length; i += 1) {
        const node = rootChildren[i];
        if (node.type !== 'tag') {
            continue;
        }
        const tagName = node.tagName?.toLowerCase();
        if (!tagName || !/^h[1-6]$/.test(tagName)) {
            continue;
        }
        const headingLevel = Number(tagName.replace('h', ''));
        const headingText = normalizeText($(node).text());
        if (headingText !== normalizedTarget) {
            continue;
        }
        if (targetHeadingLevel && headingLevel !== targetHeadingLevel) {
            continue;
        }
        const collectedNodes = [];
        const paragraphHtmlList = [];
        for (let j = i + 1; j < rootChildren.length; j += 1) {
            const nextNode = rootChildren[j];
            if (nextNode.type === 'tag' &&
                nextNode.tagName &&
                /^h[1-6]$/i.test(nextNode.tagName)) {
                const nextLevel = Number(nextNode.tagName.toLowerCase().replace('h', ''));
                if (nextLevel <= headingLevel) {
                    break;
                }
            }
            collectedNodes.push(nextNode);
            if (nextNode.type === 'tag' && nextNode.tagName?.toLowerCase() === 'p') {
                paragraphHtmlList.push($.html(nextNode));
            }
        }
        const sectionInnerHtml = collectedNodes.map((child) => $.html(child)).join('');
        return {
            headingHtml: $.html(node),
            headingText: $(node).text().trim(),
            headingLevel,
            sectionInnerHtml,
            paragraphHtmlList,
            startHeadingIndex: i,
        };
    }
    return null;
}
function replaceSectionContent(input) {
    const $ = cheerio.load(input.contentHtml);
    const normalizedTarget = normalizeText(input.targetHeadingText);
    const targetHeadingLevel = input.targetHeadingLevel;
    const rootChildren = $.root().children().toArray();
    for (let i = 0; i < rootChildren.length; i += 1) {
        const node = rootChildren[i];
        if (node.type !== 'tag') {
            continue;
        }
        const tagName = node.tagName?.toLowerCase();
        if (!tagName || !/^h[1-6]$/.test(tagName)) {
            continue;
        }
        const headingLevel = Number(tagName.replace('h', ''));
        const headingText = normalizeText($(node).text());
        if (headingText !== normalizedTarget) {
            continue;
        }
        if (targetHeadingLevel && headingLevel !== targetHeadingLevel) {
            continue;
        }
        let endIndex = rootChildren.length;
        for (let j = i + 1; j < rootChildren.length; j += 1) {
            const nextNode = rootChildren[j];
            if (nextNode.type === 'tag' &&
                nextNode.tagName &&
                /^h[1-6]$/i.test(nextNode.tagName)) {
                const nextLevel = Number(nextNode.tagName.toLowerCase().replace('h', ''));
                if (nextLevel <= headingLevel) {
                    endIndex = j;
                    break;
                }
            }
        }
        const before = rootChildren.slice(0, i + 1).map((child) => $.html(child)).join('');
        const after = rootChildren.slice(endIndex).map((child) => $.html(child)).join('');
        return `${before}${input.newSectionInnerHtml}${after}`;
    }
    return null;
}
function replaceParagraphInSection(input) {
    const $ = cheerio.load(input.contentHtml);
    const normalizedTarget = normalizeText(input.targetHeadingText);
    const targetHeadingLevel = input.targetHeadingLevel;
    const rootChildren = $.root().children().toArray();
    for (let i = 0; i < rootChildren.length; i += 1) {
        const node = rootChildren[i];
        if (node.type !== 'tag') {
            continue;
        }
        const tagName = node.tagName?.toLowerCase();
        if (!tagName || !/^h[1-6]$/.test(tagName)) {
            continue;
        }
        const headingLevel = Number(tagName.replace('h', ''));
        const headingText = normalizeText($(node).text());
        if (headingText !== normalizedTarget) {
            continue;
        }
        if (targetHeadingLevel && headingLevel !== targetHeadingLevel) {
            continue;
        }
        let paragraphCounter = 1;
        for (let j = i + 1; j < rootChildren.length; j += 1) {
            const nextNode = rootChildren[j];
            if (nextNode.type === 'tag' &&
                nextNode.tagName &&
                /^h[1-6]$/i.test(nextNode.tagName)) {
                const nextLevel = Number(nextNode.tagName.toLowerCase().replace('h', ''));
                if (nextLevel <= headingLevel) {
                    break;
                }
            }
            if (nextNode.type === 'tag' && nextNode.tagName?.toLowerCase() === 'p') {
                if (paragraphCounter === input.paragraphIndexInSection) {
                    rootChildren[j] = cheerio.load(input.newParagraphHtml).root().children().first().get(0);
                    return rootChildren.map((child) => $.html(child)).join('');
                }
                paragraphCounter += 1;
            }
        }
        return null;
    }
    return null;
}
