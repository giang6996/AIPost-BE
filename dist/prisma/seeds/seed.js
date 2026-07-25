"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function main() {
    const passwordHash = bcryptjs_1.default.hashSync('test123@2abc', 12);
    const adminRole = await prisma.role.upsert({
        where: { name: 'admin' },
        update: {},
        create: {
            name: 'admin',
            description: 'System administrator',
        },
    });
    await prisma.role.upsert({
        where: { name: 'editor' },
        update: {},
        create: {
            name: 'editor',
            description: 'Content editor',
        },
    });
    await prisma.user.upsert({
        where: { id: 1 },
        update: {
            name: 'admin',
            email: 'test@gmail.com',
            roleId: adminRole.id,
        },
        create: {
            id: 1,
            name: 'admin',
            email: 'test@gmail.com',
            roleId: adminRole.id,
        },
    });
    await prisma.userCredential.upsert({
        where: { userId: 1 },
        update: {
            passwordHash,
        },
        create: {
            userId: 1,
            passwordHash,
        },
    });
    console.log('Roles and admin user seeded successfully');
}
main()
    .catch((error) => {
    console.error(error);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
