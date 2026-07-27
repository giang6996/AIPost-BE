"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const vitest_1 = require("vitest");
const app_1 = __importDefault(require("../app"));
const prisma_1 = require("../lib/prisma");
(0, vitest_1.describe)('health checks', () => {
    (0, vitest_1.afterEach)(() => {
        vitest_1.vi.restoreAllMocks();
    });
    (0, vitest_1.it)('reports the process as alive', async () => {
        const res = await (0, supertest_1.default)(app_1.default).get('/health');
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.success).toBe(true);
        (0, vitest_1.expect)(res.body.message).toBe('Server is running');
    });
    (0, vitest_1.it)('reports readiness when PostgreSQL is reachable', async () => {
        const res = await (0, supertest_1.default)(app_1.default).get('/health/ready');
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(res.body.success).toBe(true);
        (0, vitest_1.expect)(res.body.ready).toBe(true);
        (0, vitest_1.expect)(res.body.checks.database).toBe('ok');
    });
    (0, vitest_1.it)('reports not ready when the database check fails', async () => {
        // Simulate a database outage without changing the test database itself.
        // This verifies the readiness endpoint behavior that Kubernetes or an ALB would see.
        vitest_1.vi.spyOn(prisma_1.prisma, '$queryRaw')
            .mockRejectedValueOnce(new Error('PostgreSQL unreachable'));
        const res = await (0, supertest_1.default)(app_1.default).get('/health/ready');
        (0, vitest_1.expect)(res.status).toBe(503);
        (0, vitest_1.expect)(res.body.success).toBe(false);
        (0, vitest_1.expect)(res.body.ready).toBe(false);
        (0, vitest_1.expect)(res.body.checks.database).toBe('down');
    });
});
