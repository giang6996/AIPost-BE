"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerAndLoginUser = registerAndLoginUser;
exports.registerAndLoginAdmin = registerAndLoginAdmin;
const supertest_1 = __importDefault(require("supertest"));
const app_1 = __importDefault(require("../app"));
async function registerAndLoginUser(input) {
    const name = input?.name ?? 'admin';
    const email = input?.email ?? 'test@gmail.com';
    const password = input?.password ?? 'test123@abc';
    await (0, supertest_1.default)(app_1.default).post('/auth/register').send({
        name,
        email,
        password,
    });
    const loginRes = await (0, supertest_1.default)(app_1.default).post('/auth/login').send({
        email,
        password,
    });
    const token = loginRes.body?.data?.token;
    return {
        token,
        email,
        password,
    };
}
async function registerAndLoginAdmin() {
    const adminRole = await (await import('../lib/prisma.js')).prisma.role.findUnique({
        where: { name: 'admin' },
    });
    const prisma = (await import('../lib/prisma.js')).prisma;
    const user = await prisma.user.create({
        data: {
            name: 'Admin User',
            email: 'admin@example.com',
            roleId: adminRole.id,
            status: 'ACTIVE',
            credential: {
                create: {
                    passwordHash: await (await import('../utils/password.js')).hashPassword('Password123!'),
                },
            },
        },
    });
    const loginRes = await (0, supertest_1.default)(app_1.default).post('/auth/login').send({
        email: 'admin@example.com',
        password: 'Password123!',
    });
    return {
        token: loginRes.body?.data?.token,
        userId: user.id,
    };
}
