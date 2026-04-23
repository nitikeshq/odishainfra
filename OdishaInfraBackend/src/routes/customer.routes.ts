import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

// GET /api/properties — List properties with filters
router.get('/properties', async (req: AuthRequest, res: Response) => {
  try {
    const {
      city, type, status, minPrice, maxPrice, bhk, search,
      featured, page = '1', limit = '20', sort = 'createdAt',
    } = req.query;

    // Map human-readable filter chip labels to Prisma enum values
    const typeMap: Record<string, string> = {
      apartments: 'APARTMENT', apartment: 'APARTMENT',
      villas: 'VILLA', villa: 'VILLA',
      plots: 'PLOT', plot: 'PLOT',
      commercial: 'COMMERCIAL',
      duplex: 'DUPLEX', penthouse: 'PENTHOUSE',
      studio: 'STUDIO', township: 'TOWNSHIP',
    };
    const statusMap: Record<string, string> = {
      'ready to move': 'READY_TO_MOVE', 'ready_to_move': 'READY_TO_MOVE',
      'new launch': 'NEW_LAUNCH', 'new_launch': 'NEW_LAUNCH',
      'under construction': 'UNDER_CONSTRUCTION', 'under_construction': 'UNDER_CONSTRUCTION',
      'pre launch': 'PRE_LAUNCH', 'pre_launch': 'PRE_LAUNCH',
    };

    const where: any = { listingStatus: 'ACTIVE' };
    if (city) where.city = city;
    if (type) {
      const mapped = typeMap[(type as string).toLowerCase()];
      where.propertyType = mapped ?? type;
    }
    if (status) {
      const mapped = statusMap[(status as string).toLowerCase()];
      where.status = mapped ?? status;
    }
    if (featured === 'true') where.isFeatured = true;
    if (minPrice) where.priceMin = { gte: parseFloat(minPrice as string) };
    if (maxPrice) where.priceMax = { lte: parseFloat(maxPrice as string) };
    if (bhk) where.bhkConfig = { contains: bhk as string, mode: 'insensitive' };
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { locality: { contains: search as string, mode: 'insensitive' } },
        { city: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const [properties, total] = await Promise.all([
      prisma.property.findMany({
        where,
        include: {
          media: { take: 3, orderBy: { sortOrder: 'asc' } },
          developer: { select: { companyName: true, rating: true, companyLogo: true } },
        },
        orderBy: sort === 'price' ? { priceMin: 'asc' } : { createdAt: 'desc' },
        skip,
        take: parseInt(limit as string),
      }),
      prisma.property.count({ where }),
    ]);

    res.json({
      properties,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        totalPages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error) {
    console.error('List properties error:', error);
    res.status(500).json({ error: 'Failed to fetch properties' });
  }
});

// GET /api/properties/nearby?lat=&lng=&city=&limit=10
router.get('/properties/nearby', async (req: AuthRequest, res: Response) => {
  try {
    const { city, limit = '10' } = req.query;

    const where: any = { listingStatus: 'ACTIVE' };
    if (city) where.city = { contains: city as string, mode: 'insensitive' };

    const properties = await prisma.property.findMany({
      where,
      include: {
        media: { take: 1, orderBy: { sortOrder: 'asc' } },
        developer: { select: { companyName: true, rating: true } },
      },
      take: parseInt(limit as string),
      orderBy: { createdAt: 'desc' },
    });

    res.json({ properties });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch nearby properties' });
  }
});

// GET /api/properties/featured
router.get('/properties/featured', async (_req, res: Response) => {
  try {
    const properties = await prisma.property.findMany({
      where: { listingStatus: 'ACTIVE', isFeatured: true },
      include: {
        media: { take: 1, orderBy: { sortOrder: 'asc' } },
        developer: { select: { companyName: true, rating: true } },
      },
      take: 5,
      orderBy: { createdAt: 'desc' },
    });
    res.json({ properties });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch featured properties' });
  }
});

// GET /api/properties/:id
router.get('/properties/:id', async (req: AuthRequest, res: Response) => {
  try {
    const property = await prisma.property.findUnique({
      where: { id: req.params.id },
      include: {
        media: { orderBy: { sortOrder: 'asc' } },
        amenities: true,
        floorPlans: true,
        developer: {
          select: {
            id: true, companyName: true, companyLogo: true, description: true,
            rating: true, totalProjects: true, establishedYear: true, reraNumber: true,
            website: true, address: true, city: true, kycStatus: true,
            user: { select: { name: true, phone: true } },
          },
        },
      },
    });

    if (!property) return res.status(404).json({ error: 'Property not found' });

    // Track view if authenticated
    if (req.user) {
      await prisma.propertyView.create({
        data: { userId: req.user.id, propertyId: property.id },
      }).catch(() => {});
      await prisma.property.update({
        where: { id: property.id },
        data: { viewCount: { increment: 1 } },
      });
    }

    res.json({ property });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch property' });
  }
});

// POST /api/wishlist/:propertyId
router.post('/wishlist/:propertyId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const wishlist = await prisma.wishlist.create({
      data: { userId: req.user!.id, propertyId: req.params.propertyId },
    });
    await prisma.property.update({
      where: { id: req.params.propertyId },
      data: { wishlistCount: { increment: 1 } },
    });
    res.json({ success: true, wishlist });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Already in wishlist' });
    }
    res.status(500).json({ error: 'Failed to add to wishlist' });
  }
});

