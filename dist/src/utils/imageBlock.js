"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildImageHtmlBlock = buildImageHtmlBlock;
function buildImageHtmlBlock(image) {
    const alt = image.altText ?? '';
    const caption = image.caption?.trim();
    if (caption) {
        return `<figure class="wp-aipost-image"><img src="${image.remoteUrl}" alt="${alt}" /><figcaption>${caption}</figcaption></figure>`;
    }
    return `<figure class="wp-aipost-image"><img src="${image.remoteUrl}" alt="${alt}" /></figure>`;
}
