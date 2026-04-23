"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// GET /api/properties — List properties with filters
router.get('/properties', async (req, res) => {
    try {
        const { city, type, status, minPrice, maxPrice, bhk, search, featured, page = '1', limit = '20', sort = 'createdAt', } = req.query;
        const where = { listingStatus: 'ACTIVE' };
        if (city)
            where.city = city;
        if (type)
            where.propertyType = type;
        if (status)
            where.status = status;
        if (featured === 'true')
            where.isFeatured = true;
        if (minPrice)
            where.priceMin = { gte: parseFloat(minPrice) };
        if (maxPrice)
            where.priceMax = { lte: parseFloat(maxPrice) };
        if (bhk)
            where.bhkConfig = { contains: bhk, mode: 'insensitive' };
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { locality: { contains: search, mode: 'insensitive' } },
                { city: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
            ];
        }
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const [properties, total] = await Promise.all([
            prisma_1.default.property.findMany({
                where,
                include: {
                    media: { take: 3, orderBy: { sortOrder: 'asc' } },
                    developer: { select: { companyName: true, rating: true, companyLogo: true } },
                },
                orderBy: sort === 'price' ? { priceMin: 'asc' } : { createdAt: 'desc' },
                skip,
                take: parseInt(limit),
            }),
            prisma_1.default.property.count({ where }),
        ]);
        res.json({
            properties,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / parseInt(limit)),
            },
        });
    }
    catch (error) {
        console.error('List properties error:', error);
        res.status(500).json({ error: 'Failed to fetch properties' });
    }
});
// GET /api/properties/nearby?lat=&lng=&city=&limit=10
router.get('/properties/nearby', async (req, res) => {
    try {
        const { city, limit = '10' } = req.query;
        const where = { listingStatus: 'ACTIVE' };
        if (city)
            where.city = { contains: city, mode: 'insensitive' };
        const properties = await prisma_1.default.property.findMany({
            where,
            include: {
                media: { take: 1, orderBy: { sortOrder: 'asc' } },
                developer: { select: { companyName: true, rating: true } },
            },
            take: parseInt(limit),
            orderBy: { createdAt: 'desc' },
        });
        res.json({ properties });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch nearby properties' });
    }
});
// GET /api/properties/featured
router.get('/properties/featured', async (_req, res) => {
    try {
        const properties = await prisma_1.default.property.findMany({
            where: { listingStatus: 'ACTIVE', isFeatured: true },
            include: {
                media: { take: 1, orderBy: { sortOrder: 'asc' } },
                developer: { select: { companyName: true, rating: true } },
            },
            take: 5,
            orderBy: { createdAt: 'desc' },
        });
        res.json({ properties });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch featured properties' });
    }
});
// GET /api/properties/:id
router.get('/properties/:id', async (req, res) => {
    try {
        const property = await prisma_1.default.property.findUnique({
            where: { id: req.params.id },
            include: {
                media: { orderBy: { sortOrder: 'asc' } },
                amenities: true,
                floorPlans: true,
                developer: {
                    select: {
                        id: true, companyName: true, companyLogo: true, description: true,
                        rating: true, totalProjects: true, establishedYear: true, reraNumber: true,
                    },
                },
            },
        });
        if (!property)
            return res.status(404).json({ error: 'Property not found' });
        // Track view if authenticated
        if (req.user) {
            await prisma_1.default.propertyView.create({
                data: { userId: req.user.id, propertyId: property.id },
            }).catch(() => { });
            await prisma_1.default.property.update({
                where: { id: property.id },
                data: { viewCount: { increment: 1 } },
            });
        }
        res.json({ property });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch property' });
    }
});
// POST /api/wishlist/:propertyId
router.post('/wishlist/:propertyId', auth_middleware_1.authenticate, async (req, res) => {
    try {
        const wishlist = await prisma_1.default.wishlist.create({
            data: { userId: req.user.id, propertyId: req.params.propertyId },
        });
        await prisma_1.default.property.update({
            where: { id: req.params.propertyId },
            data: { wishlistCount: { increment: 1 } },
        });
        res.json({ success: true, wishlist });
    }
    catch (error) {
        if (error.code === 'P2002') {
            return res.status(409).json({ error: 'Already in wishlist' });
        }
        res.status(500).json({ error: 'Failed to add to wishlist' });
    }
});
// DELETE /api/wishlist/:propertyId
router.delete('/wishlist/:propertyId', auth_middleware_1.authenticate, async (req, res) => {
    try {
        await prisma_1.default.wishlist.deleteMany({
            where: { userId: req.user.id, propertyId: req.params.propertyId },
        });
        await prisma_1.default.property.update({
            where: { id: req.params.propertyId },
            data: { wishlistCount: { decrement: 1 } },
        });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to remove from wishlist' });
    }
});
// GET /api/wishlist
router.get('/wishlist', auth_middleware_1.authenticate, async (req, res) => {
    try {
        const wishlists = await prisma_1.default.wishlist.findMany({
            where: { userId: req.user.id },
            include: {
                property: {
                    include: {
                        media: { take: 1, orderBy: { sortOrder: 'asc' } },
                        developer: { select: { companyName: true } },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        res.json({ wishlists });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch wishlist' });
    }
});
// POST /api/callbacks — Submit callback request
router.post('/callbacks', auth_middleware_1.authenticate, async (req, res) => {
    try {
        const { propertyId, phone, bestTimeToCall } = req.body;
        if (!propertyId || !phone)
            return res.status(400).json({ error: 'Property and phone required' });
        // Generate lead number
        const year = new Date().getFullYear();
        const count = await prisma_1.default.callbackRequest.count();
        const leadNumber = `LEAD-${year}-${String(count + 1).padStart(4, '0')}`;
        const callback = await prisma_1.default.callbackRequest.create({
            data: {
                leadNumber,
                userId: req.user.id,
                propertyId,
                phone,
                bestTimeToCall,
            },
            include: { property: { select: { name: true } } },
        });
        await prisma_1.default.property.update({
            where: { id: propertyId },
            data: { callbackCount: { increment: 1 } },
        });
        res.json({ success: true, callback });
    }
    catch (error) {
        console.error('Callback error:', error);
        res.status(500).json({ error: 'Failed to submit callback' });
    }
});
// GET /api/callbacks
router.get('/callbacks', auth_middleware_1.authenticate, async (req, res) => {
    try {
        const callbacks = await prisma_1.default.callbackRequest.findMany({
            where: { userId: req.user.id },
            include: { property: { select: { name: true, city: true, locality: true } } },
            orderBy: { createdAt: 'desc' },
        });
        res.json({ callbacks });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch callbacks' });
    }
});
// GET /api/shorts
router.get('/shorts', async (req, res) => {
    try {
        const { city, page = '1', limit = '10' } = req.query;
        const where = { isActive: true };
        if (city)
            where.property = { city: city };
        const shorts = await prisma_1.default.short.findMany({
            where,
            include: {
                property: {
                    select: {
                        id: true, name: true, city: true, locality: true,
                        priceMin: true, priceMax: true, bhkConfig: true,
                    },
                },
                uploader: { select: { name: true, developerProfile: { select: { companyName: true, companyLogo: true } } } },
            },
            orderBy: { createdAt: 'desc' },
            skip: (parseInt(page) - 1) * parseInt(limit),
            take: parseInt(limit),
        });
        res.json({ shorts });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch shorts' });
    }
});
// GET /api/notifications
router.get('/notifications', auth_middleware_1.authenticate, async (req, res) => {
    try {
        const notifications = await prisma_1.default.notification.findMany({
            where: { userId: req.user.id },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });
        const unreadCount = await prisma_1.default.notification.count({
            where: { userId: req.user.id, isRead: false },
        });
        res.json({ notifications, unreadCount });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});
// PUT /api/notifications/:id/read
router.put('/notifications/:id/read', auth_middleware_1.authenticate, async (req, res) => {
    try {
        await prisma_1.default.notification.update({
            where: { id: req.params.id },
            data: { isRead: true },
        });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to mark notification as read' });
    }
});
// GET /api/users/profile
router.get('/users/profile', auth_middleware_1.authenticate, async (req, res) => {
    try {
        const user = await prisma_1.default.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true, phone: true, name: true, email: true, avatarUrl: true,
                role: true, isVerified: true, createdAt: true,
            },
        });
        res.json({ user });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});
// PUT /api/users/profile
router.put('/users/profile', auth_middleware_1.authenticate, async (req, res) => {
    try {
        const { name, email, avatarUrl } = req.body;
        const user = await prisma_1.default.user.update({
            where: { id: req.user.id },
            data: { name, email, avatarUrl },
            select: {
                id: true, phone: true, name: true, email: true, avatarUrl: true,
                role: true, isVerified: true,
            },
        });
        res.json({ user });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to update profile' });
    }
});
// GET /api/users/stats
router.get('/users/stats', auth_middleware_1.authenticate, async (req, res) => {
    try {
        const [saved, callbacks, viewed] = await Promise.all([
            prisma_1.default.wishlist.count({ where: { userId: req.user.id } }),
            prisma_1.default.callbackRequest.count({ where: { userId: req.user.id } }),
            prisma_1.default.propertyView.count({ where: { userId: req.user.id } }),
        ]);
        res.json({ saved, callbacks, viewed });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});
exports.default = router;
//# sourceMappingURL=customer.routes.js.map