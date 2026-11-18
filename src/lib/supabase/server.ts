import "server-only";
import { cache } from "react";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Supabase client that acts AS THE SIGNED-IN USER.
 *
 * Every request carries the user's Clerk session token. Supabase is set up to
 * trust Clerk (Third-Party Auth), so inside Postgres `auth.jwt() ->> 'sub'` is
 * the Clerk user id and Row Level Security decides what this user may read or
 * write. Even if a page forgot an authorisation check, the database would
 * still refuse to return another employee's review.
 *
 * `cache` makes this one client per request, not one per query.
 */
export const getSupabase = cache(async () => {
  const { getToken } = await auth();
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      accessToken: async () => (await getToken()) ?? null,
    },
  );
});
