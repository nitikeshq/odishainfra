"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const subscription_middleware_1 = require("../middleware/subscription.middleware");
const router = (0, express_1.Router)();
// All developer routes require authentication + DEVELOPER role
router.use(auth_middleware_1.authenticate, (0, auth_middleware_1.requireRole)('DEVELOPER'));
// GET /api/developer/dashboard
router.get('/dashboard', async (req, res) => {
    try {
        const profile = await prisma_1.default.developerProfile.findUnique({
            where: { userId: req.user.id },
        });
        if (!profile)
            return res.status(404).json({ error: 'Developer profile not found' });
        const [activeProjects, totalInterests, pendingCallbacks, shortViews] = await Promise.all([
            prisma_1.default.property.count({ where: { developerId: profile.id, listingStatus: 'ACTIVE' } }),
            prisma_1.default.callbackRequest.count({ where: { property: { developerId: profile.id } } }),
            prisma_1.default.callbackRequest.count({ where: { property: { developerId: profile.id }, status: 'PENDING' } }),
            prisma_1.default.short.aggregate({ where: { property: { developerId: profile.id } }, _sum: { viewCount: true } }),
        ]);
        const recentProjects = await prisma_1.default.property.findMany({
            where: { developerId: profile.id },
            include: { media: { take: 1, orderBy: { sortOrder: 'asc' } } },
            orderBy: { createdAt: 'desc' },
            take: 5,
        });
        res.json({
            profile,
            stats: {
                activeProjects,
                totalInterests,
                pendingCallbacks,
                shortViews: shortViews._sum.viewCount || 0,
            },
            recentProjects,
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch dashboard' });
    }
});
// GET /api/developer/projects
router.get('/projects', async (req, res) => {
    try {
        const profile = await prisma_1.default.developerProfile.findUnique({ where: { userId: req.user.id } });
        if (!profile)
            return res.status(404).json({ error: 'Developer profile not found' });
        const { status, page = '1', limit = '20' } = req.query;
        const where = { developerId: profile.id };
        if (status)
            where.listingStatus = status;
        const [projects, total] = await Promise.all([
            prisma_1.default.property.findMany({
                where,
                include: {
                    media: { take: 1, orderBy: { sortOrder: 'asc' } },
                    _count: { select: { wishlists: true, callbackRequests: true, shorts: true, views: true } },
                },
                orderBy: { createdAt: 'desc' },
                skip: (parseInt(page) - 1) * parseInt(limit),
                take: parseInt(limit),
            }),
            prisma_1.default.property.count({ where }),
        ]);
        res.json({ projects, total });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch projects' });
    }
});
// POST /api/developer/projects — Create property (quick add)
router.post('/projects', subscription_middleware_1.requireSubscription, async (req, res) => {
    try {
        const profile = await prisma_1.default.developerProfile.findUnique({ where: { userId: req.user.id } });
        if (!profile)
            return res.status(404).json({ error: 'Developer profile not found' });
        const { name, propertyType, status, city, description, bhkConfig, priceMin, priceMax, pricePerSqft, emiStarting, areaMin, areaMax, totalFloors, totalUnits, availableUnits, address, locality, pincode, latitude, longitude, reraNumber, possessionDate, amenities, } = req.body;
        if (!name || !propertyType || !status || !city) {
            return res.status(400).json({ error: 'Name, type, status, and city are required' });
        }
        // Generate slug
        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now().toString(36);
        const property = await prisma_1.default.property.create({
            data: {
                developerId: profile.id,
                name, slug, description, propertyType, status,
                city, bhkConfig, priceMin, priceMax, pricePerSqft, emiStarting,
                areaMin, areaMax, totalFloors, totalUnits, availableUnits,
                address, locality, pincode, latitude, longitude,
                reraNumber, reraApproved: !!reraNumber,
                possessionDate: possessionDate ? new Date(possessionDate) : null,
                listingStatus: 'PENDING_REVIEW',
            },
        });
        // Add amenities if provided (expects array of { amenityId, name, icon?, category? })
        if (amenities && Array.isArray(amenities)) {
            await prisma_1.default.propertyAmenity.createMany({
                data: amenities.map((a) => ({
                    propertyId: property.id,
                    amenityId: a.amenityId || a.id,
                    name: a.name,
                    icon: a.icon || null,
                    category: a.category || null,
                })),
            });
        }
        res.status(201).json({ success: true, property });
    }
    catch (error) {
        console.error('Create property error:', error);
        res.status(500).json({ error: 'Failed to create property' });
    }
});
// PUT /api/developer/projects/:id
router.put('/projects/:id', subscription_middleware_1.requireSubscription, async (req, res) => {
    try {
        const profile = await prisma_1.default.developerProfile.findUnique({ where: { userId: req.user.id } });
        if (!profile)
            return res.status(404).json({ error: 'Developer profile not found' });
        const property = await prisma_1.default.property.findFirst({
            where: { id: req.params.id, developerId: profile.id },
        });
        if (!property)
            return res.status(404).json({ error: 'Property not found' });
        const updated = await prisma_1.default.property.update({
            where: { id: req.params.id },
            data: { ...req.body, updatedAt: new Date() },
        });
        res.json({ success: true, property: updated });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to update property' });
    }
});
// DELETE /api/developer/projects/:id (archive)
router.delete('/projects/:id', async (req, res) => {
    try {
        const profile = await prisma_1.default.developerProfile.findUnique({ where: { userId: req.user.id } });
        if (!profile)
            return res.status(404).json({ error: 'Developer profile not found' });
        await prisma_1.default.property.update({
            where: { id: req.params.id },
            data: { listingStatus: 'ARCHIVED' },
        });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to archive property' });
    }
});
// POST /api/developer/shorts
router.post('/shorts', async (req, res) => {
    try {
        const { propertyId, videoUrl, thumbnailUrl, caption, duration } = req.body;
        if (!propertyId || !videoUrl) {
            return res.status(400).json({ error: 'Property and video URL required' });
        }
        const short = await prisma_1.default.short.create({
            data: {
                propertyId,
                uploaderId: req.user.id,
                videoUrl, thumbnailUrl, caption, duration,
            },
        });
        await prisma_1.default.property.update({
            where: { id: propertyId },
            data: { shortCount: { increment: 1 } },
        });
        res.status(201).json({ success: true, short });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to upload short' });
    }
});
// GET /api/developer/shorts
router.get('/shorts', async (req, res) => {
    try {
        const shorts = await prisma_1.default.short.findMany({
            where: { uploaderId: req.user.id },
            include: { property: { select: { name: true } } },
            orderBy: { createdAt: 'desc' },
        });
        res.json({ shorts });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch shorts' });
    }
});
// GET /api/developer/leads
router.get('/leads', async (req, res) => {
    try {
        const profile = await prisma_1.default.developerProfile.findUnique({ where: { userId: req.user.id } });
        if (!profile)
            return res.status(404).json({ error: 'Developer profile not found' });
        const { status } = req.query;
        const where = { property: { developerId: profile.id } };
        if (status)
            where.status = status;
        const leads = await prisma_1.default.callbackRequest.findMany({
            where,
            include: {
                property: { select: { name: true, city: true, locality: true } },
                user: {
                    select: {
                        name: true,
                        // Phone hidden until CONNECTED status
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        // Anonymize leads that aren't connected
        const anonymizedLeads = leads.map((lead) => ({
            ...lead,
            phone: lead.status === 'CONNECTED' ? lead.phone : 'Hidden',
            user: lead.status === 'CONNECTED' ? lead.user : { name: 'Anonymous Customer' },
        }));
        const stats = {
            pending: leads.filter((l) => l.status === 'PENDING').length,
            validated: leads.filter((l) => l.status === 'VALIDATED').length,
            connected: leads.filter((l) => l.status === 'CONNECTED').length,
        };
        res.json({ leads: anonymizedLeads, stats });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch leads' });
    }
});
// GET /api/developer/analytics
router.get('/analytics', async (req, res) => {
    try {
        const profile = await prisma_1.default.developerProfile.findUnique({ where: { userId: req.user.id } });
        if (!profile)
            return res.status(404).json({ error: 'Developer profile not found' });
        const properties = await prisma_1.default.property.findMany({
            where: { developerId: profile.id },
            select: { viewCount: true, wishlistCount: true, callbackCount: true, shortCount: true },
        });
        const totalViews = properties.reduce((sum, p) => sum + p.viewCount, 0);
        const totalWishlists = properties.reduce((sum, p) => sum + p.wishlistCount, 0);
        const totalCallbacks = properties.reduce((sum, p) => sum + p.callbackCount, 0);
        const shortViews = await prisma_1.default.short.aggregate({
            where: { property: { developerId: profile.id } },
            _sum: { viewCount: true },
        });
        res.json({
            totalViews,
            totalWishlists,
            totalCallbacks,
            totalShortViews: shortViews._sum.viewCount || 0,
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch analytics' });
    }
});
// PUT /api/developer/profile
router.put('/profile', async (req, res) => {
    try {
        const { companyName, description, website, address, city, state, establishedYear } = req.body;
        const profile = await prisma_1.default.developerProfile.update({
            where: { userId: req.user.id },
            data: { companyName, description, website, address, city, state, establishedYear },
        });
        res.json({ success: true, profile });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to update profile' });
    }
});
// POST /api/developer/kyc
router.post('/kyc', async (req, res) => {
    try {
        const { reraNumber, gstNumber, panNumber, documents } = req.body;
        const profile = await prisma_1.default.developerProfile.update({
            where: { userId: req.user.id },
            data: {
                reraNumber, gstNumber, panNumber,
                kycDocuments: documents,
                kycStatus: 'PENDING',
            },
        });
        res.json({ success: true, profile });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to submit KYC' });
    }
});
exports.default = router;
//# sourceMappingURL=developer.routes.js.map