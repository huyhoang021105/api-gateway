import { scryptSync, timingSafeEqual } from 'node:crypto';

export type User = {
  id: string;
  email: string;
  displayName: string;
  role: 'user' | 'admin';
  passwordHash: Buffer;
};

const salt = 'security-patterns-local-lab';

export function hashPassword(password: string): Buffer {
  return scryptSync(password, salt, 64);
}

export function buildUsers(): User[] {
  const email = process.env.DEMO_USER_EMAIL ?? 'student@example.test';
  const password = process.env.DEMO_USER_PASSWORD;
  if (!password || password.startsWith('CHANGE_ME') || password.length < 8) {
    throw new Error('DEMO_USER_PASSWORD must be configured and contain at least 8 characters');
  }
  return [{
    id: 'usr-001',
    email,
    displayName: 'Security Lab Student',
    role: 'user',
    passwordHash: hashPassword(password),
  }];
}

export function passwordMatches(password: string, expected: Buffer): boolean {
  const candidate = hashPassword(password);
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

export function publicUser(user: User) {
  return { id: user.id, email: user.email, displayName: user.displayName, role: user.role };
}

