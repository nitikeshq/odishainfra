import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

// All admin routes require authentication + ADMIN role
router.use(authenticate, requireRole('ADMIN'));

// GET /api/admin/dashboard
router.get('/dashboard', async (_req: AuthRequest, res: Response) => {
  try {
    const [pendingLeads, kycPending, activeUsers, liveProjects] = await Promise.all([
      prisma.callbackRequest.count({ where: { status: 'PENDING' } }),
      prisma.developerProfile.count({ where: { kycStatus: 'PENDING' } }),
      prisma.user.count({ where: { isBlocked: false } }),
      prisma.property.count({ where: { listingStatus: 'ACTIVE' } }),
    ]);

    const recentLeads = await prisma.callbackRequest.findMany({
      include: {
        user: { select: { name: true, phone: true } },
        property: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    const settings = await prisma.platformSettings.findFirst({ where: { id: 'default' } });

    res.json({
      stats: { pendingLeads, kycPending, activeUsers, liveProjects },
      recentLeads,
      settings,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch dashboard' });
  }
});

// GET /api/admin/leads
router.get('/leads', async (req: AuthRequest, res: Response) => {
  try {
    const { status, tier, page = '1', limit = '20' } = req.query;

    // "interested" tier = PropertyView records (not actual callback leads)
    if (tier === 'interested') {
      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
      const [views, total] = await Promise.all([
        prisma.propertyView.findMany({
          include: {
            user: { select: { name: true, phone: true } },
            property: { select: { name: true, city: true, developer: { select: { companyName: true } } } },
          },
          orderBy: { viewedAt: 'desc' },
          skip,
          take: parseInt(limit as string),
        }),
        prisma.propertyView.count(),
      ]);
      return res.json({
        leads: views.map((v: any) => ({
          ...v,
          id: v.id,
          createdAt: v.viewedAt,
          status: 'INTERESTED',
          tier: 'interested',
          phone: v.user?.phone,
          bestTimeToCall: null,
        })),
        total,
      });
    }

    const where: any = {};
    if (status) where.status = status;
    // tier filter: hot = has bestTimeToCall, preferred = no bestTimeToCall
    if (tier === 'hot') where.bestTimeToCall = { not: null };
    if (tier === 'preferred') where.bestTimeToCall = null;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const [leads, total] = await Promise.all([
      prisma.callbackRequest.findMany({
        where,
        include: {
          user: { select: { name: true, phone: true } },
          property: {
            select: {
              name: true, city: true, locality: true,
              viewCount: true, callbackCount: true,
              developer: { select: { companyName: true } },
            },
          },
        },
        orderBy: [
          // Hot leads (with time) come first
          { bestTimeToCall: 'desc' },
          { createdAt: 'desc' },
        ],
        skip,
        take: parseInt(limit as string),
      }),
      prisma.callbackRequest.count({ where }),
    ]);

    res.json({
      leads: leads.map((l: any) => ({
        ...l,
        tier: l.bestTimeToCall ? 'hot' : 'preferred',
      })),
      total,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

// PUT /api/admin/leads/:id
router.put('/leads/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { status, adminNotes, rejectionReason } = req.body;
    const updateData: any = { status, adminNotes };

    if (status === 'VALIDATED') updateData.validatedAt = new Date();
    if (status === 'CONNECTED') updateData.connectedAt = new Date();
    if (status === 'REJECTED') {
      updateData.rejectedAt = new Date();
      updateData.rejectionReason = rejectionReason;
    }

    const lead = await prisma.callbackRequest.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        user: { select: { id: true, name: true } },
        property: { select: { name: true, developer: { select: { userId: true } } } },
      },
    });

    // Create notifications based on status
    if (status === 'VALIDATED') {
      await prisma.notification.create({
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
      await prisma.notification.createMany({
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
  } catch (error) {
    res.status(500).json({ error: 'Failed to update lead' });
  }
});

// GET /api/admin/kyc
router.get('/kyc', async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.query;
    const where: any = {};
    if (status) where.kycStatus = status;

    const developers = await prisma.developerProfile.findMany({
      where,
      include: { user: { select: { name: true, phone: true, createdAt: true } } },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ developers });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch KYC list' });
  }
});

// PUT /api/admin/kyc/:id
router.put('/kyc/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { status, reviewNotes } = req.body;
    const kycStatus = status === 'APPROVED' ? 'APPROVED' : 'REJECTED';

    const profile = await prisma.developerProfile.update({
      where: { id: req.params.id },
      data: {
        kycStatus,
        kycReviewedAt: new Date(),
        kycReviewNotes: reviewNotes,
      },
    });

    // Notify developer
    await prisma.notification.create({
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
  } catch (error) {
    res.status(500).json({ error: 'Failed to update KYC' });
  }
});

// GET /api/admin/listings
router.get('/listings', async (req: AuthRequest, res: Response) => {
  try {
    const { status, featured, page = '1', limit = '20' } = req.query;
    const where: any = {};
    if (status) where.listingStatus = status;
    if (featured === 'true') where.isFeatured = true;

    const [listings, total] = await Promise.all([
      prisma.property.findMany({
        where,
        include: {
          media: { take: 1, orderBy: { sortOrder: 'asc' } },
          developer: { select: { companyName: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page as string) - 1) * parseInt(limit as string),
        take: parseInt(limit as string),
      }),
      prisma.property.count({ where }),
    ]);

    res.json({ listings, total });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch listings' });
  }
});

// PUT /api/admin/listings/:id
router.put('/listings/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { listingStatus, isFeatured, reviewNotes, rejectionReason } = req.body;
    const updateData: any = {};
    if (listingStatus) {
      updateData.listingStatus = listingStatus;
      updateData.reviewedAt = new Date();
    }
    if (typeof isFeatured === 'boolean') updateData.isFeatured = isFeatured;
    if (reviewNotes) updateData.reviewNotes = reviewNotes;
    if (rejectionReason) updateData.rejectionReason = rejectionReason;

    const listing = await prisma.property.update({
      where: { id: req.params.id },
      data: updateData,
    });

    res.json({ success: true, listing });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update listing' });
  }
});

// GET /api/admin/users
router.get('/users', async (req: AuthRequest, res: Response) => {
  try {
    const { role, blocked, search, page = '1', limit = '20' } = req.query;
    const where: any = {};
    if (role) where.role = role;
    if (blocked === 'true') where.isBlocked = true;
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { phone: { contains: search as string } },
        { email: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true, phone: true, name: true, email: true, role: true,
          isBlocked: true, isVerified: true, createdAt: true, lastLoginAt: true,
          _count: { select: { callbackRequests: true, wishlists: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page as string) - 1) * parseInt(limit as string),
        take: parseInt(limit as string),
      }),
      prisma.user.count({ where }),
    ]);

    res.json({ users, total });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// PUT /api/admin/users/:id
router.put('/users/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { isBlocked, role } = req.body;
    const updateData: any = {};
    if (typeof isBlocked === 'boolean') updateData.isBlocked = isBlocked;
    if (role) updateData.role = role;

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: updateData,
    });

    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// POST /api/admin/notifications/push
router.post('/notifications/push', async (req: AuthRequest, res: Response) => {
  try {
    const { title, body, targetAudience = 'ALL', targetRole = 'CUSTOMER' } = req.body;
    if (!title || !body) return res.status(400).json({ error: 'Title and body required' });

    // Get target users
    const userWhere: any = { isBlocked: false, role: targetRole };
    const userCount = await prisma.user.count({ where: userWhere });

    // Create campaign record
    const campaign = await prisma.pushCampaign.create({
      data: { title, body, targetAudience, targetRole, sentCount: userCount },
    });

    // In production: send via FCM here
    console.log(`📨 Push notification sent to ${userCount} users`);

    res.json({ success: true, campaign, sentTo: userCount });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send push notification' });
  }
});

// GET /api/admin/notifications/campaigns
router.get('/notifications/campaigns', async (_req: AuthRequest, res: Response) => {
  try {
    const campaigns = await prisma.pushCampaign.findMany({
      orderBy: { sentAt: 'desc' },
      take: 20,
    });
    res.json({ campaigns });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
});

// GET /api/admin/analytics
router.get('/analytics', async (_req: AuthRequest, res: Response) => {
  try {
    const [totalUsers, totalProperties, totalLeads, totalShortViews] = await Promise.all([
      prisma.user.count({ where: { isBlocked: false } }),
      prisma.property.count({ where: { listingStatus: 'ACTIVE' } }),
      prisma.callbackRequest.count(),
      prisma.short.aggregate({ _sum: { viewCount: true } }),
    ]);

    const totalPropertyViews = await prisma.property.aggregate({ _sum: { viewCount: true } });
    const leadsValidated = await prisma.callbackRequest.count({ where: { status: 'VALIDATED' } });
    const leadsConnected = await prisma.callbackRequest.count({ where: { status: 'CONNECTED' } });
    const hotLeads = await prisma.callbackRequest.count({ where: { bestTimeToCall: { not: null } } });
    const interestedCount = await prisma.propertyView.count();

    res.json({
      totalUsers,
      totalProperties,
      totalLeads,
      leadsValidated,
      leadsConnected,
      hotLeads,
      interestedCount,
      totalPropertyViews: totalPropertyViews._sum.viewCount || 0,
      totalShortViews: totalShortViews._sum.viewCount || 0,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// GET /api/admin/properties/:id/analytics — per-property stats
router.get('/properties/:id/analytics', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const [property, leadsCount, hotCount, interestedCount, interestedUsers] = await Promise.all([
      prisma.property.findUnique({
        where: { id },
        select: { name: true, viewCount: true, callbackCount: true },
      }),
      prisma.callbackRequest.count({ where: { propertyId: id } }),
      prisma.callbackRequest.count({ where: { propertyId: id, bestTimeToCall: { not: null } } }),
      prisma.propertyView.count({ where: { propertyId: id } }),
      prisma.propertyView.findMany({
        where: { propertyId: id },
        include: { user: { select: { name: true, phone: true } } },
        orderBy: { viewedAt: 'desc' },
        take: 50,
      }),
    ]);

    res.json({
      name: property?.name,
      impressions: property?.viewCount ?? 0,
      visits: interestedCount,
      leads: leadsCount,
      hot: hotCount,
      preferred: leadsCount - hotCount,
      interestedUsers,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch property analytics' });
  }
});

// GET /api/admin/settings
router.get('/settings', async (_req: AuthRequest, res: Response) => {
  try {
    let settings = await prisma.platformSettings.findFirst({ where: { id: 'default' } });
    if (!settings) {
      settings = await prisma.platformSettings.create({ data: { id: 'default' } });
    }
    res.json({ settings });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// PUT /api/admin/settings
router.put('/settings', async (req: AuthRequest, res: Response) => {
  try {
    const settings = await prisma.platformSettings.upsert({
      where: { id: 'default' },
      create: { id: 'default', ...req.body },
      update: req.body,
    });
    res.json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

export default router;
