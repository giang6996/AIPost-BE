"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
const vitest_1 = require("vitest");
const storage_1 = require("../config/storage");
dotenv_1.default.config({ path: '.env.test' });
let prisma;
async function getPrisma() {
    if (!prisma) {
        prisma = (await import('../lib/prisma.js')).prisma;
    }
    return prisma;
}
(0, vitest_1.beforeAll)(async () => {
    process.env.NODE_ENV = 'test';
    (0, storage_1.ensureStorageDirectories)();
});
(0, vitest_1.beforeEach)(async () => {
    const prismaClient = await getPrisma();
    await prismaClient.userSession.deleteMany();
    await prismaClient.userCredential.deleteMany();
    await prismaClient.aiProviderConfig.deleteMany();
    await prismaClient.draftImage.deleteMany();
    await prismaClient.draftSeoMeta.deleteMany();
    await prismaClient.wpPostSync.deleteMany();
    await prismaClient.draft.deleteMany();
    await prismaClient.wpSite.deleteMany();
    await prismaClient.usageLog.deleteMany();
    await prismaClient.user.deleteMany();
    await prismaClient.role.deleteMany();
    await prismaClient.role.createMany({
        data: [
            { name: 'admin', description: 'Administrator' },
            { name: 'editor', description: 'Editor' },
        ],
        skipDuplicates: true,
    });
    const uploadsRoot = path_1.default.resolve(process.cwd(), 'uploads');
    if (fs_1.default.existsSync(uploadsRoot)) {
        try {
            fs_1.default.rmSync(uploadsRoot, { recursive: true, force: true });
        }
        catch (error) {
            // Ignore occasional Windows file lock errors during tests
        }
    }
    (0, storage_1.ensureStorageDirectories)();
});
(0, vitest_1.afterAll)(async () => {
    if (prisma) {
        await prisma.$disconnect();
    }
});
