"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const email_1 = require("../lib/email");
const router = (0, express_1.Router)();
// ─── PUBLIC: Submit contact form / lead from website ────────────────────────
router.post('/contact', async (req, res) => {
    try {
        const { name, email, phone, message, source, propertyId } = req.body;
        if (!name) {
            return res.status(400).json({ error: 'Name is required' });
        }
        if (!email && !phone) {
            return res.status(400).json({ error: 'Either email or phone is required' });
        }
        const lead = await prisma_1.default.websiteLead.create({
            data: {
                name,
                email: email || null,
                phone: phone || null,
                message: message || null,
                source: source || 'landing_page',
                propertyId: propertyId || null,
            },
        });
        // Send email alert to admin
        await (0, email_1.sendLeadAlertEmail)({
            name,
            email,
            phone,
            message,
            source: source || 'landing_page',
        });
        res.status(201).json({ success: true, message: 'Thank you! We will get back to you soon.' });
    }
    catch (error) {
        console.error('Submit contact error:', error);
        res.status(500).json({ error: 'Failed to submit contact form' });
    }
});
// ─── ADMIN: Get all website leads ───────────────────────────────────────────
router.get('/leads', auth_middleware_1.authenticate, (0, auth_middleware_1.requireRole)('ADMIN'), async (req, res) => {
    try {
        const { isRead, page = '1', limit = '20' } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const [leads, total] = await Promise.all([
            prisma_1.default.websiteLead.findMany({
                where: {
                    ...(isRead !== undefined ? { isRead: isRead === 'true' } : {}),
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: parseInt(limit),
            }),
            prisma_1.default.websiteLead.count({
                where: {
                    ...(isRead !== undefined ? { isRead: isRead === 'true' } : {}),
                },
            }),
        ]);
        res.json({ leads, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
    }
    catch (error) {
        console.error('Get website leads error:', error);
        res.status(500).json({ error: 'Failed to fetch website leads' });
    }
});
// ─── ADMIN: Mark lead as read ───────────────────────────────────────────────
router.put('/leads/:id/read', auth_middleware_1.authenticate, (0, auth_middleware_1.requireRole)('ADMIN'), async (req, res) => {
    try {
        const { id } = req.params;
        const { adminNotes } = req.body;
        const lead = await prisma_1.default.websiteLead.update({
            where: { id },
            data: { isRead: true, adminNotes: adminNotes || undefined },
        });
        res.json({ success: true, lead });
    }
    catch (error) {
        console.error('Mark lead read error:', error);
        res.status(500).json({ error: 'Failed to update lead' });
    }
});
exports.default = router;
//# sourceMappingURL=website.routes.js.map