"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureMediaStorageDirectories = ensureMediaStorageDirectories;
exports.getUploadedImageRoot = getUploadedImageRoot;
exports.getImagePreviewUrl = getImagePreviewUrl;
exports.storeUploadedImage = storeUploadedImage;
exports.saveGeneratedImage = saveGeneratedImage;
exports.readImageBuffer = readImageBuffer;
exports.deleteImage = deleteImage;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = require("crypto");
const storage_1 = require("../config/storage");
function normalizeSlashes(value) {
    return value.replace(/\\/g, '/');
}
function normalizeUploadPath(value) {
    // Storage files should be addressed in a platform-neutral way so Windows and Linux
    // produce the same URL and cleanup behavior.
    return normalizeSlashes(value);
}
function resolveUploadsRelativePath(localPath) {
    const normalizedLocalPath = normalizeUploadPath(localPath);
    const uploadsRoot = normalizeUploadPath(path_1.default.resolve(process.cwd(), 'uploads'));
    if (!normalizedLocalPath.startsWith(uploadsRoot)) {
        return null;
    }
    return normalizedLocalPath
        .slice(uploadsRoot.length)
        .replace(/^\/+/, '');
}
function getPublicBackendBaseUrl() {
    // Local previews still point at the backend itself. Later, this can become a CDN
    // or S3 bucket URL without changing the services that call this module.
    return process.env.PUBLIC_BACKEND_URL || 'http://localhost:3001';
}
function ensureMediaStorageDirectories() {
    // The storage layer owns the folder layout, not the controllers.
    // Keeping it here makes a future S3 swap much smaller.
    const dirs = [storage_1.storagePaths.uploadedImageRoot, storage_1.storagePaths.generatedImageRoot];
    for (const dir of dirs) {
        if (!fs_1.default.existsSync(dir)) {
            fs_1.default.mkdirSync(dir, { recursive: true });
        }
    }
}
function getUploadedImageRoot() {
    return storage_1.storagePaths.uploadedImageRoot;
}
function getImagePreviewUrl(localPath) {
    if (!localPath) {
        return null;
    }
    const relativePath = resolveUploadsRelativePath(localPath);
    if (!relativePath) {
        return null;
    }
    return `${getPublicBackendBaseUrl()}/uploads/${relativePath}`;
}
async function storeUploadedImage(input) {
    // Today uploads already land on disk, so this adapter mainly normalizes the path.
    // Later this function can upload to S3 and return a provider-neutral storage key.
    return {
        localPath: path_1.default.normalize(input.localPath),
    };
}
async function saveGeneratedImage(input) {
    // Generated images are written through the storage layer so their destination is
    // controlled from one place instead of being spread across services.
    const uploadsDir = storage_1.storagePaths.generatedImageRoot;
    await fs_1.default.promises.mkdir(uploadsDir, { recursive: true });
    const fileName = `draft-${input.draftId}-${Date.now()}-${(0, crypto_1.randomBytes)(6).toString('hex')}.${input.extension}`;
    const localPath = path_1.default.join(uploadsDir, fileName);
    await fs_1.default.promises.writeFile(localPath, input.buffer);
    return {
        localPath,
    };
}
async function readImageBuffer(localPath) {
    const absolutePath = path_1.default.resolve(localPath);
    if (!fs_1.default.existsSync(absolutePath)) {
        throw new Error('Local image file not found');
    }
    return fs_1.default.promises.readFile(absolutePath);
}
async function deleteImage(localPath) {
    const absolutePath = path_1.default.resolve(localPath);
    if (!fs_1.default.existsSync(absolutePath)) {
        return;
    }
    await fs_1.default.promises.unlink(absolutePath);
}
