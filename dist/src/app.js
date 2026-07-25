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
const app = (0, express_1.default)();
const cors = require('cors');
app.use(cors({
    origin: 'http://localhost:5173',
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
app.use('/admin', adminRoute_1.default);
app.use('/auth', authRoute_1.default);
app.use('/ai', aiRoute_1.default);
app.use('/sites', siteRoute_1.default);
app.use('/drafts', draftRoute_1.default);
app.use('/', mediaRoutes_1.default);
exports.default = app;
