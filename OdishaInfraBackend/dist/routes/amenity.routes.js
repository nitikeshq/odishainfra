"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// ─── PUBLIC: Get all approved amenities ─────────────────────────────────────
router.get('/', async (_req, res) => {
    try {
        const amenities = await prisma_1.default.amenityMaster.findMany({
            where: { approvalStatus: 'APPROVED' },
            orderBy: [{ category: 'asc' }, { name: 'asc' }],
        });
        // Group by category
        const grouped = {};
        for (const a of amenities) {
            if (!grouped[a.category])
                grouped[a.category] = [];
            grouped[a.category].push(a);
        }
        res.json({ amenities, grouped });
    }
    catch (error) {
        console.error('Get amenities error:', error);
        res.status(500).json({ error: 'Failed to fetch amenities' });
    }
});
// ─── DEVELOPER: Request a new custom amenity ────────────────────────────────
router.post('/request', auth_middleware_1.authenticate, (0, auth_middleware_1.requireRole)('DEVELOPER'), async (req, res) => {
    try {
        const { name, icon, category } = req.body;
        if (!name || !category) {
            return res.status(400).json({ error: 'Name and category are required' });
        }
        // Check if already exists
        const existing = await prisma_1.default.amenityMaster.findUnique({ where: { name } });
        if (existing) {
            return res.status(400).json({ error: 'Amenity already exists', amenity: existing });
        }
        const amenity = await prisma_1.default.amenityMaster.create({
            data: {
                name,
                icon: icon || null,
                category,
                isDefault: false,
                createdById: req.user.id,
                approvalStatus: 'PENDING',
            },
        });
        res.status(201).json({ success: true, amenity, message: 'Amenity submitted for admin approval' });
    }
    catch (error) {
        console.error('Request amenity error:', error);
        res.status(500).json({ error: 'Failed to submit amenity request' });
    }
});
// ─── ADMIN: Get pending amenity requests ────────────────────────────────────
router.get('/pending', auth_middleware_1.authenticate, (0, auth_middleware_1.requireRole)('ADMIN'), async (_req, res) => {
    try {
        const pending = await prisma_1.default.amenityMaster.findMany({
            where: { approvalStatus: 'PENDING' },
            orderBy: { createdAt: 'desc' },
        });
        res.json({ amenities: pending });
    }
    catch (error) {
        console.error('Get pending amenities error:', error);
        res.status(500).json({ error: 'Failed to fetch pending amenities' });
    }
});
// ─── ADMIN: Approve or reject an amenity ────────────────────────────────────
router.put('/:id/review', auth_middleware_1.authenticate, (0, auth_middleware_1.requireRole)('ADMIN'), async (req, res) => {
    try {
        const { id } = req.params;
        const { action, rejectedReason } = req.body; // action: 'APPROVED' | 'REJECTED'
        if (!['APPROVED', 'REJECTED'].includes(action)) {
            return res.status(400).json({ error: 'Action must be APPROVED or REJECTED' });
        }
        const amenity = await prisma_1.default.amenityMaster.update({
            where: { id },
            data: {
                approvalStatus: action,
                approvedAt: action === 'APPROVED' ? new Date() : null,
                rejectedReason: action === 'REJECTED' ? rejectedReason : null,
            },
        });
        res.json({ success: true, amenity });
    }
    catch (error) {
        console.error('Review amenity error:', error);
        res.status(500).json({ error: 'Failed to review amenity' });
    }
});
exports.default = router;
//# sourceMappingURL=amenity.routes.js.map