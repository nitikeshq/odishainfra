import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import prisma from '../lib/prisma';

/**
 * Checks whether the platform requires an active subscription.
 * If `subscriptionEnabled` is true and the requesting developer does not have
 * an ACTIVE subscription with a future end date, returns HTTP 402.
 * Non-developer roles are always allowed through.
 */
export const requireSubscription = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const settings = await prisma.platformSettings.findFirst();
    if (!settings?.subscriptionEnabled) {
      return next(); // Subscription enforcement is disabled
    }

    if (req.user?.role !== 'DEVELOPER') {
      return next(); // Only enforce for developers
    }

    const profile = await prisma.developerProfile.findUnique({
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
  } catch (error) {
    return next(error);
  }
};
