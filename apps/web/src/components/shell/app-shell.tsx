'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, CalendarDays, Clock3, FileText, LayoutDashboard, LogOut, Users } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';

type NavItem = { href: string; label: string; icon: React.ReactNode };

function NavLink({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const active = pathname === item.href || pathname.startsWith(item.href + '/');
  return (
    <Link
      href={item.href}
      className={cn(
        'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
        active
          ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-900 dark:text-zinc-50'
          : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-50',
      )}
    >
      <span className="shrink-0">{item.icon}</span>
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { state, logout } = useAuth();
  const pathname = usePathname();

  // Avoid triggering navigation during render (can cause hydration warnings).
  // Redirect after mount when we know the client auth state.
  React.useEffect(() => {
    if (state.status === 'anonymous') {
      router.replace('/login');
    }
  }, [state.status, router]);

  if (state.status === 'loading') {
    return <div className="flex flex-1 items-center justify-center text-sm text-zinc-600 dark:text-zinc-400">Loading…</div>;
  }

  if (state.status === 'anonymous') {
    return <div className="flex flex-1 items-center justify-center text-sm text-zinc-600 dark:text-zinc-400">Redirecting…</div>;
  }

  const isAdmin = state.user.role === 'ADMIN';

  const adminNav: NavItem[] = [
    { href: '/app/admin', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
    { href: '/app/admin/employees', label: 'Employees', icon: <Users className="h-4 w-4" /> },
    { href: '/app/admin/attendance', label: 'Attendance', icon: <Clock3 className="h-4 w-4" /> },
    { href: '/app/admin/leave', label: 'Leave', icon: <CalendarDays className="h-4 w-4" /> },
    { href: '/app/admin/documents', label: 'Documents', icon: <FileText className="h-4 w-4" /> },
    { href: '/app/admin/notifications', label: 'Notifications', icon: <Bell className="h-4 w-4" /> },
  ];

  const employeeNav: NavItem[] = [
    { href: '/app', label: 'Clock', icon: <Clock3 className="h-4 w-4" /> },
    { href: '/app/leave', label: 'Leave', icon: <CalendarDays className="h-4 w-4" /> },
    { href: '/app/documents', label: 'Documents', icon: <FileText className="h-4 w-4" /> },
    { href: '/app/notifications', label: 'Notifications', icon: <Bell className="h-4 w-4" /> },
  ];

  return (
    <div className="flex min-h-screen">
      {isAdmin ? (
        <aside className="hidden w-64 shrink-0 border-r border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950 md:block">
          <div className="mb-4">
            <div className="text-xs font-medium text-zinc-500">Upappearance</div>
            <div className="text-sm font-semibold">HRMS</div>
          </div>
          <nav className="space-y-1">
            {adminNav.map((item) => (
              <NavLink key={item.href} item={item} />
            ))}
          </nav>
          <div className="mt-6 border-t border-zinc-100 pt-4 dark:border-zinc-900">
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => {
                void logout();
              }}
            >
              <LogOut className="h-4 w-4" /> Sign out
            </Button>
          </div>
        </aside>
      ) : (
        <header className="fixed inset-x-0 top-0 z-10 border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80 md:hidden">
          <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
            <div className="text-sm font-semibold">Upappearance HRMS</div>
            <Button variant="ghost" size="sm" onClick={() => void logout()}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
          <div className="mx-auto flex max-w-3xl gap-1 px-2 pb-2">
            {employeeNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-1 items-center justify-center gap-2 rounded-lg px-2 py-2 text-xs',
                  pathname === item.href
                    ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-900 dark:text-zinc-50'
                    : 'text-zinc-600 dark:text-zinc-400',
                )}
              >
                {item.icon} {item.label}
              </Link>
            ))}
          </div>
        </header>
      )}

      <main className={cn('flex-1', !isAdmin && 'pt-24 md:pt-0')}>
        <div className="mx-auto max-w-6xl p-4 md:p-8">{children}</div>
      </main>
    </div>
  );
}

