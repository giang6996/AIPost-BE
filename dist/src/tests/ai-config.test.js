"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const app_1 = __importDefault(require("../app"));
const helpers_1 = require("./helpers");
describe('ai config', () => {
    it('saves, gets, and deletes openai config', async () => {
        const { token } = await (0, helpers_1.registerAndLoginUser)();
        const saveRes = await (0, supertest_1.default)(app_1.default)
            .post('/ai/config')
            .set('Authorization', `Bearer ${token}`)
            .send({
            apiKey: 'sk-test-key',
            defaultTextModel: 'gpt-5.4',
            defaultImageModel: 'gpt-image-1.5',
        });
        expect(saveRes.status).toBe(200);
        expect(saveRes.body.success).toBe(true);
        const getRes = await (0, supertest_1.default)(app_1.default)
            .get('/ai/config')
            .set('Authorization', `Bearer ${token}`);
        expect(getRes.status).toBe(200);
        expect(getRes.body.data.hasApiKey).toBe(true);
        const deleteRes = await (0, supertest_1.default)(app_1.default)
            .delete('/ai/config')
            .set('Authorization', `Bearer ${token}`);
        expect(deleteRes.status).toBe(200);
        const getAfterDeleteRes = await (0, supertest_1.default)(app_1.default)
            .get('/ai/config')
            .set('Authorization', `Bearer ${token}`);
        expect(getAfterDeleteRes.status).toBe(200);
    });
});
