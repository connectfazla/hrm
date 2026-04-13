'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Banknote,
  Bell,
  BarChart3,
  BookOpen,
  CalendarDays,
  ChevronLeft,
  Clock3,
  FileText,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  Receipt,
  Settings,
  Timer,
  User,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api';
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
import { BrandLogo } from '@/components/brand/brand-logo';

type NavItem = { href: string; label: string; icon: React.ReactNode };
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1';

function NavLink({ item, collapsed }: { item: NavItem; collapsed?: boolean }) {
  const pathname = usePathname();
  const active = pathname === item.href || (item.href !== '/app' && item.href !== '/app/admin' && pathname.startsWith(item.href + '/'));
  const exactActive = pathname === item.href;
  const isActive = active || exactActive;

  return (
    <Link
      href={item.href}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150',
        isActive
          ? 'bg-primary/10 text-primary shadow-sm'
          : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
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
  { href: '/app/admin/reports', label: 'Reports', icon: <BarChart3 className="h-4 w-4" /> },
  { href: '/app/admin/api-docs', label: 'API Docs', icon: <BookOpen className="h-4 w-4" /> },
  { href: '/app/admin/settings', label: 'Settings', icon: <Settings className="h-4 w-4" /> },
  { href: '/app/admin/notifications', label: 'Notifications', icon: <Bell className="h-4 w-4" /> },
];

const employeeNav: NavItem[] = [
  { href: '/app', label: 'Clock', icon: <Clock3 className="h-4 w-4" /> },
  { href: '/app/timesheet', label: 'Timesheet', icon: <Timer className="h-4 w-4" /> },
  { href: '/app/leave', label: 'Leave', icon: <CalendarDays className="h-4 w-4" /> },
  { href: '/app/payslips', label: 'Payslips', icon: <Receipt className="h-4 w-4" /> },
  { href: '/app/documents', label: 'Documents', icon: <FileText className="h-4 w-4" /> },
  { href: '/app/notifications', label: 'Notifications', icon: <Bell className="h-4 w-4" /> },
  { href: '/app/profile', label: 'Profile', icon: <User className="h-4 w-4" /> },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { state, logout } = useAuth();
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [hasUnreadNotifications, setHasUnreadNotifications] = React.useState(false);
  const pathname = usePathname();

  React.useEffect(() => {
    if (state.status === 'anonymous') {
      router.replace('/login');
    }
  }, [state.status, router]);

  React.useEffect(() => {
    if (state.status === 'authenticated' && state.user.role !== 'ADMIN' && pathname.startsWith('/app/admin')) {
      router.replace('/app');
    }
  }, [state, pathname, router]);

  if (state.status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 animate-fade-up">
          <BrandLogo href={null} size="lg" />
          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-primary/10">
            <div className="h-full w-1/2 animate-shimmer rounded-full bg-primary/40" />
          </div>
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
  const appHomeHref = isAdmin ? '/app/admin' : '/app';
  const nav = isAdmin ? adminNav : employeeNav;
  const displayName = state.user.fullName || state.user.email || 'User';
  const initials = state.user.fullName
    ? state.user.fullName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
    : (state.user.email ?? 'U').slice(0, 2).toUpperCase();
  const profilePhotoUrl =
    state.user.employeeId && state.user.profilePhotoDocumentId
      ? `${API_BASE}/documents/${state.user.employeeId}/${state.user.profilePhotoDocumentId}/download`
      : null;
  const mobileNav: NavItem[] = isAdmin
    ? [
        { href: '/app/admin', label: 'Home', icon: <Home className="h-5 w-5" /> },
        { href: '/app/clock', label: 'Clock', icon: <Clock3 className="h-5 w-5" /> },
        { href: '/app/timesheet', label: 'Timesheet', icon: <Timer className="h-5 w-5" /> },
        { href: '/app/admin/notifications', label: 'Alerts', icon: <Bell className="h-5 w-5" /> },
        { href: '/app/profile', label: 'Profile', icon: <User className="h-5 w-5" /> },
      ]
    : [
        { href: '/app', label: 'Clock', icon: <Clock3 className="h-5 w-5" /> },
        { href: '/app/timesheet', label: 'Timesheet', icon: <Timer className="h-5 w-5" /> },
        { href: '/app/leave', label: 'Leave', icon: <CalendarDays className="h-5 w-5" /> },
        { href: '/app/notifications', label: 'Alerts', icon: <Bell className="h-5 w-5" /> },
        { href: '/app/profile', label: 'Profile', icon: <User className="h-5 w-5" /> },
      ];

  const sidebarContent = (
    <>
      <div className={cn('flex items-center px-3 py-3', collapsed ? 'justify-center px-2' : 'gap-2')}>
        <BrandLogo size={collapsed ? 'md' : 'lg'} href={appHomeHref} />
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
                {profilePhotoUrl ? (
                  <img src={profilePhotoUrl} alt={displayName} className="h-full w-full object-cover" />
                ) : (
                  <AvatarFallback className="text-xs font-semibold">{initials}</AvatarFallback>
                )}
              </Avatar>
              {!collapsed && (
                <div className="flex-1 text-left">
                  <div className="text-xs font-medium truncate">{displayName}</div>
                  <div className="text-[10px] text-muted-foreground">{isAdmin ? 'Admin' : 'Employee'}</div>
                </div>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{displayName}</p>
                <p className="text-xs text-muted-foreground">{state.user.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/app/profile')}>
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            {isAdmin && (
              <DropdownMenuItem onClick={() => router.push('/app/admin/settings')}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
            )}
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

  const refreshUnread = React.useCallback(() => {
    apiFetch<{ unread: number }>('/notifications/unread-count')
      .then((r) => setHasUnreadNotifications((r.unread ?? 0) > 0))
      .catch(() => undefined);
  }, []);

  React.useEffect(() => {
    if (state.status !== 'authenticated') return;
    refreshUnread();
    const id = setInterval(refreshUnread, 30000);
    return () => clearInterval(id);
  }, [state.status, refreshUnread]);

  React.useEffect(() => {
    if (pathname === '/app/notifications' || pathname === '/app/admin/notifications') {
      // The notifications pages mark items as read; refresh shortly after navigation.
      const t = setTimeout(refreshUnread, 750);
      return () => clearTimeout(t);
    }
  }, [pathname, refreshUnread]);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden md:flex flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300 ease-in-out',
          collapsed ? 'w-[64px]' : 'w-[240px]',
        )}
      >
        <div className="flex flex-1 flex-col py-2">
          {sidebarContent}
        </div>
        <div className="border-t border-sidebar-border px-2 py-1.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={() => setCollapsed(!collapsed)}
          >
            <ChevronLeft className={cn('h-4 w-4 transition-transform duration-300', collapsed && 'rotate-180')} />
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col">
        {/* Top header */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-border/60 bg-background/80 px-4 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 md:px-6">
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

          <div className="flex flex-1 items-center md:hidden">
            <BrandLogo size="lg" href={appHomeHref} />
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              onClick={() => router.push(isAdmin ? '/app/admin/notifications' : '/app/notifications')}
            >
              <Bell className="h-4 w-4" />
              {hasUnreadNotifications && (
                <span
                  aria-hidden
                  className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-background"
                />
              )}
            </Button>
            <div className="hidden md:block">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <Avatar className="h-6 w-6">
                      {profilePhotoUrl ? (
                        <img src={profilePhotoUrl} alt={displayName} className="h-full w-full object-cover" />
                      ) : (
                        <AvatarFallback className="text-[10px] font-semibold">{initials}</AvatarFallback>
                      )}
                    </Avatar>
                    <span className="text-sm">{displayName}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">{displayName}</p>
                      <p className="text-xs text-muted-foreground">{state.user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push('/app/profile')}>
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem onClick={() => router.push('/app/admin/settings')}>
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </DropdownMenuItem>
                  )}
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
          <div className="mx-auto max-w-6xl px-3 py-4 pb-24 md:p-6 md:pb-6 lg:p-8">{children}</div>
        </main>
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-background/95 px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 backdrop-blur md:hidden">
        <div className="grid grid-cols-5 gap-1">
          {mobileNav.map((item) => {
            const active = pathname === item.href || (item.href !== '/app' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 rounded-lg py-2 text-[11px] font-medium transition-colors',
                  active ? 'bg-primary/12 text-primary' : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                )}
              >
                {item.icon}
                <span className="leading-none">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
