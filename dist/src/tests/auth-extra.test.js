"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const app_1 = __importDefault(require("../app"));
const helpers_1 = require("./helpers");
describe('auth extras', () => {
    it('updates profile and changes password', async () => {
        const { token, email, password } = await (0, helpers_1.registerAndLoginUser)({
            name: 'Profile User',
            email: 'profile@example.com',
            password: 'Password123!',
        });
        const updateRes = await (0, supertest_1.default)(app_1.default)
            .put('/auth/profile')
            .set('Authorization', `Bearer ${token}`)
            .send({ name: 'Updated User' });
        if (updateRes.status !== 200) {
            // eslint-disable-next-line no-console
            console.log('auth update profile error:', updateRes.status, updateRes.body);
        }
        expect(updateRes.status).toBe(200);
        expect(updateRes.body.data.name).toBe('Updated User');
        const changeRes = await (0, supertest_1.default)(app_1.default)
            .put('/auth/password')
            .set('Authorization', `Bearer ${token}`)
            .send({
            currentPassword: password,
            newPassword: 'NewPassword123!',
        });
        if (changeRes.status !== 200) {
            // eslint-disable-next-line no-console
            console.log('auth change password error:', changeRes.status, changeRes.body);
        }
        expect(changeRes.status).toBe(200);
        const oldLoginRes = await (0, supertest_1.default)(app_1.default).post('/auth/login').send({
            email,
            password,
        });
        expect(oldLoginRes.status).toBe(401);
        const newLoginRes = await (0, supertest_1.default)(app_1.default).post('/auth/login').send({
            email,
            password: 'NewPassword123!',
        });
        expect(newLoginRes.status).toBe(200);
        expect(newLoginRes.body.success).toBe(true);
    });
});
