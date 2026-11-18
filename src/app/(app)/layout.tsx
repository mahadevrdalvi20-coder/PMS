import { AppNav, type NavSection } from "@/components/app-nav";
import { requireUser } from "@/lib/session";

// Shell for every signed-in page. The navigation is built on the SERVER from
// the employee record, so an employee never even receives the HR menu.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const me = await requireUser();

  const sections: NavSection[] = [
    {
      items: [
        { href: "/dashboard", label: "Dashboard", icon: "home" },
        { href: "/goals", label: "My Goals", icon: "target" },
        { href: "/review", label: "My Review", icon: "clipboard" },
        { href: "/history", label: "Review History", icon: "history" },
      ],
    },
  ];
  if (me.isManager) {
    sections.push({ title: "Manager", items: [{ href: "/team", label: "My Team", icon: "users" }] });
  }
  if (me.isHR) {
    sections.push({
      title: "HR Admin",
      items: [
        { href: "/admin/employees", label: "Employees", icon: "building" },
        { href: "/admin/cycles", label: "Review Cycles", icon: "calendar" },
        { href: "/admin/report", label: "Completion Report", icon: "chart" },
      ],
    });
  }

  const roleLabel = me.isHR ? "HR Admin" : me.isManager ? "Manager" : "Employee";

  return (
    <div className="min-h-dvh">
      <AppNav sections={sections} name={me.full_name} subtitle={`${roleLabel}${me.designation ? ` · ${me.designation}` : ""}`} />
      <main className="lg:pl-64">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</div>
      </main>
    </div>
  );
}
