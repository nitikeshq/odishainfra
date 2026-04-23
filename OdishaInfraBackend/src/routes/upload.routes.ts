import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.middleware';
import { getPresignedUploadUrl, deleteFile } from '../lib/s3';

const router = Router();

// All upload routes require authentication
router.use(authenticate);

// ─── GET PRESIGNED UPLOAD URL ────────────────────────────────────────────────
// POST /api/uploads/presign
// Body: { type, contentType, fileExtension }
// Returns: { uploadUrl, key, publicUrl }
router.post('/presign', async (req: AuthRequest, res: Response) => {
  try {
    const { type, contentType, fileExtension } = req.body;

    if (!type || !contentType || !fileExtension) {
      return res.status(400).json({
        error: 'type, contentType, and fileExtension are required',
        allowedTypes: ['property-images', 'property-videos', 'shorts', 'thumbnails', 'kyc-docs', 'avatars'],
      });
    }

    // Only developers can upload property media and shorts
    if (['property-images', 'property-videos', 'shorts', 'thumbnails'].includes(type)) {
      if (req.user!.role !== 'DEVELOPER' && req.user!.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Only developers can upload property media' });
      }
    }

    const result = await getPresignedUploadUrl(type, contentType, fileExtension);

    res.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('Presign error:', error);
    res.status(400).json({ error: error.message || 'Failed to generate upload URL' });
  }
});

// ─── BATCH PRESIGN (for multiple property images) ────────────────────────────
// POST /api/uploads/presign-batch
// Body: { files: [{ type, contentType, fileExtension }] }
router.post('/presign-batch', async (req: AuthRequest, res: Response) => {
  try {
    const { files } = req.body;

    if (!files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ error: 'files array is required' });
    }

    if (files.length > 10) {
      return res.status(400).json({ error: 'Maximum 10 files per batch' });
    }

    const results = await Promise.all(
      files.map((file: { type: any; contentType: string; fileExtension: string }) =>
        getPresignedUploadUrl(file.type, file.contentType, file.fileExtension)
      )
    );

    res.json({ success: true, uploads: results });
  } catch (error: any) {
    console.error('Batch presign error:', error);
    res.status(400).json({ error: error.message || 'Failed to generate upload URLs' });
  }
});

// ─── CONFIRM PROPERTY MEDIA UPLOAD ──────────────────────────────────────────
// POST /api/uploads/property/:propertyId/media
// Body: { key, publicUrl, mediaType, sortOrder }
router.post('/property/:propertyId/media', requireRole('DEVELOPER'), async (req: AuthRequest, res: Response) => {
  try {
    const { propertyId } = req.params;
    const { key, publicUrl, mediaType = 'IMAGE', sortOrder = 0 } = req.body;

    if (!key || !publicUrl) {
      return res.status(400).json({ error: 'key and publicUrl are required' });
    }

    // Verify developer owns this property
    const profile = await prisma.developerProfile.findUnique({
      where: { userId: req.user!.id },
    });
    if (!profile) return res.status(404).json({ error: 'Developer profile not found' });

    const property = await prisma.property.findFirst({
      where: { id: propertyId as string, developerId: profile.id },
    });
    if (!property) return res.status(404).json({ error: 'Property not found' });

    const media = await prisma.propertyMedia.create({
      data: {
        propertyId: propertyId as string,
        url: publicUrl as string,
        s3Key: key as string,
        mediaType: mediaType as string,
        sortOrder: sortOrder as number,
      },
    });

    res.status(201).json({ success: true, media });
  } catch (error) {
    console.error('Confirm media error:', error);
    res.status(500).json({ error: 'Failed to save media record' });
  }
});

// ─── DELETE MEDIA ────────────────────────────────────────────────────────────
// DELETE /api/uploads/media/:mediaId
router.delete('/media/:mediaId', requireRole('DEVELOPER'), async (req: AuthRequest, res: Response) => {
  try {
    const media = await prisma.propertyMedia.findUnique({
      where: { id: req.params.mediaId as string },
      include: { property: { select: { developerId: true } } },
    });

    if (!media) return res.status(404).json({ error: 'Media not found' });

    // Verify ownership
    const profile = await prisma.developerProfile.findUnique({
      where: { userId: req.user!.id },
    });
    if (!profile || (media as any).property.developerId !== profile.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Delete from S3
    if ((media as any).s3Key) {
      await deleteFile((media as any).s3Key);
    }

    // Delete DB record
    await prisma.propertyMedia.delete({ where: { id: media.id } });

    res.json({ success: true });
  } catch (error) {
    console.error('Delete media error:', error);
    res.status(500).json({ error: 'Failed to delete media' });
  }
});

// ─── CONFIRM SHORT VIDEO UPLOAD ──────────────────────────────────────────────
// POST /api/uploads/shorts
// Body: { propertyId, videoKey, videoUrl, thumbnailKey, thumbnailUrl, caption, duration }
router.post('/shorts', requireRole('DEVELOPER'), async (req: AuthRequest, res: Response) => {
  try {
    const { propertyId, videoKey, videoUrl, thumbnailKey, thumbnailUrl, caption, duration } = req.body;

    if (!propertyId || !videoUrl) {
      return res.status(400).json({ error: 'propertyId and videoUrl are required' });
    }

    // Verify developer owns this property
    const profile = await prisma.developerProfile.findUnique({
      where: { userId: req.user!.id },
    });
    if (!profile) return res.status(404).json({ error: 'Developer profile not found' });

    const property = await prisma.property.findFirst({
      where: { id: propertyId, developerId: profile.id },
    });
    if (!property) return res.status(404).json({ error: 'Property not found or not owned by you' });

    const short = await prisma.short.create({
      data: {
        propertyId,
        uploaderId: req.user!.id,
        videoUrl,
        videoS3Key: videoKey || null,
        thumbnailUrl: thumbnailUrl || null,
        thumbnailS3Key: thumbnailKey || null,
        caption: caption || null,
        duration: duration ? parseFloat(duration) : null,
      } as any,
    });

    // Increment short count on property
    await prisma.property.update({
      where: { id: propertyId },
      data: { shortCount: { increment: 1 } },
    });

    res.status(201).json({ success: true, short });
  } catch (error) {
    console.error('Upload short error:', error);
    res.status(500).json({ error: 'Failed to save short' });
  }
});

// ─── CONFIRM AVATAR/KYC UPLOAD ──────────────────────────────────────────────
// POST /api/uploads/avatar
// Body: { key, publicUrl }
router.post('/avatar', async (req: AuthRequest, res: Response) => {
  try {
    const { publicUrl } = req.body;

    if (!publicUrl) return res.status(400).json({ error: 'publicUrl is required' });

    await prisma.user.update({
      where: { id: req.user!.id },
      data: { avatarUrl: publicUrl },
    });

    res.json({ success: true, avatarUrl: publicUrl });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update avatar' });
  }
});

export default router;
