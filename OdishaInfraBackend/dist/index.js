"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const app_1 = __importDefault(require("./app"));
const prisma_1 = __importDefault(require("./lib/prisma"));
const PORT = process.env.PORT || 5001;
const server = app_1.default.listen(PORT, () => {
    console.log(`🚀 OdishaInfra API running on port ${PORT}`);
    console.log(`📦 Environment: ${process.env.NODE_ENV}`);
});
server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use`);
    }
    else {
        console.error('Server error:', err);
    }
    process.exit(1);
});
const shutdown = async (signal) => {
    console.log(`${signal} received. Shutting down gracefully...`);
    server.close(async () => {
        await prisma_1.default.$disconnect();
        process.exit(0);
    });
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
//# sourceMappingURL=index.js.map