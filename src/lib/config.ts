// Which required environment variables are missing? Used to show a helpful
// /setup page instead of a 500 error when a deployment is not configured yet.
// Only variable NAMES are ever shown, never values.

export const REQUIRED_ENV = [
  { name: "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", where: "Clerk → API Keys" },
  { name: "CLERK_SECRET_KEY", where: "Clerk → API Keys" },
  { name: "NEXT_PUBLIC_SUPABASE_URL", where: "Supabase → Project Settings → API" },
  { name: "NEXT_PUBLIC_SUPABASE_ANON_KEY", where: "Supabase → Project Settings → API (anon / publishable key)" },
  { name: "SUPABASE_SERVICE_ROLE_KEY", where: "Supabase → Project Settings → API (service_role key)" },
] as const;

export const OPTIONAL_ENV = [
  { name: "RESEND_API_KEY", where: "Resend → API Keys (without it, e-mails are skipped)" },
  { name: "NEXT_PUBLIC_APP_URL", where: "Your Vercel URL, used in e-mail links" },
] as const;

// NEXT_PUBLIC_* values must be read with literal names so Next.js can inline them.
function envValue(name: string): string | undefined {
  switch (name) {
    case "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY":
      return process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
    case "NEXT_PUBLIC_SUPABASE_URL":
      return process.env.NEXT_PUBLIC_SUPABASE_URL;
    case "NEXT_PUBLIC_SUPABASE_ANON_KEY":
      return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    case "NEXT_PUBLIC_APP_URL":
      return process.env.NEXT_PUBLIC_APP_URL;
    default:
      return process.env[name];
  }
}

export function missingEnv(list: readonly { name: string }[] = REQUIRED_ENV) {
  return list.filter((v) => !envValue(v.name)?.trim()).map((v) => v.name);
}

export function clerkConfigured() {
  return !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && !!process.env.CLERK_SECRET_KEY;
}
