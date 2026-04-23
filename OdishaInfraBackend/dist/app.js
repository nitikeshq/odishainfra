"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const prisma_1 = __importDefault(require("./lib/prisma"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const customer_routes_1 = __importDefault(require("./routes/customer.routes"));
const developer_routes_1 = __importDefault(require("./routes/developer.routes"));
const admin_routes_1 = __importDefault(require("./routes/admin.routes"));
const subscription_routes_1 = __importDefault(require("./routes/subscription.routes"));
const upload_routes_1 = __importDefault(require("./routes/upload.routes"));
const amenity_routes_1 = __importDefault(require("./routes/amenity.routes"));
const commission_routes_1 = __importDefault(require("./routes/commission.routes"));
const website_routes_1 = __importDefault(require("./routes/website.routes"));
const app = (0, express_1.default)();
// ─── SECURITY ────────────────────────────────────────────────────────────────
app.use((0, helmet_1.default)());
const corsOptions = {
    origin: process.env.NODE_ENV === 'production'
        ? ['https://odishainfra.com', 'https://admin.odishainfra.com', 'https://api.odishainfra.com']
        : true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    credentials: true,
};
app.use((0, cors_1.default)(corsOptions));
// General API limiter: 100 req / 15 min per IP
const apiLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});
// Stricter limiter for auth endpoints: 10 req / 15 min per IP
const authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: 'Too many auth attempts, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});
// Correlation ID — attach before logging so it appears in morgan output
app.use((req, res, next) => {
    const requestId = req.headers['x-request-id'] || Math.random().toString(36).substring(2, 15);
    req.headers['x-request-id'] = requestId;
    res.setHeader('X-Request-ID', requestId);
    next();
});
// ─── GENERAL MIDDLEWARE ──────────────────────────────────────────────────────
app.use((0, morgan_1.default)('dev'));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Apply rate limiting
app.use('/api/auth', authLimiter);
app.use('/api', apiLimiter);
// ─── HEALTH CHECK ────────────────────────────────────────────────────────────
app.get('/api/health', async (_req, res) => {
    try {
        await prisma_1.default.$queryRaw `SELECT 1`;
        res.json({
            status: 'ok',
            service: 'OdishaInfra API',
            version: '1.0.0',
            database: 'connected',
            timestamp: new Date().toISOString(),
        });
    }
    catch {
        res.status(503).json({ status: 'error', database: 'disconnected' });
    }
});
// Routes
app.use('/api/auth', auth_routes_1.default);
app.use('/api', customer_routes_1.default);
app.use('/api/developer', developer_routes_1.default);
app.use('/api/admin', admin_routes_1.default);
app.use('/api/subscriptions', subscription_routes_1.default);
app.use('/api/uploads', upload_routes_1.default);
app.use('/api/amenities', amenity_routes_1.default);
app.use('/api/commissions', commission_routes_1.default);
app.use('/api/website', website_routes_1.default);
// 404 handler
app.use((_req, res) => {
    res.status(404).json({ error: 'Route not found' });
});
// Error handler
app.use((err, _req, res, _next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        error: err.message || 'Internal server error',
    });
});
exports.default = app;
//# sourceMappingURL=app.js.map