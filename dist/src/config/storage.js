"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.storagePaths = void 0;
exports.ensureStorageDirectories = ensureStorageDirectories;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const uploadsRoot = path_1.default.resolve(process.cwd(), 'uploads');
const uploadedImageRoot = path_1.default.join(uploadsRoot, 'uploaded');
const generatedImageRoot = path_1.default.join(uploadsRoot, 'generated');
function ensureStorageDirectories() {
    const dirs = [uploadedImageRoot, generatedImageRoot, uploadedImageRoot];
    for (const dir of dirs) {
        if (!fs_1.default.existsSync(dir)) {
            fs_1.default.mkdirSync(dir, { recursive: true });
        }
    }
}
exports.storagePaths = {
    uploadsRoot,
    generatedImageRoot,
    uploadedImageRoot,
};
