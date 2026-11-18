import { requireHR } from "@/lib/session";

// Every /admin page is HR-only. Non-HR users are redirected to their dashboard
// (and RLS would refuse their writes anyway).
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireHR();
  return children;
}
