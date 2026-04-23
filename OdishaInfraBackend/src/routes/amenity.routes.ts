import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth.middleware';

const router = Router();

// ─── PUBLIC: Get all approved amenities ─────────────────────────────────────

router.get('/', async (_req: Request, res: Response) => {
  try {
    const amenities = await prisma.amenityMaster.findMany({
      where: { approvalStatus: 'APPROVED' },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });

    // Group by category
    const grouped: Record<string, typeof amenities> = {};
    for (const a of amenities) {
      if (!grouped[a.category]) grouped[a.category] = [];
      grouped[a.category].push(a);
    }

    res.json({ amenities, grouped });
  } catch (error) {
    console.error('Get amenities error:', error);
    res.status(500).json({ error: 'Failed to fetch amenities' });
  }
});

// ─── DEVELOPER: Request a new custom amenity ────────────────────────────────

router.post(
  '/request',
  authenticate,
  requireRole('DEVELOPER'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { name, icon, category } = req.body;
      if (!name || !category) {
        return res.status(400).json({ error: 'Name and category are required' });
      }

      // Check if already exists
      const existing = await prisma.amenityMaster.findUnique({ where: { name } });
      if (existing) {
        return res.status(400).json({ error: 'Amenity already exists', amenity: existing });
      }

      const amenity = await prisma.amenityMaster.create({
        data: {
          name,
          icon: icon || null,
          category,
          isDefault: false,
          createdById: req.user!.id,
          approvalStatus: 'PENDING',
        },
      });

      res.status(201).json({ success: true, amenity, message: 'Amenity submitted for admin approval' });
    } catch (error) {
      console.error('Request amenity error:', error);
      res.status(500).json({ error: 'Failed to submit amenity request' });
    }
  },
);

// ─── ADMIN: Get pending amenity requests ────────────────────────────────────

router.get(
  '/pending',
  authenticate,
  requireRole('ADMIN'),
  async (_req: AuthRequest, res: Response) => {
    try {
      const pending = await prisma.amenityMaster.findMany({
        where: { approvalStatus: 'PENDING' },
        orderBy: { createdAt: 'desc' },
      });

      res.json({ amenities: pending });
    } catch (error) {
      console.error('Get pending amenities error:', error);
      res.status(500).json({ error: 'Failed to fetch pending amenities' });
    }
  },
);

// ─── ADMIN: Approve or reject an amenity ────────────────────────────────────

router.put(
  '/:id/review',
  authenticate,
  requireRole('ADMIN'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { action, rejectedReason } = req.body; // action: 'APPROVED' | 'REJECTED'

      if (!['APPROVED', 'REJECTED'].includes(action)) {
        return res.status(400).json({ error: 'Action must be APPROVED or REJECTED' });
      }

      const amenity = await prisma.amenityMaster.update({
        where: { id },
        data: {
          approvalStatus: action,
          approvedAt: action === 'APPROVED' ? new Date() : null,
          rejectedReason: action === 'REJECTED' ? rejectedReason : null,
        },
      });

      res.json({ success: true, amenity });
    } catch (error) {
      console.error('Review amenity error:', error);
      res.status(500).json({ error: 'Failed to review amenity' });
    }
  },
);

export default router;
