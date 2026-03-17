
import type { RouteObject } from 'react-router-dom';
import { lazy } from 'react';

// Lazy load components
const HomePage = lazy(() => import('../pages/home/page'));
const LoginPage = lazy(() => import('../pages/auth/login/page'));
const RegisterPage = lazy(() => import('../pages/auth/register/page'));
const VerifyEmailPage = lazy(() => import('../pages/auth/verify/page'));
const OnboardingPage = lazy(() => import('../pages/onboarding/page'));
const PricingPage = lazy(() => import('../pages/pricing/page'));
const ProfilePage = lazy(() => import('../pages/profile/page'));
const BillingPage = lazy(() => import('../pages/billing/page'));
const FeedPage = lazy(() => import('../pages/feed/page'));
const AnalyticsPage = lazy(() => import('../pages/analytics/page'));
const AdminPage = lazy(() => import('../pages/admin/page'));
const TermsPage = lazy(() => import('../pages/terms/page'));
const PrivacyPage = lazy(() => import('../pages/privacy/page'));
const CookiesPage = lazy(() => import('../pages/cookies/page'));
const NotFoundPage = lazy(() => import('../pages/NotFound'));

// Blog pages
const BlogPage = lazy(() => import('../pages/blog/page'));
const BlogArticlePage = lazy(() => import('../pages/blog/article/page'));

const routes: RouteObject[] = [
  {
    path: '/',
    element: <HomePage />,
  },
  {
    path: '/auth/login',
    element: <LoginPage />,
  },
  {
    path: '/auth/register',
    element: <RegisterPage />,
  },
  {
    path: '/auth/verify',
    element: <VerifyEmailPage />,
  },
  {
    path: '/onboarding',
    element: <OnboardingPage />,
  },
  {
    path: '/pricing',
    element: <PricingPage />,
  },
  {
    path: '/profile',
    element: <ProfilePage />,
  },
  {
    path: '/billing',
    element: <BillingPage />,
  },
  {
    path: '/feed',
    element: <FeedPage />,
  },
  {
    path: '/analytics',
    element: <AnalyticsPage />,
  },
  {
    path: '/admin',
    element: <AdminPage />,
  },
  {
    path: '/admin/dashboard',
    element: <AdminPage />,
  },
  {
    path: '/blog',
    element: <BlogPage />,
  },
  {
    path: '/blog/:slug',
    element: <BlogArticlePage />,
  },
  {
    path: '/terms',
    element: <TermsPage />,
  },
  {
    path: '/privacy',
    element: <PrivacyPage />,
  },
  {
    path: '/cookies',
    element: <CookiesPage />,
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
];

export default routes;
