"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// All admin routes require authentication + ADMIN role
router.use(auth_middleware_1.authenticate, (0, auth_middleware_1.requireRole)('ADMIN'));
// GET /api/admin/dashboard
router.get('/dashboard', async (_req, res) => {
    try {
        const [pendingLeads, kycPending, activeUsers, liveProjects] = await Promise.all([
            prisma_1.default.callbackRequest.count({ where: { status: 'PENDING' } }),
            prisma_1.default.developerProfile.count({ where: { kycStatus: 'PENDING' } }),
            prisma_1.default.user.count({ where: { isBlocked: false } }),
            prisma_1.default.property.count({ where: { listingStatus: 'ACTIVE' } }),
        ]);
        const recentLeads = await prisma_1.default.callbackRequest.findMany({
            include: {
                user: { select: { name: true, phone: true } },
                property: { select: { name: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 5,
        });
        const settings = await prisma_1.default.platformSettings.findFirst({ where: { id: 'default' } });
        res.json({
            stats: { pendingLeads, kycPending, activeUsers, liveProjects },
            recentLeads,
            settings,
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch dashboard' });
    }
});
// GET /api/admin/leads
router.get('/leads', async (req, res) => {
    try {
        const { status, page = '1', limit = '20' } = req.query;
        const where = {};
        if (status)
            where.status = status;
        const [leads, total] = await Promise.all([
            prisma_1.default.callbackRequest.findMany({
                where,
                include: {
                    user: { select: { name: true, phone: true } },
                    property: {
                        select: { name: true, city: true, locality: true, developer: { select: { companyName: true } } },
                    },
                },
                orderBy: { createdAt: 'desc' },
                skip: (parseInt(page) - 1) * parseInt(limit),
                take: parseInt(limit),
            }),
            prisma_1.default.callbackRequest.count({ where }),
        ]);
        res.json({ leads, total });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch leads' });
    }
});
// PUT /api/admin/leads/:id
router.put('/leads/:id', async (req, res) => {
    try {
        const { status, adminNotes, rejectionReason } = req.body;
        const updateData = { status, adminNotes };
        if (status === 'VALIDATED')
            updateData.validatedAt = new Date();
        if (status === 'CONNECTED')
            updateData.connectedAt = new Date();
        if (status === 'REJECTED') {
            updateData.rejectedAt = new Date();
            updateData.rejectionReason = rejectionReason;
        }
        const lead = await prisma_1.default.callbackRequest.update({
            where: { id: req.params.id },
            data: updateData,
            include: {
                user: { select: { id: true, name: true } },
                property: { select: { name: true, developer: { select: { userId: true } } } },
            },
        });
        // Create notifications based on status
        if (status === 'VALIDATED') {
            await prisma_1.default.notification.create({
                data: {
                    userId: lead.userId,
                    type: 'CALLBACK_VALIDATED',
                    title: 'Callback Request Validated ✓',
                    body: `Your interest in ${lead.property.name} has been confirmed. OdishaInfra will connect you shortly.`,
                    data: { leadId: lead.id, propertyId: lead.propertyId },
                },
            });
        }
        if (status === 'CONNECTED') {
            // Notify both customer and developer
            await prisma_1.default.notification.createMany({
                data: [
                    {
                        userId: lead.userId,
                        type: 'CALLBACK_CONNECTED',
                        title: 'Connected with Developer 🎉',
                        body: `You've been connected with the developer of ${lead.property.name}.`,
                        data: { leadId: lead.id },
                    },
                    {
                        userId: lead.property.developer.userId,
                        type: 'LEAD_RECEIVED',
                        title: 'New Lead Connected',
                        body: `OdishaInfra has validated and connected a lead for ${lead.property.name}.`,
                        data: { leadId: lead.id },
                    },
                ],
            });
        }
        res.json({ success: true, lead });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to update lead' });
    }
});
// GET /api/admin/kyc
router.get('/kyc', async (req, res) => {
    try {
        const { status } = req.query;
        const where = {};
        if (status)
            where.kycStatus = status;
        const developers = await prisma_1.default.developerProfile.findMany({
            where,
            include: { user: { select: { name: true, phone: true, createdAt: true } } },
            orderBy: { createdAt: 'desc' },
        });
        res.json({ developers });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch KYC list' });
    }
});
// PUT /api/admin/kyc/:id
router.put('/kyc/:id', async (req, res) => {
    try {
        const { status, reviewNotes } = req.body;
        const kycStatus = status === 'APPROVED' ? 'APPROVED' : 'REJECTED';
        const profile = await prisma_1.default.developerProfile.update({
            where: { id: req.params.id },
            data: {
                kycStatus,
                kycReviewedAt: new Date(),
                kycReviewNotes: reviewNotes,
            },
        });
        // Notify developer
        await prisma_1.default.notification.create({
            data: {
                userId: profile.userId,
                type: 'KYC_UPDATE',
                title: kycStatus === 'APPROVED' ? 'KYC Approved ✓' : 'KYC Rejected',
                body: kycStatus === 'APPROVED'
                    ? 'Your developer KYC has been verified. You can now list properties.'
                    : `KYC rejected: ${reviewNotes || 'Please resubmit with valid documents.'}`,
            },
        });
        res.json({ success: true, profile });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to update KYC' });
    }
});
// GET /api/admin/listings
router.get('/listings', async (req, res) => {
    try {
        const { status, featured, page = '1', limit = '20' } = req.query;
        const where = {};
        if (status)
            where.listingStatus = status;
        if (featured === 'true')
            where.isFeatured = true;
        const [listings, total] = await Promise.all([
            prisma_1.default.property.findMany({
                where,
                include: {
                    media: { take: 1, orderBy: { sortOrder: 'asc' } },
                    developer: { select: { companyName: true } },
                },
                orderBy: { createdAt: 'desc' },
                skip: (parseInt(page) - 1) * parseInt(limit),
                take: parseInt(limit),
            }),
            prisma_1.default.property.count({ where }),
        ]);
        res.json({ listings, total });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch listings' });
    }
});
// PUT /api/admin/listings/:id
router.put('/listings/:id', async (req, res) => {
    try {
        const { listingStatus, isFeatured, reviewNotes, rejectionReason } = req.body;
        const updateData = {};
        if (listingStatus) {
            updateData.listingStatus = listingStatus;
            updateData.reviewedAt = new Date();
        }
        if (typeof isFeatured === 'boolean')
            updateData.isFeatured = isFeatured;
        if (reviewNotes)
            updateData.reviewNotes = reviewNotes;
        if (rejectionReason)
            updateData.rejectionReason = rejectionReason;
        const listing = await prisma_1.default.property.update({
            where: { id: req.params.id },
            data: updateData,
        });
        res.json({ success: true, listing });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to update listing' });
    }
});
// GET /api/admin/users
router.get('/users', async (req, res) => {
    try {
        const { role, blocked, search, page = '1', limit = '20' } = req.query;
        const where = {};
        if (role)
            where.role = role;
        if (blocked === 'true')
            where.isBlocked = true;
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search } },
                { email: { contains: search, mode: 'insensitive' } },
            ];
        }
        const [users, total] = await Promise.all([
            prisma_1.default.user.findMany({
                where,
                select: {
                    id: true, phone: true, name: true, email: true, role: true,
                    isBlocked: true, isVerified: true, createdAt: true, lastLoginAt: true,
                    _count: { select: { callbackRequests: true, wishlists: true } },
                },
                orderBy: { createdAt: 'desc' },
                skip: (parseInt(page) - 1) * parseInt(limit),
                take: parseInt(limit),
            }),
            prisma_1.default.user.count({ where }),
        ]);
        res.json({ users, total });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});
// PUT /api/admin/users/:id
router.put('/users/:id', async (req, res) => {
    try {
        const { isBlocked, role } = req.body;
        const updateData = {};
        if (typeof isBlocked === 'boolean')
            updateData.isBlocked = isBlocked;
        if (role)
            updateData.role = role;
        const user = await prisma_1.default.user.update({
            where: { id: req.params.id },
            data: updateData,
        });
        res.json({ success: true, user });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to update user' });
    }
});
// POST /api/admin/notifications/push
router.post('/notifications/push', async (req, res) => {
    try {
        const { title, body, targetAudience = 'ALL', targetRole = 'CUSTOMER' } = req.body;
        if (!title || !body)
            return res.status(400).json({ error: 'Title and body required' });
        // Get target users
        const userWhere = { isBlocked: false, role: targetRole };
        const userCount = await prisma_1.default.user.count({ where: userWhere });
        // Create campaign record
        const campaign = await prisma_1.default.pushCampaign.create({
            data: { title, body, targetAudience, targetRole, sentCount: userCount },
        });
        // In production: send via FCM here
        console.log(`📨 Push notification sent to ${userCount} users`);
        res.json({ success: true, campaign, sentTo: userCount });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to send push notification' });
    }
});
// GET /api/admin/notifications/campaigns
router.get('/notifications/campaigns', async (_req, res) => {
    try {
        const campaigns = await prisma_1.default.pushCampaign.findMany({
            orderBy: { sentAt: 'desc' },
            take: 20,
        });
        res.json({ campaigns });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch campaigns' });
    }
});
// GET /api/admin/analytics
router.get('/analytics', async (_req, res) => {
    try {
        const [totalUsers, totalProperties, totalLeads, totalShortViews] = await Promise.all([
            prisma_1.default.user.count({ where: { isBlocked: false } }),
            prisma_1.default.property.count({ where: { listingStatus: 'ACTIVE' } }),
            prisma_1.default.callbackRequest.count(),
            prisma_1.default.short.aggregate({ _sum: { viewCount: true } }),
        ]);
        const totalPropertyViews = await prisma_1.default.property.aggregate({ _sum: { viewCount: true } });
        const leadsValidated = await prisma_1.default.callbackRequest.count({ where: { status: 'VALIDATED' } });
        const leadsConnected = await prisma_1.default.callbackRequest.count({ where: { status: 'CONNECTED' } });
        res.json({
            totalUsers,
            totalProperties,
            totalLeads,
            leadsValidated,
            leadsConnected,
            totalPropertyViews: totalPropertyViews._sum.viewCount || 0,
            totalShortViews: totalShortViews._sum.viewCount || 0,
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch analytics' });
    }
});
// GET /api/admin/settings
router.get('/settings', async (_req, res) => {
    try {
        let settings = await prisma_1.default.platformSettings.findFirst({ where: { id: 'default' } });
        if (!settings) {
            settings = await prisma_1.default.platformSettings.create({ data: { id: 'default' } });
        }
        res.json({ settings });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});
// PUT /api/admin/settings
router.put('/settings', async (req, res) => {
    try {
        const settings = await prisma_1.default.platformSettings.upsert({
            where: { id: 'default' },
            create: { id: 'default', ...req.body },
            update: req.body,
        });
        res.json({ success: true, settings });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to update settings' });
    }
});
exports.default = router;
//# sourceMappingURL=admin.routes.js.map