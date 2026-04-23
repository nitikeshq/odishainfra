import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth.middleware';

const router = Router();

// ─── ADMIN: Get all developer commissions ───────────────────────────────────

router.get(
  '/developers',
  authenticate,
  requireRole('ADMIN'),
  async (_req: AuthRequest, res: Response) => {
    try {
      const developers = await prisma.developerProfile.findMany({
        select: {
          id: true,
          companyName: true,
          commissionPercent: true,
          commissionNotes: true,
          user: { select: { name: true, email: true, phone: true } },
          _count: { select: { sales: true } },
        },
        orderBy: { companyName: 'asc' },
      });

      res.json({ developers });
    } catch (error) {
      console.error('Get commissions error:', error);
      res.status(500).json({ error: 'Failed to fetch commissions' });
    }
  },
);

// ─── ADMIN: Update a developer's commission percentage ──────────────────────

router.put(
  '/developers/:developerId',
  authenticate,
  requireRole('ADMIN'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { developerId } = req.params;
      const { commissionPercent, commissionNotes } = req.body;

      if (commissionPercent === undefined || commissionPercent < 0 || commissionPercent > 100) {
        return res.status(400).json({ error: 'Commission must be between 0 and 100' });
      }

      const developer = await prisma.developerProfile.update({
        where: { id: developerId },
        data: {
          commissionPercent: parseFloat(commissionPercent),
          commissionNotes: commissionNotes || null,
        },
      });

      res.json({ success: true, developer });
    } catch (error) {
      console.error('Update commission error:', error);
      res.status(500).json({ error: 'Failed to update commission' });
    }
  },
);

// ─── ADMIN: Record a sale ───────────────────────────────────────────────────

router.post(
  '/sales',
  authenticate,
  requireRole('ADMIN'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { propertyId, developerId, unitType, buyerName, saleAmount, adminNotes } = req.body;

      if (!propertyId || !developerId || !saleAmount) {
        return res.status(400).json({ error: 'propertyId, developerId, and saleAmount are required' });
      }

      // Get developer's commission percentage
      const developer = await prisma.developerProfile.findUnique({
        where: { id: developerId },
      });

      if (!developer) return res.status(404).json({ error: 'Developer not found' });

      const commissionPercent = developer.commissionPercent;
      const commissionAmount = (parseFloat(saleAmount) * commissionPercent) / 100;

      const sale = await prisma.sale.create({
        data: {
          propertyId,
          developerId,
          unitType,
          buyerName,
          saleAmount: parseFloat(saleAmount),
          commissionPercent,
          commissionAmount,
          adminNotes,
        },
      });

      res.status(201).json({ success: true, sale });
    } catch (error) {
      console.error('Record sale error:', error);
      res.status(500).json({ error: 'Failed to record sale' });
    }
  },
);

// ─── ADMIN: Get all sales with commission info ──────────────────────────────

router.get(
  '/sales',
  authenticate,
  requireRole('ADMIN'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { developerId, paid } = req.query;

      const sales = await prisma.sale.findMany({
        where: {
          ...(developerId ? { developerId: developerId as string } : {}),
          ...(paid !== undefined ? { commissionPaid: paid === 'true' } : {}),
        },
        include: {
          property: { select: { name: true, city: true } },
          developer: { select: { companyName: true } },
        },
        orderBy: { saleDate: 'desc' },
      });

      const totalSales = sales.reduce((sum, s) => sum + s.saleAmount, 0);
      const totalCommission = sales.reduce((sum, s) => sum + s.commissionAmount, 0);
      const unpaidCommission = sales.filter(s => !s.commissionPaid).reduce((sum, s) => sum + s.commissionAmount, 0);

      res.json({ sales, stats: { totalSales, totalCommission, unpaidCommission, count: sales.length } });
    } catch (error) {
      console.error('Get sales error:', error);
      res.status(500).json({ error: 'Failed to fetch sales' });
    }
  },
);

// ─── ADMIN: Mark commission as paid ─────────────────────────────────────────

router.put(
  '/sales/:saleId/paid',
  authenticate,
  requireRole('ADMIN'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { saleId } = req.params;

      const sale = await prisma.sale.update({
        where: { id: saleId },
        data: { commissionPaid: true, paidAt: new Date() },
      });

      res.json({ success: true, sale });
    } catch (error) {
      console.error('Mark paid error:', error);
      res.status(500).json({ error: 'Failed to mark commission as paid' });
    }
  },
);

export default router;
