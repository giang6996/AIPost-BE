"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkDatabaseHealth = checkDatabaseHealth;
const prisma_1 = require("../lib/prisma");
async function checkDatabaseHealth() {
    // Readiness checks should prove the app can actually reach PostgreSQL.
    // A tiny query is enough here because we only need to verify connectivity,
    // not run any business logic or load any application state.
    await prisma_1.prisma.$queryRaw `SELECT 1`;
    return {
        database: 'ok',
    };
}
