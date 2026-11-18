import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Next.js 16 calls middleware "proxy". This runs before every request and
// sends signed-out visitors to /sign-in for anything that is not public.
// (It is the first gate only — each page also checks the employee record,
// and the database enforces Row Level Security.)
const isPublicRoute = createRouteMatcher(["/", "/sign-in(.*)", "/sign-up(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
