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
exports.env = {
    port: Number(process.env.PORT ?? 3001),
    nodeEnv: process.env.NODE_ENV ?? 'development',
    databaseUrl: requireEnv('DATABASE_URL'),
    encryptionKey: requireEnv('ENCRYPTION_KEY'),
    corsOrigins: parseCsv(requireEnv('CORS_ORIGINS')),
};
