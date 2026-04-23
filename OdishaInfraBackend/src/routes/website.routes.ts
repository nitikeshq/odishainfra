import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth.middleware';
import { sendLeadAlertEmail } from '../lib/email';

const router = Router();

// ─── PUBLIC: Submit contact form / lead from website ────────────────────────

router.post('/contact', async (req: Request, res: Response) => {
  try {
    const { name, email, phone, message, source, propertyId } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }
    if (!email && !phone) {
      return res.status(400).json({ error: 'Either email or phone is required' });
    }

    const lead = await prisma.websiteLead.create({
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
    await sendLeadAlertEmail({
      name,
      email,
      phone,
      message,
      source: source || 'landing_page',
    });

    res.status(201).json({ success: true, message: 'Thank you! We will get back to you soon.' });
  } catch (error) {
    console.error('Submit contact error:', error);
    res.status(500).json({ error: 'Failed to submit contact form' });
  }
});

// ─── ADMIN: Get all website leads ───────────────────────────────────────────

router.get(
  '/leads',
  authenticate,
  requireRole('ADMIN'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { isRead, page = '1', limit = '20' } = req.query;

      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

      const [leads, total] = await Promise.all([
        prisma.websiteLead.findMany({
          where: {
            ...(isRead !== undefined ? { isRead: isRead === 'true' } : {}),
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: parseInt(limit as string),
        }),
        prisma.websiteLead.count({
          where: {
            ...(isRead !== undefined ? { isRead: isRead === 'true' } : {}),
          },
        }),
      ]);

      res.json({ leads, total, page: parseInt(page as string), pages: Math.ceil(total / parseInt(limit as string)) });
    } catch (error) {
      console.error('Get website leads error:', error);
      res.status(500).json({ error: 'Failed to fetch website leads' });
    }
  },
);

// ─── ADMIN: Mark lead as read ───────────────────────────────────────────────

router.put(
  '/leads/:id/read',
  authenticate,
  requireRole('ADMIN'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { adminNotes } = req.body;

      const lead = await prisma.websiteLead.update({
        where: { id },
        data: { isRead: true, adminNotes: adminNotes || undefined },
      });

      res.json({ success: true, lead });
    } catch (error) {
      console.error('Mark lead read error:', error);
      res.status(500).json({ error: 'Failed to update lead' });
    }
  },
);

export default router;
