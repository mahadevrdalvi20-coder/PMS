import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { missingEnv } from "@/lib/config";

// Next.js 16 calls middleware "proxy". This runs before every request and
// sends signed-out visitors to /sign-in for anything that is not public.
// (It is the first gate only — each page also checks the employee record,
// and the database enforces Row Level Security.)
const isPublicRoute = createRouteMatcher(["/", "/setup", "/sign-in(.*)", "/sign-up(.*)"]);

const withClerk = clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export default function proxy(req: NextRequest, event: NextFetchEvent) {
  // Not configured yet (e.g. env vars not added in Vercel)? Show the setup
  // page instead of crashing every request with a 500.
  if (missingEnv().length > 0) {
    if (req.nextUrl.pathname === "/setup") return NextResponse.next();
    return NextResponse.rewrite(new URL("/setup", req.url));
  }
  return withClerk(req, event);
}

export const config = {
  matcher: [
    // Skip Next.js internals and static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
