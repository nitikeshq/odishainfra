"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// GET /api/subscriptions/plans
router.get('/plans', async (_req, res) => {
    try {
        const plans = await prisma_1.default.subscriptionPlan.findMany({
            where: { isActive: true },
            orderBy: { priceMonthly: 'asc' },
        });
        res.json({ plans });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch plans' });
    }
});
// POST /api/subscriptions/subscribe
router.post('/subscribe', auth_middleware_1.authenticate, (0, auth_middleware_1.requireRole)('DEVELOPER'), async (req, res) => {
    try {
        // Check if subscriptions are enabled
        const settings = await prisma_1.default.platformSettings.findFirst({ where: { id: 'default' } });
        if (!settings?.subscriptionEnabled) {
            return res.status(400).json({ error: 'Subscriptions are currently disabled. Listing is free.' });
        }
        const { planId, paymentRef } = req.body;
        if (!planId)
            return res.status(400).json({ error: 'Plan ID required' });
        const profile = await prisma_1.default.developerProfile.findUnique({ where: { userId: req.user.id } });
        if (!profile)
            return res.status(404).json({ error: 'Developer profile not found' });
        const plan = await prisma_1.default.subscriptionPlan.findUnique({ where: { id: planId } });
        if (!plan)
            return res.status(404).json({ error: 'Plan not found' });
        const startDate = new Date();
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + 1);
        const subscription = await prisma_1.default.developerSubscription.upsert({
            where: { developerId: profile.id },
            create: {
                developerId: profile.id,
                planId,
                status: 'ACTIVE',
                startDate,
                endDate,
                paymentRef,
            },
            update: {
                planId,
                status: 'ACTIVE',
                startDate,
                endDate,
                paymentRef,
            },
        });
        res.json({ success: true, subscription });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to subscribe' });
    }
});
// GET /api/subscriptions/status
router.get('/status', auth_middleware_1.authenticate, (0, auth_middleware_1.requireRole)('DEVELOPER'), async (req, res) => {
    try {
        const profile = await prisma_1.default.developerProfile.findUnique({ where: { userId: req.user.id } });
        if (!profile)
            return res.status(404).json({ error: 'Developer profile not found' });
        const subscription = await prisma_1.default.developerSubscription.findUnique({
            where: { developerId: profile.id },
            include: { plan: true },
        });
        const settings = await prisma_1.default.platformSettings.findFirst({ where: { id: 'default' } });
        res.json({
            subscription,
            subscriptionRequired: settings?.subscriptionEnabled || false,
            freeListingEnabled: settings?.freeListingEnabled || true,
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch subscription status' });
    }
});
exports.default = router;
//# sourceMappingURL=subscription.routes.js.map