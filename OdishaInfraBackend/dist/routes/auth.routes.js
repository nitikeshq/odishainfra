"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const express_validator_1 = require("express-validator");
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const email_1 = require("../lib/email");
const router = (0, express_1.Router)();
// ─── HELPERS ────────────────────────────────────────────────────────────────
/** Returns 'email' if input looks like an email, otherwise 'phone' */
function detectIdentifierType(identifier) {
    // Simple check: if it contains '@' it's email, otherwise phone
    return identifier.includes('@') ? 'email' : 'phone';
}
function sanitizePhone(phone) {
    // Strip spaces, dashes, keep + prefix
    return phone.replace(/[\s-]/g, '');
}
// POST /api/auth/send-otp
// Body: { identifier: "email@example.com" } or { identifier: "+919876543210" }
// Also accepts legacy { phone: "..." } for backward compat
router.post('/send-otp', async (req, res) => {
    try {
        const rawIdentifier = req.body.identifier || req.body.phone || req.body.email;
        if (!rawIdentifier) {
            return res.status(400).json({ error: 'Email or phone number required' });
        }
        const identifierType = detectIdentifierType(rawIdentifier);
        const identifier = identifierType === 'phone' ? sanitizePhone(rawIdentifier) : rawIdentifier.toLowerCase().trim();
        // Generate 6-digit OTP
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + (parseInt(process.env.OTP_EXPIRY_MINUTES || '5') * 60 * 1000));
        // Create OTP record
        await prisma_1.default.otp.create({
            data: {
                phone: identifierType === 'phone' ? identifier : null,
                email: identifierType === 'email' ? identifier : null,
                channel: identifierType === 'phone' ? 'SMS' : 'EMAIL',
                code,
                expiresAt,
            },
        });
        // Send OTP
        if (identifierType === 'email') {
            const sent = await (0, email_1.sendOtpEmail)(identifier, code);
            if (!sent && process.env.NODE_ENV !== 'development') {
                return res.status(500).json({ error: 'Failed to send OTP email' });
            }
            console.log(`📧 OTP for ${identifier}: ${code}`);
        }
        else {
            // SMS: placeholder — user will integrate SMS provider later
            // TODO: Integrate SMS provider (Twilio/MSG91) here
            console.log(`📱 OTP for ${identifier}: ${code}`);
        }
        res.json({
            success: true,
            channel: identifierType === 'email' ? 'EMAIL' : 'SMS',
            message: identifierType === 'email'
                ? 'Verification code sent to your email'
                : 'Verification code sent to your phone',
            // Expose OTP in dev mode for testing
            ...(process.env.NODE_ENV === 'development' && { otp: code }),
        });
    }
    catch (error) {
        console.error('Send OTP error:', error);
        res.status(500).json({ error: 'Failed to send OTP' });
    }
});
// POST /api/auth/verify-otp
// Body: { identifier: "email@example.com", code: "123456" }
// Also accepts legacy { phone: "...", code: "..." }
router.post('/verify-otp', async (req, res) => {
    try {
        const rawIdentifier = req.body.identifier || req.body.phone || req.body.email;
        const { code } = req.body;
        if (!rawIdentifier || !code) {
            return res.status(400).json({ error: 'Identifier and OTP code are required' });
        }
        const identifierType = detectIdentifierType(rawIdentifier);
        const identifier = identifierType === 'phone' ? sanitizePhone(rawIdentifier) : rawIdentifier.toLowerCase().trim();
        // Find matching OTP
        const otp = await prisma_1.default.otp.findFirst({
            where: {
                ...(identifierType === 'phone' ? { phone: identifier } : { email: identifier }),
                code,
                verified: false,
                expiresAt: { gte: new Date() },
            },
            orderBy: { createdAt: 'desc' },
        });
        if (!otp)
            return res.status(400).json({ error: 'Invalid or expired OTP' });
        // Mark OTP as verified
        await prisma_1.default.otp.update({ where: { id: otp.id }, data: { verified: true } });
        // Find or create user
        let user = identifierType === 'phone'
            ? await prisma_1.default.user.findUnique({ where: { phone: identifier } })
            : await prisma_1.default.user.findUnique({ where: { email: identifier } });
        const isNewUser = !user;
        if (!user) {
            user = await prisma_1.default.user.create({
                data: {
                    ...(identifierType === 'phone' ? { phone: identifier } : { email: identifier }),
                    isVerified: true,
                },
            });
        }
        else {
            await prisma_1.default.user.update({
                where: { id: user.id },
                data: { isVerified: true, lastLoginAt: new Date() },
            });
        }
        const expiresInSeconds = 30 * 24 * 60 * 60; // 30 days
        const token = jsonwebtoken_1.default.sign({ userId: user.id }, process.env.JWT_SECRET, {
            expiresIn: expiresInSeconds,
        });
        res.json({
            success: true,
            token,
            isNewUser,
            user: {
                id: user.id,
                phone: user.phone,
                email: user.email,
                name: user.name,
                role: user.role,
                isVerified: user.isVerified,
            },
        });
    }
    catch (error) {
        console.error('Verify OTP error:', error);
        res.status(500).json({ error: 'Failed to verify OTP' });
    }
});
const registerValidation = [
    (0, express_validator_1.body)('name')
        .trim()
        .notEmpty().withMessage('Name is required')
        .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
    (0, express_validator_1.body)('role')
        .optional()
        .isIn(['CUSTOMER', 'DEVELOPER']).withMessage('Role must be CUSTOMER or DEVELOPER'),
    (0, express_validator_1.body)('companyName')
        .if((0, express_validator_1.body)('role').equals('DEVELOPER'))
        .notEmpty().withMessage('Company name is required for developers'),
];
// POST /api/auth/register — Complete registration (set name, role)
router.post('/register', auth_middleware_1.authenticate, registerValidation, async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    try {
        const { name, role, companyName } = req.body;
        if (!name)
            return res.status(400).json({ error: 'Name is required' });
        const validRoles = ['CUSTOMER', 'DEVELOPER'];
        const userRole = validRoles.includes(role) ? role : 'CUSTOMER';
        const user = await prisma_1.default.user.update({
            where: { id: req.user.id },
            data: { name, role: userRole },
        });
        // If developer, create profile
        if (userRole === 'DEVELOPER' && companyName) {
            await prisma_1.default.developerProfile.upsert({
                where: { userId: user.id },
                create: {
                    userId: user.id,
                    companyName,
                },
                update: { companyName },
            });
        }
        res.json({
            success: true,
            user: {
                id: user.id,
                phone: user.phone,
                name: user.name,
                role: user.role,
                isVerified: user.isVerified,
            },
        });
    }
    catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});
// GET /api/auth/me
router.get('/me', auth_middleware_1.authenticate, async (req, res) => {
    try {
        const user = await prisma_1.default.user.findUnique({
            where: { id: req.user.id },
            include: {
                developerProfile: req.user.role === 'DEVELOPER' ? {
                    include: { subscription: { include: { plan: true } } },
                } : false,
            },
        });
        if (!user)
            return res.status(404).json({ error: 'User not found' });
        res.json({ user });
    }
    catch (error) {
        console.error('Get me error:', error);
        res.status(500).json({ error: 'Failed to get user' });
    }
});
exports.default = router;
//# sourceMappingURL=auth.routes.js.map