// DELETE /api/wishlist/:propertyId
router.delete('/wishlist/:propertyId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.wishlist.deleteMany({
      where: { userId: req.user!.id, propertyId: req.params.propertyId },
    });
    await prisma.property.update({
      where: { id: req.params.propertyId },
      data: { wishlistCount: { decrement: 1 } },
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove from wishlist' });
  }
});

// GET /api/wishlist
router.get('/wishlist', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const wishlists = await prisma.wishlist.findMany({
      where: { userId: req.user!.id },
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
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch wishlist' });
  }
});

// POST /api/callbacks — Submit or update callback request (upsert per user+property)
router.post('/callbacks', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { propertyId, bestTimeToCall } = req.body;
    if (!propertyId) return res.status(400).json({ error: 'Property required' });

    // Use the verified phone from the authenticated user
    const user = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { phone: true } });
    const phone = user?.phone ?? '';

    // Check if lead already exists for this user+property
    const existing = await prisma.callbackRequest.findFirst({
      where: { userId: req.user!.id, propertyId },
    });

    if (existing) {
      // Update: add/change preferred time (upgrades to hot lead)
      const updated = await prisma.callbackRequest.update({
        where: { id: existing.id },
        data: { bestTimeToCall: bestTimeToCall ?? existing.bestTimeToCall },
        include: { property: { select: { name: true } } },
      });
      return res.json({ success: true, callback: updated, updated: true });
    }

    // Create new lead
    const year = new Date().getFullYear();
    const count = await prisma.callbackRequest.count();
    const leadNumber = `LEAD-${year}-${String(count + 1).padStart(4, '0')}`;

    const callback = await prisma.callbackRequest.create({
      data: { leadNumber, userId: req.user!.id, propertyId, phone, bestTimeToCall },
      include: { property: { select: { name: true } } },
    });

    await prisma.property.update({
      where: { id: propertyId },
      data: { callbackCount: { increment: 1 } },
    });

    res.json({ success: true, callback, updated: false });
  } catch (error) {
    console.error('Callback error:', error);
    res.status(500).json({ error: 'Failed to submit callback' });
  }
});

// POST /api/properties/:id/view — Record property detail page visit
router.post('/properties/:id/view', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    // Upsert: one view record per user per property per day
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existing = await prisma.propertyView.findFirst({
      where: { userId: req.user!.id, propertyId: id, viewedAt: { gte: today } },
    });

    if (!existing) {
      await prisma.propertyView.create({ data: { userId: req.user!.id, propertyId: id } });
      await prisma.property.update({ where: { id }, data: { viewCount: { increment: 1 } } });
    }

    res.json({ success: true });
  } catch {
    res.json({ success: false }); // silent fail — non-critical
  }
});

// GET /api/callbacks
router.get('/callbacks', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const callbacks = await prisma.callbackRequest.findMany({
      where: { userId: req.user!.id },
      include: { property: { select: { name: true, city: true, locality: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ callbacks });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch callbacks' });
  }
});

// GET /api/shorts
router.get('/shorts', async (req, res: Response) => {
  try {
    const { city, page = '1', limit = '10' } = req.query;
    const where: any = { isActive: true };
    if (city) where.property = { city: city as string };

    const shorts = await prisma.short.findMany({
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
      skip: (parseInt(page as string) - 1) * parseInt(limit as string),
      take: parseInt(limit as string),
    });

    res.json({ shorts });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch shorts' });
  }
});

// GET /api/notifications
router.get('/notifications', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    const unreadCount = await prisma.notification.count({
      where: { userId: req.user!.id, isRead: false },
    });
    res.json({ notifications, unreadCount });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// PUT /api/notifications/:id/read
router.put('/notifications/:id/read', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.notification.update({
      where: { id: req.params.id },
      data: { isRead: true },
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// GET /api/users/profile
router.get('/users/profile', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true, phone: true, name: true, email: true, avatarUrl: true,
        role: true, isVerified: true, createdAt: true,
      },
    });
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// PUT /api/users/profile
router.put('/users/profile', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, avatarUrl } = req.body;
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: { name, email, avatarUrl },
      select: {
        id: true, phone: true, name: true, email: true, avatarUrl: true,
        role: true, isVerified: true,
      },
    });
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// GET /api/users/stats
router.get('/users/stats', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const [saved, callbacks, viewed] = await Promise.all([
      prisma.wishlist.count({ where: { userId: req.user!.id } }),
      prisma.callbackRequest.count({ where: { userId: req.user!.id } }),
      prisma.propertyView.count({ where: { userId: req.user!.id } }),
    ]);
    res.json({ saved, callbacks, viewed });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

export default router;
