import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

// GET /api/subscriptions/plans
router.get('/plans', async (_req, res: Response) => {
  try {
    const plans = await prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { priceMonthly: 'asc' },
    });
    res.json({ plans });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch plans' });
  }
});

// POST /api/subscriptions/subscribe
router.post('/subscribe', authenticate, requireRole('DEVELOPER'), async (req: AuthRequest, res: Response) => {
  try {
    // Check if subscriptions are enabled
    const settings = await prisma.platformSettings.findFirst({ where: { id: 'default' } });
    if (!settings?.subscriptionEnabled) {
      return res.status(400).json({ error: 'Subscriptions are currently disabled. Listing is free.' });
    }

    const { planId, paymentRef } = req.body;
    if (!planId) return res.status(400).json({ error: 'Plan ID required' });

    const profile = await prisma.developerProfile.findUnique({ where: { userId: req.user!.id } });
    if (!profile) return res.status(404).json({ error: 'Developer profile not found' });

    const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
    if (!plan) return res.status(404).json({ error: 'Plan not found' });

    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);

    const subscription = await prisma.developerSubscription.upsert({
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
  } catch (error) {
    res.status(500).json({ error: 'Failed to subscribe' });
  }
});

// GET /api/subscriptions/status
router.get('/status', authenticate, requireRole('DEVELOPER'), async (req: AuthRequest, res: Response) => {
  try {
    const profile = await prisma.developerProfile.findUnique({ where: { userId: req.user!.id } });
    if (!profile) return res.status(404).json({ error: 'Developer profile not found' });

    const subscription = await prisma.developerSubscription.findUnique({
      where: { developerId: profile.id },
      include: { plan: true },
    });

    const settings = await prisma.platformSettings.findFirst({ where: { id: 'default' } });

    res.json({
      subscription,
      subscriptionRequired: settings?.subscriptionEnabled || false,
      freeListingEnabled: settings?.freeListingEnabled || true,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch subscription status' });
  }
});

export default router;
