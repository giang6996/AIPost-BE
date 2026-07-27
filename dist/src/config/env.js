"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
function requireEnv(name) {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
}
function parseCsv(value) {
    // Keep comma-separated runtime config easy to deploy across local, staging, and prod.
    return value
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean);
}
function parseMediaStorageProvider(value) {
    if (!value || value === 'local') {
        return 'local';
    }
    if (value === 's3') {
        return 's3';
    }
    throw new Error("Missing or invalid environment variable: MEDIA_STORAGE_PROVIDER must be 'local' or 's3'");
}
exports.env = {
    port: Number(process.env.PORT ?? 3001),
    nodeEnv: process.env.NODE_ENV ?? 'development',
    databaseUrl: requireEnv('DATABASE_URL'),
    encryptionKey: requireEnv('ENCRYPTION_KEY'),
    corsOrigins: parseCsv(requireEnv('CORS_ORIGINS')),
    mediaStorageProvider: parseMediaStorageProvider(process.env.MEDIA_STORAGE_PROVIDER),
    mediaPublicBaseUrl: process.env.MEDIA_PUBLIC_BASE_URL ?? null,
    s3BucketName: process.env.S3_BUCKET_NAME ?? null,
};
