"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkDatabaseHealth = checkDatabaseHealth;
const prisma_1 = require("../lib/prisma");
async function checkDatabaseHealth() {
    // Readiness checks should prove the app can actually reach PostgreSQL.
    // A tiny query to verify connectivity
    await prisma_1.prisma.$queryRaw `SELECT 1`;
    return {
        database: 'ok',
    };
}
