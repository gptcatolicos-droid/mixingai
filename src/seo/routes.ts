// Keep public marketing pages out of the private application namespace.
export const privatePaths = [
  '/auth/login', '/auth/register', '/auth/verify', '/onboarding', '/profile',
  '/billing', '/feed', '/analytics', '/admin', '/admin/dashboard',
  '/payment-confirmation', '/mastering', '/mastering/album', '/checkout-v3',
];
export const privatePrefixes = ['/auth', '/onboarding', '/profile', '/billing', '/feed',
  '/analytics', '/admin', '/payment-confirmation', '/mastering', '/checkout-v3'];
export function isPrivatePath(path: string) {
  return privatePrefixes.some(prefix => path === prefix || path.startsWith(`${prefix}/`));
}
export type PageMetadata = {
  path: string;
  title: string;
  description: string;
  lang: 'es' | 'en';
  alternates?: Record<string, string>;
  image?: string;
  type?: 'website' | 'article';
  published?: string;
  schema: unknown[];
};
export const origin = 'https://mixingmusic.ai';
