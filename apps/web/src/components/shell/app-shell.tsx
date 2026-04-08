'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Banknote,
  Bell,
  CalendarDays,
  ChevronLeft,
  Clock3,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Receipt,
  Settings,
  Timer,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';

type NavItem = { href: string; label: string; icon: React.ReactNode };

function NavLink({ item, collapsed }: { item: NavItem; collapsed?: boolean }) {
  const pathname = usePathname();
  const active = pathname === item.href || (item.href !== '/app' && item.href !== '/app/admin' && pathname.startsWith(item.href + '/'));
  const exactActive = pathname === item.href;
  const isActive = active || exactActive;

  return (
    <Link
      href={item.href}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
        isActive
          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
        collapsed && 'justify-center px-2',
      )}
      title={collapsed ? item.label : undefined}
    >
      <span className="shrink-0">{item.icon}</span>
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  );
}

const adminNav: NavItem[] = [
  { href: '/app/admin', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
  { href: '/app/admin/employees', label: 'Employees', icon: <Users className="h-4 w-4" /> },
  { href: '/app/clock', label: 'Clock', icon: <Clock3 className="h-4 w-4" /> },
  { href: '/app/timesheet', label: 'Timesheet', icon: <Timer className="h-4 w-4" /> },
  { href: '/app/admin/attendance', label: 'Attendance', icon: <Clock3 className="h-4 w-4" /> },
  { href: '/app/admin/leave', label: 'Leave', icon: <CalendarDays className="h-4 w-4" /> },
  { href: '/app/admin/payroll', label: 'Payroll', icon: <Banknote className="h-4 w-4" /> },
  { href: '/app/admin/documents', label: 'Documents', icon: <FileText className="h-4 w-4" /> },
  { href: '/app/admin/notifications', label: 'Notifications', icon: <Bell className="h-4 w-4" /> },
];

const employeeNav: NavItem[] = [
  { href: '/app', label: 'Clock', icon: <Clock3 className="h-4 w-4" /> },
  { href: '/app/timesheet', label: 'Timesheet', icon: <Timer className="h-4 w-4" /> },
  { href: '/app/leave', label: 'Leave', icon: <CalendarDays className="h-4 w-4" /> },
  { href: '/app/payslips', label: 'Payslips', icon: <Receipt className="h-4 w-4" /> },
  { href: '/app/documents', label: 'Documents', icon: <FileText className="h-4 w-4" /> },
  { href: '/app/notifications', label: 'Notifications', icon: <Bell className="h-4 w-4" /> },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { state, logout } = useAuth();
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  React.useEffect(() => {
    if (state.status === 'anonymous') {
      router.replace('/login');
    }
  }, [state.status, router]);

  if (state.status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      </div>
    );
  }

  if (state.status === 'anonymous') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Redirecting…</p>
      </div>
    );
  }

  const isAdmin = state.user.role === 'ADMIN';
  const nav = isAdmin ? adminNav : employeeNav;
  const initials = (state.user.email ?? 'U').slice(0, 2).toUpperCase();

  const sidebarContent = (
    <>
      <div className={cn('flex items-center gap-2 px-3 py-2', collapsed && 'justify-center px-2')}>
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary">
          <span className="text-xs font-bold text-primary-foreground">U</span>
        </div>
        {!collapsed && <span className="font-semibold tracking-tight text-sm">Uppearance</span>}
      </div>
      <Separator className="my-2" />
      <nav className="flex-1 space-y-1 px-2">
        {nav.map((item) => (
          <NavLink key={item.href} item={item} collapsed={collapsed} />
        ))}
      </nav>
      <Separator className="my-2" />
      <div className="px-2 pb-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={cn(
              'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-sidebar-accent',
              collapsed && 'justify-center px-2'
            )}>
              <Avatar className="h-7 w-7">
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
              {!collapsed && (
                <div className="flex-1 text-left">
                  <div className="text-xs font-medium truncate">{state.user.email}</div>
                  <div className="text-[10px] text-muted-foreground">{isAdmin ? 'Admin' : 'Employee'}</div>
                </div>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{state.user.email}</p>
                <p className="text-xs text-muted-foreground">{isAdmin ? 'Administrator' : 'Employee'}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => void logout()}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden md:flex flex-col border-r border-sidebar-border bg-sidebar transition-all duration-200',
          collapsed ? 'w-[60px]' : 'w-[220px]',
        )}
      >
        <div className="flex flex-1 flex-col py-2">
          {sidebarContent}
        </div>
        <div className="border-t border-sidebar-border px-2 py-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground"
            onClick={() => setCollapsed(!collapsed)}
          >
            <ChevronLeft className={cn('h-4 w-4 transition-transform', collapsed && 'rotate-180')} />
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col">
        {/* Top header */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:px-6">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[260px] p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <div className="flex h-full flex-col py-2" onClick={() => setMobileOpen(false)}>
                {sidebarContent}
              </div>
            </SheetContent>
          </Sheet>

          <div className="flex-1">
            <h2 className="text-sm font-medium text-muted-foreground md:hidden">Uppearance</h2>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              onClick={() => router.push(isAdmin ? '/app/admin/notifications' : '/app/notifications')}
            >
              <Bell className="h-4 w-4" />
            </Button>
            <div className="hidden md:block">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{state.user.email}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">{state.user.email}</p>
                      <p className="text-xs text-muted-foreground">{isAdmin ? 'Administrator' : 'Employee'}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => void logout()}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <main className="flex-1">
          <div className="mx-auto max-w-6xl p-4 md:p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
