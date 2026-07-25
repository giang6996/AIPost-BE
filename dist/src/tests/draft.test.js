"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const app_1 = __importDefault(require("../app"));
const helpers_1 = require("./helpers");
describe('drafts', () => {
    it('creates, fetches, updates, and deletes a draft', async () => {
        const { token } = await (0, helpers_1.registerAndLoginUser)();
        const createRes = await (0, supertest_1.default)(app_1.default)
            .post('/drafts')
            .set('Authorization', `Bearer ${token}`)
            .send({
            title: 'My Draft',
            contentHtml: '<article><p>Hello</p></article>',
        });
        expect(createRes.status).toBe(201);
        const draftId = createRes.body.data.id;
        const getRes = await (0, supertest_1.default)(app_1.default)
            .get(`/drafts/${draftId}`)
            .set('Authorization', `Bearer ${token}`);
        expect(getRes.status).toBe(200);
        expect(getRes.body.data.title).toBe('My Draft');
        const updateRes = await (0, supertest_1.default)(app_1.default)
            .put(`/drafts/${draftId}`)
            .set('Authorization', `Bearer ${token}`)
            .send({
            title: 'Updated Draft',
        });
        expect(updateRes.status).toBe(200);
        expect(updateRes.body.data.title).toBe('Updated Draft');
        const deleteRes = await (0, supertest_1.default)(app_1.default)
            .delete(`/drafts/${draftId}`)
            .set('Authorization', `Bearer ${token}`);
        expect(deleteRes.status).toBe(200);
    });
    it('lists drafts and validates ids', async () => {
        const { token } = await (0, helpers_1.registerAndLoginUser)();
        const listRes = await (0, supertest_1.default)(app_1.default)
            .get('/drafts')
            .set('Authorization', `Bearer ${token}`);
        expect(listRes.status).toBe(200);
        expect(Array.isArray(listRes.body.data)).toBe(true);
        const invalidIdRes = await (0, supertest_1.default)(app_1.default)
            .get('/drafts/abc')
            .set('Authorization', `Bearer ${token}`);
        expect(invalidIdRes.status).toBe(400);
        const notFoundRes = await (0, supertest_1.default)(app_1.default)
            .get('/drafts/99999')
            .set('Authorization', `Bearer ${token}`);
        expect(notFoundRes.status).toBe(404);
    });
});
