"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireSubscription = void 0;
const prisma_1 = __importDefault(require("../lib/prisma"));
/**
 * Checks whether the platform requires an active subscription.
 * If `subscriptionEnabled` is true and the requesting developer does not have
 * an ACTIVE subscription with a future end date, returns HTTP 402.
 * Non-developer roles are always allowed through.
 */
const requireSubscription = async (req, res, next) => {
    try {
        const settings = await prisma_1.default.platformSettings.findFirst();
        if (!settings?.subscriptionEnabled) {
            return next(); // Subscription enforcement is disabled
        }
        if (req.user?.role !== 'DEVELOPER') {
            return next(); // Only enforce for developers
        }
        const profile = await prisma_1.default.developerProfile.findUnique({
            where: { userId: req.user.id },
            include: { subscription: true },
        });
        const sub = profile?.subscription;
        if (!sub || sub.status !== 'ACTIVE' || !sub.endDate || sub.endDate < new Date()) {
            return res.status(402).json({
                error: 'Active subscription required',
                code: 'SUBSCRIPTION_REQUIRED',
            });
        }
        return next();
    }
    catch (error) {
        return next(error);
    }
};
exports.requireSubscription = requireSubscription;
//# sourceMappingURL=subscription.middleware.js.map