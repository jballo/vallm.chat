import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Protected Routes
const isProtectedRoute = createRouteMatcher([
  '/settings(.*)',
]);

// Selective enforcement
export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) await auth.protect();
});

// URL list Middleware looks at (protected or not)
export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};