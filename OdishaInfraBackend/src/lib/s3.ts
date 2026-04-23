import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-south-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const BUCKET = process.env.AWS_S3_BUCKET || 'odishainfra-media';
const CLOUDFRONT_URL = process.env.AWS_CLOUDFRONT_URL || '';

// Allowed MIME types
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'];

// Max sizes
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB

type MediaType = 'property-images' | 'property-videos' | 'shorts' | 'thumbnails' | 'kyc-docs' | 'avatars';

/**
 * Generate a unique S3 key for a file
 */
function generateKey(type: MediaType, extension: string): string {
  const id = crypto.randomUUID();
  const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  return `${type}/${date}/${id}.${extension}`;
}

/**
 * Get a presigned PUT URL for uploading a file directly from the client.
 * The client can upload the file with a PUT request to this URL.
 */
export async function getPresignedUploadUrl(
  type: MediaType,
  contentType: string,
  fileExtension: string,
): Promise<{ uploadUrl: string; key: string; publicUrl: string }> {
  // Validate content type
  const isImage = ALLOWED_IMAGE_TYPES.includes(contentType);
  const isVideo = ALLOWED_VIDEO_TYPES.includes(contentType);

  if (!isImage && !isVideo) {
    throw new Error(`Unsupported file type: ${contentType}. Allowed: ${[...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES].join(', ')}`);
  }

  // Validate type/content match
  if ((type === 'property-images' || type === 'thumbnails' || type === 'avatars') && !isImage) {
    throw new Error('Only images allowed for this upload type');
  }
  if ((type === 'shorts' || type === 'property-videos') && !isVideo) {
    throw new Error('Only videos allowed for this upload type');
  }

  const key = generateKey(type, fileExtension);

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
    // Set max content length based on type
    ContentLength: isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE,
    // Metadata
    Metadata: {
      'uploaded-by': 'odishainfra-app',
      'media-type': type,
    },
  });

  // Presigned URL valid for 15 minutes
  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 });

  // Public URL: use CloudFront if configured, otherwise direct S3
  const publicUrl = CLOUDFRONT_URL
    ? `${CLOUDFRONT_URL}/${key}`
    : `https://${BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

  return { uploadUrl, key, publicUrl };
}

/**
 * Get a presigned GET URL (for private files like KYC docs)
 */
export async function getPresignedDownloadUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });
  return getSignedUrl(s3Client, command, { expiresIn: 3600 }); // 1 hour
}

/**
 * Delete a file from S3
 */
export async function deleteFile(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });
  await s3Client.send(command);
}

/**
 * Get the public URL for a given S3 key
 */
export function getPublicUrl(key: string): string {
  if (CLOUDFRONT_URL) {
    return `${CLOUDFRONT_URL}/${key}`;
  }
  return `https://${BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
}

export { s3Client, BUCKET, CLOUDFRONT_URL };
