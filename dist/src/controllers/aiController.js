"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOpenAiConfigHandler = getOpenAiConfigHandler;
exports.saveOpenAiConfigHandler = saveOpenAiConfigHandler;
exports.deleteOpenAiConfigHandler = deleteOpenAiConfigHandler;
exports.generateImageHandler = generateImageHandler;
exports.generateTitleHandler = generateTitleHandler;
exports.generatePostHandler = generatePostHandler;
exports.generateSeoHandler = generateSeoHandler;
exports.rewriteSectionHandler = rewriteSectionHandler;
const apiResponse_1 = require("../utils/apiResponse");
const aiService_1 = require("../services/aiService");
async function getOpenAiConfigHandler(req, res) {
    try {
        const userId = req.authUser.id;
        if (!userId) {
            return (0, apiResponse_1.sendError)(res, "No local test userId found", { code: "USER_NOT_FOUND" }, 400);
        }
        const config = await (0, aiService_1.getOpenAiConfig)(userId);
        return (0, apiResponse_1.sendSuccess)(res, config, config.hasApiKey
            ? "OpenAI config fetched successfully"
            : "OpenAI config not found");
    }
    catch (error) {
        return (0, apiResponse_1.sendErrorNormalized)(res, error, {
            message: "Failed to fetch OpenAI config",
            code: "FETCH_OPENAI_CONFIG_FAILED",
            status: 500,
        });
    }
}
function normalizeOptionalString(value) {
    if (typeof value !== "string") {
        return undefined;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
}
async function saveOpenAiConfigHandler(req, res) {
    try {
        const apiKey = normalizeOptionalString(req.body.apiKey);
        const defaultTextModel = normalizeOptionalString(req.body.defaultTextModel);
        const defaultImageModel = normalizeOptionalString(req.body.defaultImageModel);
        const isActive = typeof req.body.isActive === "boolean" ? req.body.isActive : undefined;
        if (apiKey === undefined &&
            defaultTextModel === undefined &&
            defaultImageModel === undefined &&
            isActive === undefined) {
            return (0, apiResponse_1.sendError)(res, "At least one field is required", {
                code: "VALIDATION_ERROR",
                details: "Provide at least one of: apiKey, defaultTextModel, defaultImageModel, isActive",
            }, 400);
        }
        const userId = req.authUser.id;
        if (!userId) {
            return (0, apiResponse_1.sendError)(res, "No local test userId found", { code: "USER_NOT_FOUND" }, 400);
        }
        const config = await (0, aiService_1.saveOpenAiConfig)(userId, {
            apiKey,
            defaultTextModel,
            defaultImageModel,
            isActive,
        });
        return (0, apiResponse_1.sendSuccess)(res, config, "OpenAI config saved successfully");
    }
    catch (error) {
        const isValidationError = error instanceof Error && error.message === "API key is required";
        return (0, apiResponse_1.sendErrorNormalized)(res, error, {
            message: isValidationError
                ? "API key is required"
                : "Failed to save OpenAI config",
            code: isValidationError
                ? "VALIDATION_ERROR"
                : "SAVE_OPENAI_CONFIG_FAILED",
            status: isValidationError ? 400 : 500,
        });
    }
}
async function deleteOpenAiConfigHandler(req, res) {
    try {
        const userId = req.authUser.id;
        if (!userId) {
            return (0, apiResponse_1.sendError)(res, "No local test userId found", { code: "USER_NOT_FOUND" }, 400);
        }
        const result = await (0, aiService_1.deleteOpenAiConfig)(userId);
        return (0, apiResponse_1.sendSuccess)(res, result, "OpenAI config deleted successfully");
    }
    catch (error) {
        const isNotFound = error instanceof Error && error.message === "OpenAI config not found";
        return (0, apiResponse_1.sendErrorNormalized)(res, error, {
            message: isNotFound
                ? "OpenAI config not found"
                : "Failed to delete OpenAI config",
            code: isNotFound
                ? "OPENAI_CONFIG_NOT_FOUND"
                : "DELETE_OPENAI_CONFIG_FAILED",
            status: isNotFound ? 404 : 500,
        });
    }
}
async function generateImageHandler(req, res) {
    try {
        const prompt = typeof req.body.prompt === "string" ? req.body.prompt.trim() : "";
        const draftId = Number.isInteger(req.body.draftId) && req.body.draftId > 0
            ? req.body.draftId
            : undefined;
        const size = typeof req.body.size === "string" ? req.body.size : undefined;
        const background = typeof req.body.background === "string" ? req.body.background : undefined;
        const title = typeof req.body.title === "string" ? req.body.title.trim() : undefined;
        const contentHtml = typeof req.body.contentHtml === "string"
            ? req.body.contentHtml
            : undefined;
        const imageRole = typeof req.body.imageRole === "string" ? req.body.imageRole : undefined;
        const sectionHeading = typeof req.body.sectionHeading === "string"
            ? req.body.sectionHeading.trim()
            : undefined;
        if (!prompt) {
            return (0, apiResponse_1.sendError)(res, "Prompt is required", { code: "VALIDATION_ERROR", details: "prompt is required" }, 400);
        }
        const allowedSizes = new Set([
            "1024x1024",
            "1536x1024",
            "1024x1536",
            "auto",
        ]);
        if (size && !allowedSizes.has(size)) {
            return (0, apiResponse_1.sendError)(res, "Invalid image size", { code: "VALIDATION_ERROR", details: "Unsupported size value" }, 400);
        }
        const allowedBackgrounds = new Set(["opaque", "transparent", "auto"]);
        if (background && !allowedBackgrounds.has(background)) {
            return (0, apiResponse_1.sendError)(res, "Invalid background value", { code: "VALIDATION_ERROR", details: "Unsupported background value" }, 400);
        }
        const userId = req.authUser.id;
        if (!userId) {
            return (0, apiResponse_1.sendError)(res, "No local test userId found", { code: "USER_NOT_FOUND" }, 400);
        }
        const result = await (0, aiService_1.generateImage)({
            userId: userId,
            prompt,
            draftId,
            title,
            contentHtml,
            imageRole,
            sectionHeading,
            size: size,
            background: background,
        });
        return (0, apiResponse_1.sendSuccess)(res, result, "Image generated successfully");
    }
    catch (error) {
        const isConfigError = error instanceof Error &&
            error.message === "OpenAI config not found or inactive";
        const isPromptError = error instanceof Error && error.message === "Prompt is required";
        return (0, apiResponse_1.sendErrorNormalized)(res, error, {
            message: isConfigError
                ? "OpenAI config not found or inactive"
                : isPromptError
                    ? "Prompt is required"
                    : "Failed to generate image",
            code: isConfigError
                ? "OPENAI_CONFIG_NOT_READY"
                : isPromptError
                    ? "VALIDATION_ERROR"
                    : "AI_IMAGE_GENERATION_FAILED",
            status: isConfigError || isPromptError ? 400 : 500,
        });
    }
}
async function generateTitleHandler(req, res) {
    try {
        const prompt = typeof req.body.prompt === "string" ? req.body.prompt.trim() : "";
        const draftId = Number.isInteger(req.body.draftId) && req.body.draftId > 0
            ? req.body.draftId
            : undefined;
        const contentHtml = typeof req.body.contentHtml === "string"
            ? req.body.contentHtml.trim()
            : undefined;
        const tone = typeof req.body.tone === "string" ? req.body.tone.trim() : undefined;
        const count = Number.isInteger(req.body.count) &&
            req.body.count >= 1 &&
            req.body.count <= 10
            ? req.body.count
            : undefined;
        const maxTitleLength = Number.isInteger(req.body.maxTitleLength) &&
            req.body.maxTitleLength >= 20 &&
            req.body.maxTitleLength <= 120
            ? req.body.maxTitleLength
            : undefined;
        if (!prompt) {
            return (0, apiResponse_1.sendError)(res, "Prompt is required", { code: "VALIDATION_ERROR", details: "prompt is required" }, 400);
        }
        if (req.body.count !== undefined && count === undefined) {
            return (0, apiResponse_1.sendError)(res, "Invalid count value", {
                code: "VALIDATION_ERROR",
                details: "count must be an integer between 1 and 10",
            }, 400);
        }
        if (req.body.maxTitleLength !== undefined && maxTitleLength === undefined) {
            return (0, apiResponse_1.sendError)(res, "Invalid maxTitleLength value", {
                code: "VALIDATION_ERROR",
                details: "maxTitleLength must be an integer between 20 and 120",
            }, 400);
        }
        const userId = req.authUser.id;
        if (!userId) {
            return (0, apiResponse_1.sendError)(res, "No local test userId found", { code: "USER_NOT_FOUND" }, 400);
        }
        const result = await (0, aiService_1.generateTitles)({
            userId: userId,
            prompt,
            draftId,
            contentHtml,
            count,
            tone,
            maxTitleLength,
        });
        return (0, apiResponse_1.sendSuccess)(res, result, "Titles generated successfully");
    }
    catch (error) {
        const isConfigError = error instanceof Error &&
            error.message === "OpenAI config not found or inactive";
        const isPromptError = error instanceof Error && error.message === "Prompt is required";
        return (0, apiResponse_1.sendErrorNormalized)(res, error, {
            message: isConfigError
                ? "OpenAI config not found or inactive"
                : isPromptError
                    ? "Prompt is required"
                    : "Failed to generate titles",
            code: isConfigError
                ? "OPENAI_CONFIG_NOT_READY"
                : isPromptError
                    ? "VALIDATION_ERROR"
                    : "AI_TITLE_GENERATION_FAILED",
            status: isConfigError || isPromptError ? 400 : 500,
        });
    }
}
async function generatePostHandler(req, res) {
    try {
        const prompt = typeof req.body.prompt === "string" ? req.body.prompt.trim() : "";
        const draftId = Number.isInteger(req.body.draftId) && req.body.draftId > 0
            ? req.body.draftId
            : undefined;
        const tone = typeof req.body.tone === "string" ? req.body.tone.trim() : undefined;
        const structure = typeof req.body.structure === "string"
            ? req.body.structure.trim()
            : undefined;
        const maxEstimatedWords = Number.isInteger(req.body.maxEstimatedWords) &&
            req.body.maxEstimatedWords >= 200 &&
            req.body.maxEstimatedWords <= 5000
            ? req.body.maxEstimatedWords
            : undefined;
        if (!prompt) {
            return (0, apiResponse_1.sendError)(res, "Prompt is required", { code: "VALIDATION_ERROR", details: "prompt is required" }, 400);
        }
        if (req.body.maxEstimatedWords !== undefined &&
            maxEstimatedWords === undefined) {
            return (0, apiResponse_1.sendError)(res, "Invalid maxEstimatedWords value", {
                code: "VALIDATION_ERROR",
                details: "maxEstimatedWords must be an integer between 200 and 5000",
            }, 400);
        }
        const userId = req.authUser.id;
        if (!userId) {
            return (0, apiResponse_1.sendError)(res, "No local test userId found", { code: "USER_NOT_FOUND" }, 400);
        }
        const result = await (0, aiService_1.generatePost)({
            userId: userId,
            prompt,
            draftId,
            tone,
            structure,
            maxEstimatedWords,
        });
        return (0, apiResponse_1.sendSuccess)(res, result, "Post content generated successfully");
    }
    catch (error) {
        const isConfigError = error instanceof Error &&
            error.message === "OpenAI config not found or inactive";
        const isPromptError = error instanceof Error && error.message === "Prompt is required";
        return (0, apiResponse_1.sendErrorNormalized)(res, error, {
            message: isConfigError
                ? "OpenAI config not found or inactive"
                : isPromptError
                    ? "Prompt is required"
                    : "Failed to generate post content",
            code: isConfigError
                ? "OPENAI_CONFIG_NOT_READY"
                : isPromptError
                    ? "VALIDATION_ERROR"
                    : "AI_POST_GENERATION_FAILED",
            status: isConfigError || isPromptError ? 400 : 500,
        });
    }
}
async function generateSeoHandler(req, res) {
    try {
        const prompt = typeof req.body.prompt === "string" ? req.body.prompt.trim() : "";
        const draftId = Number.isInteger(req.body.draftId) && req.body.draftId > 0
            ? req.body.draftId
            : undefined;
        const title = typeof req.body.title === "string" ? req.body.title.trim() : undefined;
        const contentHtml = typeof req.body.contentHtml === "string"
            ? req.body.contentHtml.trim()
            : undefined;
        const tone = typeof req.body.tone === "string" ? req.body.tone.trim() : undefined;
        const maxMetaDescriptionLength = Number.isInteger(req.body.maxMetaDescriptionLength) &&
            req.body.maxMetaDescriptionLength >= 120 &&
            req.body.maxMetaDescriptionLength <= 200
            ? req.body.maxMetaDescriptionLength
            : undefined;
        if (!prompt) {
            return (0, apiResponse_1.sendError)(res, "Prompt is required", { code: "VALIDATION_ERROR", details: "prompt is required" }, 400);
        }
        if (req.body.maxMetaDescriptionLength !== undefined &&
            maxMetaDescriptionLength === undefined) {
            return (0, apiResponse_1.sendError)(res, "Invalid maxMetaDescriptionLength value", {
                code: "VALIDATION_ERROR",
                details: "maxMetaDescriptionLength must be an integer between 120 and 200",
            }, 400);
        }
        const userId = req.authUser.id;
        if (!userId) {
            return (0, apiResponse_1.sendError)(res, "No local test userId found", { code: "USER_NOT_FOUND" }, 400);
        }
        const result = await (0, aiService_1.generateSeo)({
            userId: userId,
            prompt,
            draftId,
            title,
            contentHtml,
            tone,
            maxMetaDescriptionLength,
        });
        return (0, apiResponse_1.sendSuccess)(res, result, "SEO metadata generated successfully");
    }
    catch (error) {
        const isConfigError = error instanceof Error &&
            error.message === "OpenAI config not found or inactive";
        const isPromptError = error instanceof Error && error.message === "Prompt is required";
        return (0, apiResponse_1.sendErrorNormalized)(res, error, {
            message: isConfigError
                ? "OpenAI config not found or inactive"
                : isPromptError
                    ? "Prompt is required"
                    : "Failed to generate SEO metadata",
            code: isConfigError
                ? "OPENAI_CONFIG_NOT_READY"
                : isPromptError
                    ? "VALIDATION_ERROR"
                    : "AI_SEO_GENERATION_FAILED",
            status: isConfigError || isPromptError ? 400 : 500,
        });
    }
}
async function rewriteSectionHandler(req, res) {
    try {
        const draftId = Number.isInteger(req.body.draftId) && req.body.draftId > 0
            ? req.body.draftId
            : null;
        const instruction = typeof req.body.instruction === "string"
            ? req.body.instruction.trim()
            : "";
        const targetHeadingText = typeof req.body.targetHeadingText === "string"
            ? req.body.targetHeadingText.trim()
            : "";
        const targetHeadingLevel = Number.isInteger(req.body.targetHeadingLevel) &&
            req.body.targetHeadingLevel >= 1 &&
            req.body.targetHeadingLevel <= 6
            ? req.body.targetHeadingLevel
            : undefined;
        const paragraphIndexInSection = Number.isInteger(req.body.paragraphIndexInSection) &&
            req.body.paragraphIndexInSection >= 1
            ? req.body.paragraphIndexInSection
            : undefined;
        if (!draftId) {
            return (0, apiResponse_1.sendError)(res, "Invalid draft id", {
                code: "VALIDATION_ERROR",
                details: "draftId is required and must be a positive integer",
            }, 400);
        }
        if (!instruction) {
            return (0, apiResponse_1.sendError)(res, "Instruction is required", { code: "VALIDATION_ERROR", details: "instruction is required" }, 400);
        }
        if (!targetHeadingText) {
            return (0, apiResponse_1.sendError)(res, "Target heading text is required", { code: "VALIDATION_ERROR", details: "targetHeadingText is required" }, 400);
        }
        const userId = req.authUser.id;
        if (!userId) {
            return (0, apiResponse_1.sendError)(res, "No local test userId found", { code: "USER_NOT_FOUND" }, 400);
        }
        const result = await (0, aiService_1.rewriteSection)({
            userId: userId,
            draftId,
            instruction,
            targetHeadingText,
            targetHeadingLevel,
            paragraphIndexInSection,
        });
        return (0, apiResponse_1.sendSuccess)(res, result, "Section rewritten successfully");
    }
    catch (error) {
        const message = error instanceof Error &&
            (error.message === "Draft not found" ||
                error.message === "Section not found" ||
                error.message === "Paragraph not found" ||
                error.message === "Instruction is required" ||
                error.message === "Target heading text is required" ||
                error.message === "OpenAI config not found or inactive")
            ? error.message
            : "Failed to rewrite section";
        const code = error instanceof Error && error.message === "Draft not found"
            ? "DRAFT_NOT_FOUND"
            : error instanceof Error && error.message === "Section not found"
                ? "SECTION_NOT_FOUND"
                : error instanceof Error && error.message === "Paragraph not found"
                    ? "PARAGRAPH_NOT_FOUND"
                    : error instanceof Error &&
                        error.message === "OpenAI config not found or inactive"
                        ? "OPENAI_CONFIG_NOT_READY"
                        : error instanceof Error &&
                            (error.message === "Instruction is required" ||
                                error.message === "Target heading text is required")
                            ? "VALIDATION_ERROR"
                            : "AI_REWRITE_FAILED";
        const statusCode = error instanceof Error &&
            (error.message === "Draft not found" ||
                error.message === "Section not found" ||
                error.message === "Paragraph not found")
            ? 404
            : error instanceof Error &&
                (error.message === "Instruction is required" ||
                    error.message === "Target heading text is required" ||
                    error.message === "OpenAI config not found or inactive")
                ? 400
                : 500;
        return (0, apiResponse_1.sendErrorNormalized)(res, error, {
            message,
            code,
            status: statusCode,
        });
    }
}
