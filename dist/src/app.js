"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const siteRoute_1 = __importDefault(require("./routes/siteRoute"));
const draftRoute_1 = __importDefault(require("./routes/draftRoute"));
const mediaRoutes_1 = __importDefault(require("./routes/mediaRoutes"));
const aiRoute_1 = __importDefault(require("./routes/aiRoute"));
const authRoute_1 = __importDefault(require("./routes/authRoute"));
const adminRoute_1 = __importDefault(require("./routes/adminRoute"));
const env_js_1 = require("./config/env.js");
const dbHealthCheck_1 = require("./utils/dbHealthCheck");
const app = (0, express_1.default)();
const cors = require('cors');
app.use(cors({
    // CORS must stay strict because API uses credentialed browser requests.
    // Only explicitly allowed frontend origins should be able to call it from the browser.
    origin: env_js_1.env.corsOrigins,
    credentials: true,
}));
app.use(express_1.default.json({ limit: '50mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express_1.default.static(path_1.default.resolve(process.cwd(), 'uploads')));
app.get('/health', (_req, res) => {
    res.json({
        success: true,
        message: 'Server is running',
    });
});
app.get('/health/ready', async (_req, res) => {
    try {
        const checks = await (0, dbHealthCheck_1.checkDatabaseHealth)();
        // Readiness should only pass when the app can actually reach PostgreSQL.
        res.status(200).json({
            success: true,
            ready: true,
            checks,
        });
    }
    catch {
        // Keep the failure response generic so probes can see the state without
        // exposing connection details or other internal runtime information.
        res.status(503).json({
            success: false,
            ready: false,
            checks: {
                database: 'down',
            },
            message: 'Database readiness check failed',
        });
    }
});
app.use('/admin', adminRoute_1.default);
app.use('/auth', authRoute_1.default);
app.use('/ai', aiRoute_1.default);
app.use('/sites', siteRoute_1.default);
app.use('/drafts', draftRoute_1.default);
app.use('/', mediaRoutes_1.default);
exports.default = app;
