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
const client_s3_1 = require("@aws-sdk/client-s3");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = require("crypto");
const env_1 = require("../config/env");
const storage_1 = require("../config/storage");
function normalizeSlashes(value) {
    return value.replace(/\\/g, '/');
}
function normalizeStorageReference(value) {
    // Storage references must behave the same on Windows and Linux.
    // This keeps local paths and S3 object keys comparable in logs and URLs.
    return normalizeSlashes(value).replace(/^\/+/, '');
}
function getUploadsRoot() {
    return normalizeSlashes(path_1.default.resolve(process.cwd(), 'uploads'));
}
function resolveLocalPath(localPath) {
    return path_1.default.resolve(localPath);
}
function isLocalStorage() {
    return env_1.env.mediaStorageProvider === 'local';
}
function requireS3BucketName() {
    if (!env_1.env.s3BucketName) {
        throw new Error('Missing required environment variable: S3_BUCKET_NAME');
    }
    return env_1.env.s3BucketName;
}
function requireS3Region() {
    const region = process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION;
    if (!region) {
        throw new Error('Missing required environment variable: AWS_REGION');
    }
    return region;
}
function getS3Client() {
    return new client_s3_1.S3Client({
        region: requireS3Region(),
    });
}
function getPublicBackendBaseUrl() {
    // Local previews still come from the backend URL.
    // In S3 mode, this becomes the public bucket/CDN URL that serves object bytes.
    if (isLocalStorage()) {
        return process.env.PUBLIC_BACKEND_URL || 'http://localhost:3001';
    }
    const explicitBaseUrl = env_1.env.mediaPublicBaseUrl?.trim().replace(/\/+$/, '');
    if (explicitBaseUrl) {
        return explicitBaseUrl;
    }
    const bucket = requireS3BucketName();
    const region = requireS3Region();
    return `https://${bucket}.s3.${region}.amazonaws.com`;
}
function createStorageKey(prefix, fileName) {
    // We keep the key layout simple and readable so operators can inspect it in S3.
    const safeName = fileName.replace(/\s+/g, '_');
    return `${prefix}/${Date.now()}-${(0, crypto_1.randomBytes)(6).toString('hex')}-${safeName}`;
}
async function uploadBufferToS3(input) {
    const client = getS3Client();
    const bucket = requireS3BucketName();
    await client.send(new client_s3_1.PutObjectCommand({
        Bucket: bucket,
        Key: input.storageKey,
        Body: input.buffer,
        ContentType: input.mimeType,
    }));
}
async function readBufferFromS3(storageKey) {
    const client = getS3Client();
    const bucket = requireS3BucketName();
    const response = await client.send(new client_s3_1.GetObjectCommand({
        Bucket: bucket,
        Key: normalizeStorageReference(storageKey),
    }));
    if (!response.Body) {
        throw new Error('Remote image file not found');
    }
    const body = response.Body;
    if (typeof body.transformToByteArray === 'function') {
        return Buffer.from(await body.transformToByteArray());
    }
    throw new Error('Unable to read remote image buffer');
}
async function deleteFromS3(storageKey) {
    const client = getS3Client();
    const bucket = requireS3BucketName();
    await client.send(new client_s3_1.DeleteObjectCommand({
        Bucket: bucket,
        Key: normalizeStorageReference(storageKey),
    }));
}
function ensureMediaStorageDirectories() {
    // Only local development and tests need on-disk folders.
    // S3 mode intentionally does nothing here so production does not depend on EC2 disk state.
    if (!isLocalStorage()) {
        return;
    }
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
    if (isLocalStorage()) {
        const normalizedLocalPath = normalizeSlashes(resolveLocalPath(localPath));
        const uploadsRoot = getUploadsRoot();
        if (!normalizedLocalPath.startsWith(uploadsRoot)) {
            return null;
        }
        const relativePath = normalizedLocalPath
            .slice(uploadsRoot.length)
            .replace(/^\/+/, '');
        return `${getPublicBackendBaseUrl()}/uploads/${relativePath}`;
    }
    return `${getPublicBackendBaseUrl()}/${normalizeStorageReference(localPath)}`;
}
async function storeUploadedImage(input) {
    // The DB still stores the old `localPath` field name.
    // In S3 mode, that field becomes an opaque storage reference instead of a disk path.
    if (isLocalStorage()) {
        if (!input.localPath) {
            throw new Error('Local image path is required for local storage');
        }
        return {
            localPath: path_1.default.normalize(input.localPath),
        };
    }
    if (!input.buffer) {
        throw new Error('Image buffer is required for S3 storage');
    }
    const storageKey = createStorageKey('uploaded', input.originalName);
    await uploadBufferToS3({
        storageKey,
        buffer: input.buffer,
        mimeType: input.mimeType,
    });
    return {
        localPath: storageKey,
    };
}
async function saveGeneratedImage(input) {
    // Generated images follow the same provider switch as uploaded images.
    // That keeps the rest of the app unaware of whether the bytes ended up on disk or in S3.
    const fileName = `draft-${input.draftId}-${Date.now()}-${(0, crypto_1.randomBytes)(6).toString('hex')}.${input.extension}`;
    if (isLocalStorage()) {
        const uploadsDir = storage_1.storagePaths.generatedImageRoot;
        await fs_1.default.promises.mkdir(uploadsDir, { recursive: true });
        const localPath = path_1.default.join(uploadsDir, fileName);
        await fs_1.default.promises.writeFile(localPath, input.buffer);
        return {
            localPath,
        };
    }
    const storageKey = createStorageKey('generated', fileName);
    await uploadBufferToS3({
        storageKey,
        buffer: input.buffer,
        mimeType: `image/${input.extension === 'jpg' ? 'jpeg' : input.extension}`,
    });
    return {
        localPath: storageKey,
    };
}
async function readImageBuffer(localPath) {
    if (isLocalStorage()) {
        const absolutePath = resolveLocalPath(localPath);
        if (!fs_1.default.existsSync(absolutePath)) {
            throw new Error('Local image file not found');
        }
        return fs_1.default.promises.readFile(absolutePath);
    }
    return readBufferFromS3(localPath);
}
async function deleteImage(localPath) {
    if (isLocalStorage()) {
        const absolutePath = resolveLocalPath(localPath);
        if (!fs_1.default.existsSync(absolutePath)) {
            return;
        }
        await fs_1.default.promises.unlink(absolutePath);
        return;
    }
    await deleteFromS3(localPath);
}
