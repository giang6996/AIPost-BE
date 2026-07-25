"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const app_1 = __importDefault(require("../app"));
describe('auth', () => {
    it('registers, logs in, gets current user, and logs out', async () => {
        const registerRes = await (0, supertest_1.default)(app_1.default).post('/auth/register').send({
            name: 'Test User',
            email: 'test@example.com',
            password: 'Password123!',
        });
        expect(registerRes.status).toBe(201);
        expect(registerRes.body.success).toBe(true);
        const loginRes = await (0, supertest_1.default)(app_1.default).post('/auth/login').send({
            email: 'test@example.com',
            password: 'Password123!',
        });
        expect(loginRes.status).toBe(200);
        expect(loginRes.body.success).toBe(true);
        const token = loginRes.body.data.token;
        expect(token).toBeTruthy();
        const meRes = await (0, supertest_1.default)(app_1.default)
            .get('/auth/me')
            .set('Authorization', `Bearer ${token}`);
        expect(meRes.status).toBe(200);
        expect(meRes.body.data.email).toBe('test@example.com');
        const logoutRes = await (0, supertest_1.default)(app_1.default)
            .post('/auth/logout')
            .set('Authorization', `Bearer ${token}`);
        expect(logoutRes.status).toBe(200);
        const meAfterLogoutRes = await (0, supertest_1.default)(app_1.default)
            .get('/auth/me')
            .set('Authorization', `Bearer ${token}`);
        expect(meAfterLogoutRes.status).toBe(401);
    });
});
