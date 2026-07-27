"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.upload = void 0;
const fs_1 = __importDefault(require("fs"));
const multer_1 = __importDefault(require("multer"));
const mediaStorageService_1 = require("../services/mediaStorageService");
const env_1 = require("../config/env");
const uploadedImageRoot = (0, mediaStorageService_1.getUploadedImageRoot)();
const storage = env_1.env.mediaStorageProvider === 's3'
    ? multer_1.default.memoryStorage()
    : multer_1.default.diskStorage({
        destination: (_req, _file, cb) => {
            if (!fs_1.default.existsSync(uploadedImageRoot)) {
                fs_1.default.mkdirSync(uploadedImageRoot, { recursive: true });
            }
            cb(null, uploadedImageRoot);
        },
        filename: (_req, file, cb) => {
            const timestamp = Date.now();
            const safeOriginalName = file.originalname.replace(/\s+/g, '_');
            cb(null, `${timestamp}-${safeOriginalName}`);
        },
    });
if (env_1.env.mediaStorageProvider === 'local' && !fs_1.default.existsSync(uploadedImageRoot)) {
    fs_1.default.mkdirSync(uploadedImageRoot, { recursive: true });
}
function fileFilter(_req, file, cb) {
    const allowedMimeTypes = [
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
    ];
    if (!allowedMimeTypes.includes(file.mimetype)) {
        cb(new Error('Only image files are allowed'));
        return;
    }
    cb(null, true);
}
exports.upload = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024,
    },
});
