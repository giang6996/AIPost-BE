"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const app_1 = __importDefault(require("../app"));
const helpers_1 = require("./helpers");
describe('admin users', () => {
    it('lists, creates, updates, and resets user password', async () => {
        const { token } = await (0, helpers_1.registerAndLoginAdmin)();
        const listRes = await (0, supertest_1.default)(app_1.default)
            .get('/admin/users')
            .set('Authorization', `Bearer ${token}`);
        expect(listRes.status).toBe(200);
        expect(Array.isArray(listRes.body.data)).toBe(true);
        const createRes = await (0, supertest_1.default)(app_1.default)
            .post('/admin/users')
            .set('Authorization', `Bearer ${token}`)
            .send({
            name: 'Editor User',
            email: 'editor@example.com',
            password: 'Password123!',
            roleName: 'editor',
            status: 'ACTIVE',
        });
        if (createRes.status !== 201) {
            // eslint-disable-next-line no-console
            console.log('admin create user error:', createRes.status, createRes.body);
        }
        expect(createRes.status).toBe(201);
        expect(createRes.body.data.email).toBe('editor@example.com');
        const userId = createRes.body.data.id;
        const updateRes = await (0, supertest_1.default)(app_1.default)
            .put(`/admin/users/${userId}`)
            .set('Authorization', `Bearer ${token}`)
            .send({
            name: 'Editor Updated',
        });
        expect(updateRes.status).toBe(200);
        expect(updateRes.body.data.name).toBe('Editor Updated');
        const statusRes = await (0, supertest_1.default)(app_1.default)
            .patch(`/admin/users/${userId}/status`)
            .set('Authorization', `Bearer ${token}`)
            .send({ status: 'SUSPENDED' });
        expect(statusRes.status).toBe(200);
        expect(statusRes.body.data.status).toBe('SUSPENDED');
        const resetRes = await (0, supertest_1.default)(app_1.default)
            .put(`/admin/users/${userId}/password`)
            .set('Authorization', `Bearer ${token}`)
            .send({ newPassword: 'NewPassword123!' });
        if (resetRes.status !== 200) {
            // eslint-disable-next-line no-console
            console.log('admin reset password error:', resetRes.status, resetRes.body);
        }
        expect(resetRes.status).toBe(200);
        const reactivateRes = await (0, supertest_1.default)(app_1.default)
            .patch(`/admin/users/${userId}/status`)
            .set('Authorization', `Bearer ${token}`)
            .send({ status: 'ACTIVE' });
        expect(reactivateRes.status).toBe(200);
        const loginRes = await (0, supertest_1.default)(app_1.default).post('/auth/login').send({
            email: 'editor@example.com',
            password: 'NewPassword123!',
        });
        expect(loginRes.status).toBe(200);
        expect(loginRes.body.success).toBe(true);
    });
});
