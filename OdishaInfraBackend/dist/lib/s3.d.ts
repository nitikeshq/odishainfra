import { S3Client } from '@aws-sdk/client-s3';
declare const s3Client: S3Client;
declare const BUCKET: string;
declare const CLOUDFRONT_URL: string;
type MediaType = 'property-images' | 'property-videos' | 'shorts' | 'thumbnails' | 'kyc-docs' | 'avatars';
/**
 * Get a presigned PUT URL for uploading a file directly from the client.
 * The client can upload the file with a PUT request to this URL.
 */
export declare function getPresignedUploadUrl(type: MediaType, contentType: string, fileExtension: string): Promise<{
    uploadUrl: string;
    key: string;
    publicUrl: string;
}>;
/**
 * Get a presigned GET URL (for private files like KYC docs)
 */
export declare function getPresignedDownloadUrl(key: string): Promise<string>;
/**
 * Delete a file from S3
 */
export declare function deleteFile(key: string): Promise<void>;
/**
 * Get the public URL for a given S3 key
 */
export declare function getPublicUrl(key: string): string;
export { s3Client, BUCKET, CLOUDFRONT_URL };
//# sourceMappingURL=s3.d.ts.map