"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOpenAiConfig = getOpenAiConfig;
exports.saveOpenAiConfig = saveOpenAiConfig;
exports.deleteOpenAiConfig = deleteOpenAiConfig;
exports.generateImage = generateImage;
exports.generateTitles = generateTitles;
exports.generatePost = generatePost;
exports.generateSeo = generateSeo;
exports.rewriteSection = rewriteSection;
const openai_1 = __importDefault(require("openai"));
const prisma_1 = require("../lib/prisma");
const crypto_1 = require("../utils/crypto");
const crypto_2 = require("../utils/crypto");
const htmlSection_1 = require("../utils/htmlSection");
function toSafeAiConfig(config) {
    return {
        provider: config.provider,
        defaultTextModel: config.defaultTextModel,
        defaultImageModel: config.defaultImageModel,
        isActive: config.isActive,
        hasApiKey: true,
    };
}
function estimateWordCountFromHtml(html) {
    const text = html
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    if (!text) {
        return 0;
    }
    return text.split(" ").length;
}
function stripHtml(html) {
    return html
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}
async function getOpenAiConfig(userId) {
    const config = await prisma_1.prisma.aiProviderConfig.findUnique({
        where: {
            userId_provider: {
                userId,
                provider: "openai",
            },
        },
    });
    if (!config) {
        return {
            provider: "openai",
            defaultTextModel: null,
            defaultImageModel: null,
            isActive: false,
            hasApiKey: false,
        };
    }
    return {
        provider: config.provider,
        defaultTextModel: config.defaultTextModel,
        defaultImageModel: config.defaultImageModel,
        isActive: config.isActive,
        hasApiKey: true,
    };
}
async function saveOpenAiConfig(userId, input) {
    const existing = await prisma_1.prisma.aiProviderConfig.findUnique({
        where: {
            userId_provider: {
                userId,
                provider: "openai",
            },
        },
    });
    const normalizedApiKey = typeof input.apiKey === "string" && input.apiKey.trim().length > 0
        ? input.apiKey.trim()
        : undefined;
    const normalizedDefaultTextModel = typeof input.defaultTextModel === "string" &&
        input.defaultTextModel.trim().length > 0
        ? input.defaultTextModel.trim()
        : undefined;
    const normalizedDefaultImageModel = typeof input.defaultImageModel === "string" &&
        input.defaultImageModel.trim().length > 0
        ? input.defaultImageModel.trim()
        : undefined;
    const normalizedIsActive = typeof input.isActive === "boolean" ? input.isActive : undefined;
    const nextApiKeyEncrypted = normalizedApiKey
        ? (0, crypto_2.encrypt)(normalizedApiKey)
        : existing?.apiKeyEncrypted;
    if (!nextApiKeyEncrypted?.trim()) {
        throw new Error("API key is required");
    }
    const saved = await prisma_1.prisma.aiProviderConfig.upsert({
        where: {
            userId_provider: {
                userId,
                provider: "openai",
            },
        },
        update: {
            apiKeyEncrypted: nextApiKeyEncrypted,
            defaultTextModel: normalizedDefaultTextModel !== undefined
                ? normalizedDefaultTextModel
                : (existing?.defaultTextModel ?? null),
            defaultImageModel: normalizedDefaultImageModel !== undefined
                ? normalizedDefaultImageModel
                : (existing?.defaultImageModel ?? null),
            isActive: normalizedIsActive !== undefined
                ? normalizedIsActive
                : (existing?.isActive ?? true),
        },
        create: {
            userId,
            provider: "openai",
            apiKeyEncrypted: nextApiKeyEncrypted,
            defaultTextModel: normalizedDefaultTextModel ?? null,
            defaultImageModel: normalizedDefaultImageModel ?? null,
            isActive: normalizedIsActive ?? true,
        },
    });
    return {
        provider: saved.provider,
        defaultTextModel: saved.defaultTextModel,
        defaultImageModel: saved.defaultImageModel,
        isActive: saved.isActive,
        hasApiKey: true,
    };
}
async function deleteOpenAiConfig(userId) {
    const existing = await prisma_1.prisma.aiProviderConfig.findUnique({
        where: {
            userId_provider: {
                userId,
                provider: "openai",
            },
        },
    });
    if (!existing) {
        throw new Error("OpenAI config not found");
    }
    await prisma_1.prisma.aiProviderConfig.delete({
        where: {
            userId_provider: {
                userId,
                provider: "openai",
            },
        },
    });
    return {
        provider: "openai",
    };
}
async function getActiveOpenAiClient(userId) {
    const config = await prisma_1.prisma.aiProviderConfig.findUnique({
        where: {
            userId_provider: {
                userId,
                provider: "openai",
            },
        },
    });
    if (!config || !config.isActive) {
        throw new Error("OpenAI config not found or inactive");
    }
    const apiKey = (0, crypto_1.decrypt)(config.apiKeyEncrypted);
    return {
        client: new openai_1.default({ apiKey }),
        config,
    };
}
async function generateImage(input) {
    const normalizedPrompt = input.prompt.trim();
    if (!normalizedPrompt) {
        throw new Error("Prompt is required");
    }
    const { client, config } = await getActiveOpenAiClient(input.userId);
    const modelName = config.defaultImageModel || "gpt-image-1.5";
    const contentText = input.contentHtml
        ? stripHtml(input.contentHtml).slice(0, 2500)
        : "";
    const instructionParts = [
        "Create a clean, high-quality image suitable for use in a blog article.",
        "The image should be visually clear, relevant to the topic, and useful as article media.",
        "Prefer a professional, readable composition that works well as a featured image or inline content image.",
        "Avoid clutter, excessive small details, and unnecessary decorative elements.",
        "Avoid adding visible text in the image unless explicitly requested.",
        "Make the image align closely with the requested topic and article intent.",
    ];
    if (input.imageRole?.trim()) {
        instructionParts.push(`Image role: ${input.imageRole.trim()}.`);
    }
    if (input.title?.trim()) {
        instructionParts.push(`Article title: ${input.title.trim()}.`);
    }
    if (input.sectionHeading?.trim()) {
        instructionParts.push(`Target section: ${input.sectionHeading.trim()}.`);
    }
    if (contentText) {
        instructionParts.push(`Article context: ${contentText}`);
    }
    instructionParts.push(`Image brief: ${normalizedPrompt}`);
    const result = await client.images.generate({
        model: modelName,
        prompt: instructionParts.join("\n\n"),
        size: input.size ?? "1024x1024",
        background: input.background ?? "opaque",
    });
    const imageData = result.data?.[0];
    if (!imageData) {
        throw new Error("No image returned from OpenAI");
    }
    const imageBase64 = "b64_json" in imageData && typeof imageData.b64_json === "string"
        ? imageData.b64_json
        : null;
    if (!imageBase64) {
        throw new Error("OpenAI image response did not include base64 image data");
    }
    const revisedPrompt = "revised_prompt" in imageData &&
        typeof imageData.revised_prompt === "string"
        ? imageData.revised_prompt
        : null;
    await prisma_1.prisma.usageLog.create({
        data: {
            draftId: input.draftId ?? null,
            userId: input.userId,
            actionType: "generate_image",
            modelName,
            inputTokens: 0,
            outputTokens: 0,
            imageCount: 1,
            estimatedCost: 0,
        },
    });
    return {
        imageBase64,
        mimeType: "image/png",
        modelName,
        revisedPrompt,
    };
}
async function generateTitles(input) {
    const normalizedPrompt = input.prompt.trim();
    if (!normalizedPrompt) {
        throw new Error("Prompt is required");
    }
    const { client, config } = await getActiveOpenAiClient(input.userId);
    const modelName = config.defaultTextModel || "gpt-5.4";
    const count = input.count ?? 5;
    const maxTitleLength = input.maxTitleLength ?? 70;
    const contentText = input.contentHtml
        ? input.contentHtml
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .trim()
        : "";
    const instructionParts = [
        `Generate exactly ${count} strong blog post titles.`,
        `Each title should be under approximately ${maxTitleLength} characters.`,
        "Base the titles on the article's actual topic and content.",
        "Make the titles clear, useful, and relevant to likely search intent.",
        "Naturally include the main topic or likely focus keyword when appropriate.",
        "Prefer placing the main topic or keyword near the beginning when it reads naturally.",
        "Make the titles specific and meaningful, not vague or generic.",
        "Avoid clickbait, misleading claims, and unnatural keyword stuffing.",
        "Create variation across the titles: include a mix of cleaner SEO-friendly options and more engaging click-through-oriented options.",
        'Return only a JSON object with this exact shape: {"titles":["title 1","title 2"]}',
        "Do not include numbering, explanation, or markdown.",
    ];
    if (input.tone?.trim()) {
        instructionParts.push(`Use this tone: ${input.tone.trim()}.`);
    }
    instructionParts.push(`Prompt and title brief: ${normalizedPrompt}`);
    if (contentText) {
        instructionParts.push(`Article context: ${contentText}`);
    }
    const response = await client.responses.create({
        model: modelName,
        input: instructionParts.join("\n\n"),
    });
    const rawText = response.output_text?.trim();
    if (!rawText) {
        throw new Error("No title content returned from OpenAI");
    }
    let parsed;
    try {
        parsed = JSON.parse(rawText);
    }
    catch {
        throw new Error("Failed to parse generated titles");
    }
    const titles = typeof parsed === "object" &&
        parsed !== null &&
        "titles" in parsed &&
        Array.isArray(parsed.titles)
        ? parsed.titles
            .filter((item) => typeof item === "string")
            .map((title) => title.trim())
            .filter((title) => title.length > 0)
        : [];
    if (!titles.length) {
        throw new Error("No valid titles returned from OpenAI");
    }
    await prisma_1.prisma.usageLog.create({
        data: {
            draftId: input.draftId ?? null,
            userId: input.userId,
            actionType: "generate_title",
            modelName,
            inputTokens: response.usage?.input_tokens ?? 0,
            outputTokens: response.usage?.output_tokens ?? 0,
            imageCount: 0,
            estimatedCost: 0,
        },
    });
    return {
        titles,
        modelName,
        generatedCount: titles.length,
    };
}
async function generatePost(input) {
    const normalizedPrompt = input.prompt.trim();
    if (!normalizedPrompt) {
        throw new Error("Prompt is required");
    }
    const { client, config } = await getActiveOpenAiClient(input.userId);
    const modelName = config.defaultTextModel || "gpt-5.4";
    const maxEstimatedWords = input.maxEstimatedWords ?? 1200;
    const instructionParts = [
        "Write a high-quality blog article in clean HTML-ready format.",
        "Return structured article content using paragraphs and section headings.",
        "Focus on the article content body. The post title may be generated separately.",
        "The article must be useful, readable, and aligned with the requested topic.",
        "Establish the main topic clearly in the introduction.",
        "Use a strong heading structure with meaningful <h2> sections and <h3> subsections only when useful.",
        "Make section headings specific and helpful, not generic.",
        "Naturally support the main topic and likely search intent throughout the article.",
        "Use the topic or close keyword variations naturally in the introduction and some section headings when appropriate.",
        "Do not keyword-stuff or repeat phrases unnaturally.",
        "Prioritize clarity, usefulness, and flow for real readers.",
        "Avoid generic filler, repetitive phrasing, and obvious AI-style padding.",
        "Return only article HTML.",
        "Do not include markdown fences.",
        "Do not include explanations outside the article.",
    ];
    if (input.tone?.trim()) {
        instructionParts.push(`Use this tone: ${input.tone.trim()}.`);
    }
    if (input.structure?.trim()) {
        instructionParts.push(`Follow this structure: ${input.structure.trim()}.`);
    }
    instructionParts.push(`Target article length: approximately ${maxEstimatedWords} words.`);
    instructionParts.push(`Topic and writing brief: ${normalizedPrompt}`);
    const response = await client.responses.create({
        model: modelName,
        input: instructionParts.join("\n\n"),
    });
    const contentHtml = response.output_text?.trim();
    if (!contentHtml) {
        throw new Error("No post content returned from OpenAI");
    }
    const estimatedWords = estimateWordCountFromHtml(contentHtml);
    await prisma_1.prisma.usageLog.create({
        data: {
            draftId: input.draftId ?? null,
            userId: input.userId,
            actionType: "generate_post",
            modelName,
            inputTokens: response.usage?.input_tokens ?? 0,
            outputTokens: response.usage?.output_tokens ?? 0,
            imageCount: 0,
            estimatedCost: 0,
        },
    });
    return {
        contentHtml,
        modelName,
        estimatedWords,
    };
}
async function generateSeo(input) {
    const normalizedPrompt = input.prompt.trim();
    if (!normalizedPrompt) {
        throw new Error("Prompt is required");
    }
    const { client, config } = await getActiveOpenAiClient(input.userId);
    const modelName = config.defaultTextModel || "gpt-5.4";
    const maxMetaDescriptionLength = input.maxMetaDescriptionLength ?? 160;
    const contentText = input.contentHtml ? stripHtml(input.contentHtml) : "";
    const instructionParts = [
        "Generate one coherent SEO metadata package for this article.",
        "All fields must support the same primary topic and keyword strategy.",
        "Choose one realistic primary focus keyword based on the article title and content.",
        "The SEO title must include the focus keyword naturally.",
        "Prefer placing the focus keyword near the beginning of the SEO title when it reads naturally.",
        "The meta description must be persuasive, clear, and aligned with the same keyword/topic.",
        "The Open Graph title and description must remain consistent with the SEO title and meta description.",
        "Avoid vague, generic, or overly broad focus keywords.",
        "Do not invent a different topic from the article.",
        "Return only a JSON object with this exact shape:",
        '{"seoTitle":"...","metaDescription":"...","focusKeyword":"...","ogTitle":"...","ogDescription":"..."}',
        `Keep the metaDescription under approximately ${maxMetaDescriptionLength} characters.`,
        "Write for real users first, but keep the result SEO-aware.",
    ];
    if (input.tone?.trim()) {
        instructionParts.push(`Use this tone: ${input.tone.trim()}.`);
    }
    instructionParts.push(`SEO brief: ${normalizedPrompt}`);
    if (input.title?.trim()) {
        instructionParts.push(`Post title: ${input.title.trim()}`);
    }
    if (contentText) {
        instructionParts.push(`Post content: ${contentText}`);
    }
    const response = await client.responses.create({
        model: modelName,
        input: instructionParts.join("\n\n"),
    });
    const rawText = response.output_text?.trim();
    if (!rawText) {
        throw new Error("No SEO content returned from OpenAI");
    }
    let parsed;
    try {
        parsed = JSON.parse(rawText);
    }
    catch {
        throw new Error("Failed to parse generated SEO metadata");
    }
    const seo = typeof parsed === "object" && parsed !== null
        ? {
            seoTitle: typeof parsed.seoTitle === "string"
                ? parsed.seoTitle.trim()
                : "",
            metaDescription: typeof parsed.metaDescription ===
                "string"
                ? parsed.metaDescription.trim()
                : "",
            focusKeyword: typeof parsed.focusKeyword ===
                "string"
                ? parsed.focusKeyword.trim()
                : "",
            ogTitle: typeof parsed.ogTitle === "string"
                ? parsed.ogTitle.trim()
                : "",
            ogDescription: typeof parsed.ogDescription ===
                "string"
                ? parsed.ogDescription.trim()
                : "",
        }
        : null;
    if (!seo ||
        !seo.seoTitle ||
        !seo.metaDescription ||
        !seo.focusKeyword ||
        !seo.ogTitle ||
        !seo.ogDescription) {
        throw new Error("No valid SEO metadata returned from OpenAI");
    }
    await prisma_1.prisma.usageLog.create({
        data: {
            draftId: input.draftId ?? null,
            userId: input.userId,
            actionType: "generate_seo",
            modelName,
            inputTokens: response.usage?.input_tokens ?? 0,
            outputTokens: response.usage?.output_tokens ?? 0,
            imageCount: 0,
            estimatedCost: 0,
        },
    });
    return seo;
}
async function rewriteSection(input) {
    const instruction = input.instruction.trim();
    const targetHeadingText = input.targetHeadingText.trim();
    if (!instruction) {
        throw new Error("Instruction is required");
    }
    if (!targetHeadingText) {
        throw new Error("Target heading text is required");
    }
    const draft = await prisma_1.prisma.draft.findFirst({
        where: {
            id: input.draftId,
            userId: input.userId,
        },
    });
    if (!draft) {
        throw new Error("Draft not found");
    }
    const section = (0, htmlSection_1.findSectionByHeading)({
        contentHtml: draft.contentHtml,
        targetHeadingText,
        targetHeadingLevel: input.targetHeadingLevel,
    });
    if (!section) {
        throw new Error("Section not found");
    }
    let targetHtml = "";
    let rewriteMode = "section";
    if (input.paragraphIndexInSection !== undefined) {
        const targetParagraph = section.paragraphHtmlList[input.paragraphIndexInSection - 1];
        if (!targetParagraph) {
            throw new Error("Paragraph not found");
        }
        targetHtml = targetParagraph;
        rewriteMode = "paragraph";
    }
    else {
        targetHtml = section.sectionInnerHtml;
        rewriteMode = "section";
    }
    const { client, config } = await getActiveOpenAiClient(input.userId);
    const modelName = config.defaultTextModel || "gpt-5.4";
    const instructionParts = [
        rewriteMode === "paragraph"
            ? "Rewrite the following HTML paragraph."
            : "Rewrite the following HTML section content.",
        "Return only HTML.",
        "Do not include markdown fences.",
        rewriteMode === "paragraph"
            ? "Return exactly one rewritten paragraph in <p>...</p> format unless the instruction clearly requires a different inline structure."
            : "Preserve the section structure naturally using valid HTML paragraphs and subheadings when appropriate.",
        `Rewrite instruction: ${instruction}`,
        `Target heading: ${targetHeadingText}`,
        `Original HTML:\n${targetHtml}`,
    ];
    const response = await client.responses.create({
        model: modelName,
        input: instructionParts.join("\n\n"),
    });
    const rewrittenHtml = response.output_text?.trim();
    if (!rewrittenHtml) {
        throw new Error("No rewritten content returned from OpenAI");
    }
    let updatedContentHtml = null;
    if (rewriteMode === "paragraph") {
        updatedContentHtml = (0, htmlSection_1.replaceParagraphInSection)({
            contentHtml: draft.contentHtml,
            targetHeadingText,
            targetHeadingLevel: input.targetHeadingLevel,
            paragraphIndexInSection: input.paragraphIndexInSection,
            newParagraphHtml: rewrittenHtml,
        });
        if (!updatedContentHtml) {
            throw new Error("Failed to replace paragraph in section");
        }
    }
    else {
        updatedContentHtml = (0, htmlSection_1.replaceSectionContent)({
            contentHtml: draft.contentHtml,
            targetHeadingText,
            targetHeadingLevel: input.targetHeadingLevel,
            newSectionInnerHtml: rewrittenHtml,
        });
        if (!updatedContentHtml) {
            throw new Error("Failed to replace section content");
        }
    }
    await prisma_1.prisma.draft.update({
        where: { id: draft.id },
        data: {
            contentHtml: updatedContentHtml,
            updatedAt: new Date(),
        },
    });
    await prisma_1.prisma.usageLog.create({
        data: {
            draftId: draft.id,
            userId: input.userId,
            actionType: rewriteMode === "paragraph" ? "rewrite_paragraph" : "rewrite_section",
            modelName,
            inputTokens: response.usage?.input_tokens ?? 0,
            outputTokens: response.usage?.output_tokens ?? 0,
            imageCount: 0,
            estimatedCost: 0,
        },
    });
    return {
        draftId: draft.id,
        targetHeadingText,
        targetHeadingLevel: input.targetHeadingLevel ?? null,
        paragraphIndexInSection: input.paragraphIndexInSection !== undefined
            ? input.paragraphIndexInSection
            : null,
        rewrittenHtml,
        contentHtml: updatedContentHtml,
    };
}
