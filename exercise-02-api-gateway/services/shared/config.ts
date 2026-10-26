import { z } from 'zod';

const baseSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
});

export function baseConfig() {
  return baseSchema.parse(process.env);
}

export const jwtConfigSchema = z.object({
  JWT_SECRET: z.string().min(32).refine((value) => !value.startsWith('CHANGE_ME'), {
    message: 'JWT_SECRET must be replaced with a real development secret',
  }),
  JWT_ISSUER: z.string().min(1).default('security-patterns-lab'),
  JWT_AUDIENCE: z.string().min(1).default('api-gateway'),
  JWT_TTL_SECONDS: z.coerce.number().int().positive().max(3600).default(900),
});

export const storageConfigSchema = z.object({
  MINIO_INTERNAL_HOST: z.string().default('minio'),
  MINIO_INTERNAL_PORT: z.coerce.number().int().positive().default(9000),
  MINIO_PUBLIC_HOST: z.string().default('localhost'),
  MINIO_PUBLIC_PORT: z.coerce.number().int().positive().default(9000),
  MINIO_USE_SSL: z.string().default('false').transform((value) => value === 'true'),
  MINIO_ROOT_USER: z.string().min(3).refine((value) => !value.startsWith('CHANGE_ME')),
  MINIO_ROOT_PASSWORD: z.string().min(8).refine((value) => !value.startsWith('CHANGE_ME')),
  MINIO_BUCKET: z.string().min(3).default('avatars'),
});

