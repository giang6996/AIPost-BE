"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.upload = void 0;
const fs_1 = __importDefault(require("fs"));
const multer_1 = __importDefault(require("multer"));
const storage_1 = require("../config/storage");
if (!fs_1.default.existsSync(storage_1.storagePaths.uploadedImageRoot)) {
    fs_1.default.mkdirSync(storage_1.storagePaths.uploadedImageRoot, { recursive: true });
}
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, storage_1.storagePaths.uploadedImageRoot);
    },
    filename: (_req, file, cb) => {
        const timestamp = Date.now();
        const safeOriginalName = file.originalname.replace(/\s+/g, '_');
        cb(null, `${timestamp}-${safeOriginalName}`);
    },
});
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
