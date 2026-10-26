import { randomUUID } from 'node:crypto';
import { CreateBucketCommand, HeadBucketCommand, HeadObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import { storageConfigSchema } from '../shared/config.js';
import { HttpError } from '../shared/http.js';

export const allowedContentTypes = ['image/jpeg', 'image/png'] as const;
export const maxAvatarBytes = 2 * 1024 * 1024;
export const uploadTtlSeconds = 5 * 60;

type AllowedContentType = (typeof allowedContentTypes)[number];

function values() {
  return storageConfigSchema.parse(process.env);
}

function clientFor(host: string, port: number): S3Client {
  const env = values();
  return new S3Client({
    region: 'us-east-1',
    endpoint: `${env.MINIO_USE_SSL ? 'https' : 'http'}://${host}:${port}`,
    forcePathStyle: true,
    credentials: { accessKeyId: env.MINIO_ROOT_USER, secretAccessKey: env.MINIO_ROOT_PASSWORD },
  });
}

function internalClient(): S3Client {
  const env = values();
  return clientFor(env.MINIO_INTERNAL_HOST, env.MINIO_INTERNAL_PORT);
}

function publicSigningClient(): S3Client {
  const env = values();
  return clientFor(env.MINIO_PUBLIC_HOST, env.MINIO_PUBLIC_PORT);
}

export async function ensureBucket(retries = 20): Promise<void> {
  const env = values();
  const client = internalClient();
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      await client.send(new HeadBucketCommand({ Bucket: env.MINIO_BUCKET }));
      return;
    } catch (error) {
      try {
        await client.send(new CreateBucketCommand({ Bucket: env.MINIO_BUCKET }));
        return;
      } catch {
        // MinIO may still be starting; retry the complete operation.
      }
      if (attempt === retries) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

export async function createAvatarUpload(userId: string, contentType: AllowedContentType) {
  if (!allowedContentTypes.includes(contentType)) {
    throw new HttpError(400, 'UNSUPPORTED_CONTENT_TYPE', 'Only image/jpeg and image/png are allowed');
  }
  const env = values();
  const extension = contentType === 'image/png' ? 'png' : 'jpg';
  const objectKey = `avatars/${userId}/${randomUUID()}.${extension}`;
  const expiresAt = new Date(Date.now() + uploadTtlSeconds * 1000);
  const signed = await createPresignedPost(publicSigningClient(), {
    Bucket: env.MINIO_BUCKET,
    Key: objectKey,
    Expires: uploadTtlSeconds,
    Fields: { 'Content-Type': contentType },
    Conditions: [
      ['eq', '$key', objectKey],
      ['eq', '$Content-Type', contentType],
      ['content-length-range', 1, maxAvatarBytes],
    ],
  });
  return {
    method: 'POST',
    url: signed.url,
    fields: signed.fields,
    objectKey,
    expiresAt: expiresAt.toISOString(),
    maxBytes: maxAvatarBytes,
    allowedContentTypes,
  };
}

export async function confirmAvatar(userId: string, objectKey: string) {
  const env = values();
  const expectedPrefix = `avatars/${userId}/`;
  if (!objectKey.startsWith(expectedPrefix) || objectKey.includes('..')) {
    throw new HttpError(403, 'OBJECT_NOT_OWNED', 'Object does not belong to the authenticated user');
  }
  try {
    const metadata = await internalClient().send(new HeadObjectCommand({ Bucket: env.MINIO_BUCKET, Key: objectKey }));
    const contentType = metadata.ContentType;
    const size = metadata.ContentLength ?? 0;
    if (size < 1 || size > maxAvatarBytes || !allowedContentTypes.includes(contentType as AllowedContentType)) {
      throw new HttpError(400, 'INVALID_UPLOADED_OBJECT', 'Uploaded object violates avatar policy');
    }
    return { objectKey, size, contentType, verified: true };
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(404, 'OBJECT_NOT_FOUND', 'Uploaded object was not found');
  }
}

