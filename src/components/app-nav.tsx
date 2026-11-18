"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { UserButton } from "@clerk/nextjs";
import { cn, Icon } from "@/components/ui";

export interface NavItem {
  href: string;
  label: string;
  icon: string;
}
export interface NavSection {
  title?: string;
  items: NavItem[];
}

function Brand() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2.5">
      <span className="flex size-8 items-center justify-center rounded-lg bg-brand-700 text-white">
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M4 17 9 12l4 4 7-8" />
          <path d="M15 8h5v5" />
        </svg>
      </span>
      <span className="text-lg font-bold tracking-tight text-slate-900">Stride</span>
    </Link>
  );
}

function Links({ sections, onNavigate }: { sections: NavSection[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-6" aria-label="Main">
      {sections.map((section, i) => (
        <div key={section.title ?? i}>
          {section.title && <div className="mb-2 px-3 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">{section.title}</div>}
          <ul className="flex flex-col gap-0.5">
            {section.items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      active ? "bg-brand-50 text-brand-800" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                    )}
                  >
                    <Icon name={item.icon} className={cn("size-[18px]", active ? "text-brand-700" : "text-slate-400")} />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function UserCard({ name, subtitle }: { name: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <UserButton />
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-slate-900">{name}</div>
        <div className="truncate text-xs text-slate-500">{subtitle}</div>
      </div>
    </div>
  );
}

/** Sidebar on desktop, top bar + slide-over drawer on phones. */
export function AppNav({ sections, name, subtitle }: { sections: NavSection[]; name: string; subtitle: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="flex h-16 items-center px-6">
          <Brand />
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <Links sections={sections} />
        </div>
        <div className="p-3">
          <UserCard name={name} subtitle={subtitle} />
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="-ml-2 rounded-lg p-2 text-slate-600 hover:bg-slate-100"
          aria-label="Open menu"
          aria-expanded={open}
        >
          <Icon name="menu" />
        </button>
        <Brand />
        <UserButton />
      </header>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
          <button className="absolute inset-0 bg-slate-900/40" aria-label="Close menu" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col bg-white shadow-xl">
            <div className="flex h-14 items-center justify-between px-4">
              <Brand />
              <button onClick={() => setOpen(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Close menu">
                <Icon name="x" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-4">
              <Links sections={sections} onNavigate={() => setOpen(false)} />
            </div>
            <div className="p-3">
              <UserCard name={name} subtitle={subtitle} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
