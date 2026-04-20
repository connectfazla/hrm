'use client';

import React from 'react';
import Link from 'next/link';
import {
  BarChart3,
  Bell,
  BookOpen,
  Calendar,
  Check,
  ClipboardList,
  Clock,
  FileText,
  LayoutDashboard,
  LayoutGrid,
  Menu,
  Plane,
  Settings,
  Shield,
  Users,
  Wallet,
  X,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BrandLogo } from '@/components/brand/brand-logo';
import { cn } from '@/lib/utils';

/** Brand accent — same as hero headline gradient */
const G = {
  from: '#73168C',
  to: '#281259',
} as const;

const gradText = 'bg-gradient-to-r from-[#73168C] to-[#281259] bg-clip-text text-transparent';
const gradBg = 'bg-gradient-to-r from-[#73168C] to-[#281259]';
const gradBgBr = 'bg-gradient-to-br from-[#73168C] via-[#4a0f5c] to-[#281259]';

function SectionShell({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('mx-auto w-full max-w-6xl px-[5%]', className)}>{children}</div>;
}

function SectionTag({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="mb-4 inline-flex items-center gap-1.5 text-[0.72rem] font-semibold uppercase tracking-[0.08em]"
      style={{ color: G.from }}
    >
      {children}
    </span>
  );
}

type FeatureIconVariant = 'purple' | 'teal' | 'blue';

const featureIconPlate: Record<
  FeatureIconVariant,
  { plate: string; shadow: string; icon: string }
> = {
  purple: {
    plate: 'linear-gradient(148deg, #faf6ff 0%, #efe6ff 45%, #e4d8f8 100%)',
    shadow:
      '0 3px 0 rgba(115, 22, 140, 0.12), 0 10px 28px rgba(115, 22, 140, 0.16), inset 0 1px 0 rgba(255,255,255,0.85)',
    icon: '#6b1f82',
  },
  teal: {
    plate: 'linear-gradient(148deg, #f2fdfb 0%, #e2faf5 45%, #cef3eb 100%)',
    shadow:
      '0 3px 0 rgba(13, 148, 136, 0.14), 0 10px 28px rgba(13, 148, 136, 0.14), inset 0 1px 0 rgba(255,255,255,0.85)',
    icon: '#0f766e',
  },
  blue: {
    plate: 'linear-gradient(148deg, #f5f8ff 0%, #e8f0ff 45%, #d7e4ff 100%)',
    shadow:
      '0 3px 0 rgba(37, 99, 235, 0.12), 0 10px 28px rgba(37, 99, 235, 0.14), inset 0 1px 0 rgba(255,255,255,0.85)',
    icon: '#1d4ed8',
  },
};

function FeatureIcon3D({ icon: Icon, variant }: { icon: LucideIcon; variant: FeatureIconVariant }) {
  const v = featureIconPlate[variant];
  return (
    <div
      className="mb-4 flex size-[52px] shrink-0 items-center justify-center rounded-[14px]"
      style={{
        background: v.plate,
        boxShadow: v.shadow,
        border: '1px solid rgba(255,255,255,0.55)',
      }}
    >
      <Icon
        className="size-[22px]"
        strokeWidth={2}
        style={{
          color: v.icon,
          filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.12))',
        }}
      />
    </div>
  );
}

function Grad({ children }: { children: React.ReactNode }) {
  return <span className={gradText}>{children}</span>;
}

const menuItems = [
  { name: 'Features', href: '#features' },
  { name: 'Pricing', href: '#pricing' },
  { name: 'About', href: '#about' },
];

const platformFeatures: {
  title: string;
  desc: string;
  icon: LucideIcon;
  iconVariant: FeatureIconVariant;
  uae?: boolean;
}[] = [
  {
    title: 'Authentication & Roles',
    desc: 'JWT-based login with Admin and Employee roles, password reset via email, and full session management.',
    icon: Shield,
    iconVariant: 'purple',
  },
  {
    title: 'Employee Management',
    desc: 'Full CRUD for personal info, Emirates ID, employment details, compensation, bank accounts, emergency contacts, and notes.',
    icon: Users,
    iconVariant: 'teal',
  },
  {
    title: 'Time Tracking',
    desc: 'Clock in/out with lunch breaks, late detection, and live world clocks for Dubai, Dhaka, and Cairo.',
    icon: Clock,
    iconVariant: 'blue',
  },
  {
    title: 'Timesheets',
    desc: 'Daily session view, summary cards, date range filters, and one-click CSV or PDF export.',
    icon: LayoutGrid,
    iconVariant: 'purple',
  },
  {
    title: 'Leave Management',
    desc: 'Full request workflow and balance dashboard for all leave types.',
    icon: Calendar,
    iconVariant: 'teal',
    uae: true,
  },
  {
    title: 'Payroll Engine',
    desc: 'Monthly runs, payslip generation, employee preview, CSV export, and full run history.',
    icon: Wallet,
    iconVariant: 'blue',
  },
  {
    title: 'Document Vault',
    desc: 'AES-256-GCM encrypted storage with category management and expiry tracking with alerts.',
    icon: FileText,
    iconVariant: 'purple',
  },
  {
    title: 'Salary Journey',
    desc: 'Full salary change history, raise dates, and percentage tracking for every employee.',
    icon: BarChart3,
    iconVariant: 'teal',
  },
  {
    title: 'Smart Notifications',
    desc: 'In-app alerts for leave decisions, document expiry, and salary changes.',
    icon: Bell,
    iconVariant: 'blue',
  },
];

const uaeBullets = [
  {
    title: 'Probation period enforcement',
    desc: 'Automatically restricts certain leave types during probation with clear alerts for admins.',
  },
  {
    title: 'Accurate annual leave accrual',
    desc: '30 days per year with prorated calculation from joining date.',
  },
  {
    title: 'All statutory leave types',
    desc: 'Annual, emergency, sick, maternity, study, Hajj, bereavement — all tracked and enforced.',
  },
];

const leaveEntitlements: { name: string; value: string; dot: string; valueColor: string }[] = [
  { name: 'Annual Leave', value: '30 days/yr', dot: 'bg-[#73168C]', valueColor: 'text-[#73168C]' },
  { name: 'Sick Leave', value: 'Up to 90 days', dot: 'bg-cyan-600', valueColor: 'text-cyan-600' },
  { name: 'Maternity Leave', value: '60 days', dot: 'bg-pink-500', valueColor: 'text-pink-600' },
  { name: 'Study Leave', value: '10 days/yr', dot: 'bg-amber-500', valueColor: 'text-amber-700' },
  { name: 'Hajj Leave', value: 'Once in service', dot: 'bg-emerald-600', valueColor: 'text-emerald-700' },
  { name: 'Emergency Leave', value: 'As needed', dot: 'bg-orange-500', valueColor: 'text-orange-700' },
];

const metrics = [
  { num: '14+', label: 'Leave types & categories tracked' },
  { num: 'AES-256', label: 'Military-grade document encryption' },
  { num: '3', label: 'World clocks (Dubai, Dhaka, Cairo)' },
  { num: '∞', label: 'Payroll history and payslips stored' },
];

const payrollPoints = [
  'One-click monthly payroll runs for your entire team',
  'Employee self-service payslip preview',
  'Salary journey with full raise history and percentages',
  'Bank-ready CSV export with all components',
];

const docPoints = [
  'AES-256-GCM encryption at rest for all files',
  'Expiry alerts before visa and Emirates ID renewals',
  'Category management for contracts, IDs, certifications',
];

const docShowcase = [
  { icon: '🛂', name: 'Passport', meta: 'Ahmed K.', expiry: 'Valid · Jun 2028', tone: 'ok' as const },
  { icon: '🪪', name: 'Emirates ID', meta: 'Sara M.', expiry: 'Exp. in 45d', tone: 'warn' as const },
  { icon: '📄', name: 'Labour Card', meta: 'Rahul P.', expiry: 'Valid', tone: 'ok' as const },
  { icon: '🏠', name: 'Visa', meta: 'Nour A.', expiry: 'Expired!', tone: 'exp' as const },
  { icon: '📑', name: 'Contract', meta: 'Li W.', expiry: 'Active', tone: 'ok' as const },
  { icon: '🎓', name: 'Certificate', meta: 'Maria S.', expiry: 'Valid', tone: 'ok' as const },
];

const pricingPlans = [
  {
    name: 'Starter',
    price: '0',
    desc: 'Perfect for trying out Uppearance with a small team.',
    features: [
      { ok: true, t: 'Up to 5 employees' },
      { ok: true, t: 'Time tracking' },
      { ok: true, t: 'Leave management' },
      { ok: true, t: 'Basic reports' },
      { ok: false, t: 'Payroll engine' },
      { ok: false, t: 'Document vault' },
      { ok: false, t: 'CSV/PDF export' },
    ],
    cta: 'Get Started Free',
    href: '/register',
    popular: false,
  },
  {
    name: 'Growth',
    price: '299',
    desc: 'Everything you need to run HR for a growing team.',
    features: [
      { ok: true, t: 'Up to 50 employees' },
      { ok: true, t: 'Full timesheets & tracking' },
      { ok: true, t: 'UAE-compliant leave' },
      { ok: true, t: 'Payroll & payslips' },
      { ok: true, t: 'Document vault (AES-256)' },
      { ok: true, t: 'CSV & PDF export' },
      { ok: true, t: 'Salary journey tracking' },
    ],
    cta: 'Start Growth Plan →',
    href: '/register',
    popular: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    desc: 'For larger teams with custom needs and priority support.',
    features: [
      { ok: true, t: 'Unlimited employees' },
      { ok: true, t: 'Everything in Growth' },
      { ok: true, t: 'Custom SMTP & email templates' },
      { ok: true, t: 'API access + Swagger docs' },
      { ok: true, t: 'Dedicated onboarding' },
      { ok: true, t: 'SLA & priority support' },
      { ok: true, t: 'Custom integrations' },
    ],
    cta: 'Talk to Sales',
    href: 'mailto:hello@uppearance.com',
    popular: false,
    external: true,
  },
];

const faqItems = [
  {
    q: 'Is Uppearance compliant with UAE Labour Law?',
    a: 'Yes. Uppearance is built from the ground up around Federal Decree-Law No. 33 of 2021. Leave types, probation rules, entitlements, and accruals are all pre-configured and automatically enforced — no manual configuration needed.',
  },
  {
    q: 'How is employee data and documents secured?',
    a: 'All uploaded documents are encrypted using AES-256-GCM before storage. Encryption keys are never stored alongside the files. Authentication uses JWT tokens with secure session management.',
  },
  {
    q: 'Can employees use the system themselves?',
    a: 'Absolutely. Uppearance has both Admin and Employee roles. Employees can clock in/out, view timesheets, apply for leave, view payslips, and browse their documents — all with role-restricted access.',
  },
  {
    q: 'Does it support teams across multiple time zones?',
    a: 'Yes. The time tracking module includes live world clocks for Dubai, Dhaka, and Cairo — ideal for teams with employees across UAE and South Asia/MENA.',
  },
  {
    q: 'Can I export data for accounting or banking?',
    a: 'Yes. Timesheets, payroll runs, and reports can all be exported as CSV or PDF. The payroll CSV export is structured to be compatible with WPS (Wage Protection System) requirements.',
  },
  {
    q: 'Is there an API for integrations?',
    a: 'Enterprise plans include full API access with an in-app endpoint reference, cURL examples, and a link to Swagger/OpenAPI documentation.',
  },
];

const dashNav = [
  { label: 'Dashboard', icon: LayoutDashboard },
  { label: 'Employees', icon: Users },
  { label: 'Clock', icon: Clock },
  { label: 'Timesheet', icon: Calendar },
  { label: 'Attendance', icon: ClipboardList },
  { label: 'Leave', icon: Plane },
  { label: 'Payroll', icon: Wallet },
  { label: 'Documents', icon: FileText },
  { label: 'Reports', icon: BarChart3 },
  { label: 'API Docs', icon: BookOpen },
  { label: 'Settings', icon: Settings },
  { label: 'Notifications', icon: Bell },
];

function DashboardMock() {
  const [today, setToday] = React.useState('');

  React.useEffect(() => {
    setToday(
      new Date().toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
    );
  }, []);

  return (
    <div className="mx-auto w-full max-w-[980px]">
      <div
        className="overflow-hidden border bg-white"
        style={{
          borderColor: '#e8e3f5',
          borderRadius: 16,
          boxShadow:
            '0 40px 100px rgba(115, 22, 140, 0.15), 0 0 0 1px rgba(115, 22, 140, 0.05)',
        }}
      >
        {/* Browser chrome */}
        <div className="flex items-center gap-2 border-b px-3 py-2.5" style={{ borderColor: '#e8e3f5', background: '#faf9fc' }}>
          <div className="size-2.5 rounded-full bg-[#ff5f57]" />
          <div className="size-2.5 rounded-full bg-[#febc2e]" />
          <div className="size-2.5 rounded-full bg-[#28c840]" />
          <div
            className="ml-2 flex flex-1 items-center justify-center rounded-md px-2 py-0.5 text-[0.6rem] text-[#6b7280]"
            style={{ background: '#f5f4fb', border: '1px solid #e8e3f5' }}
          >
            hrms.uppcore.tech/
          </div>
          <div className="flex items-center gap-1.5 text-[0.6rem] text-[#9ca3af]">
            <span>🔔</span>
            <div
              className="flex items-center gap-1 rounded-md px-2 py-0.5"
              style={{ background: '#f5f4fb', border: '1px solid #e8e3f5' }}
            >
              <div
                className={cn('flex size-3.5 items-center justify-center rounded-full text-[0.45rem] font-bold text-white', gradBg)}
              >
                PR
              </div>
              <span className="text-[0.6rem] text-[#6b7280]">Fazla Rabbi</span>
            </div>
          </div>
        </div>

        <div className="flex min-w-0">
          {/* Sidebar */}
          <aside
            className="hidden w-[132px] shrink-0 flex-col gap-0.5 border-r py-3 pl-2 pr-1 sm:flex"
            style={{ borderColor: '#e8e3f5', background: '#faf8ff' }}
          >
            <div
              className={cn('mb-2 px-2 py-1 text-[0.55rem] font-bold tracking-wide', gradText)}
            >
              UPPEARANCE
            </div>
            {dashNav.map((item, i) => (
              <div
                key={item.label}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[0.58rem] font-medium',
                  i === 0 ? 'text-white shadow-sm' : 'text-[#6b7280] hover:bg-white/80',
                )}
                style={
                  i === 0
                    ? { background: `linear-gradient(135deg, ${G.from} 0%, ${G.to} 100%)` }
                    : undefined
                }
              >
                <item.icon className="size-3 shrink-0 opacity-90" />
                <span className="truncate">{item.label}</span>
              </div>
            ))}
          </aside>

          {/* Main */}
          <div className="min-w-0 flex-1 bg-white p-3 sm:p-4">
            <div className="mb-3 sm:mb-4">
              <h3 className="text-sm font-bold text-[#1a1033] sm:text-base">Welcome back, Fazla</h3>
              <p className="text-[0.65rem] text-[#6b7280] sm:text-xs" suppressHydrationWarning>
                {today}
              </p>
            </div>

            <div className="mb-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
              {[
                { label: 'Total Employees', val: '1', icon: '👥', sub: 'employees' },
                { label: 'On Probation', val: '0', icon: '⏳', sub: 'probation' },
                { label: 'Pending Leave', val: '0', icon: '📋', sub: 'leave' },
                { label: "Today's Attendance", val: '0', icon: '✅', sub: 'attendance' },
              ].map((k) => (
                <div
                  key={k.label}
                  className="rounded-[10px] border p-2 sm:p-2.5"
                  style={{ borderColor: '#e8e3f5', background: '#faf8ff' }}
                >
                  <div className="flex items-start justify-between gap-1">
                    <span className="text-[0.55rem] font-semibold leading-tight text-[#6b7280] sm:text-[0.6rem]">
                      {k.label}
                    </span>
                    <span className="text-sm">{k.icon}</span>
                  </div>
                  <div className="mt-1 text-lg font-bold tabular-nums text-[#1a1033] sm:text-xl">{k.val}</div>
                  <div className="text-[0.55rem] text-[#9ca3af] sm:text-[0.6rem]">
                    {k.sub === 'employees' ? (
                      <>
                        <span className="font-semibold text-emerald-600">+1 new</span>
                        <span> · this month</span>
                      </>
                    ) : k.sub === 'probation' ? (
                      'Active probation periods'
                    ) : k.sub === 'leave' ? (
                      'Awaiting review'
                    ) : (
                      'Clock-in sessions today'
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { icon: '👤', name: 'Employees', sub: 'Manage team members', bg: 'bg-sky-50 text-sky-700' },
                { icon: '📅', name: 'Leave', sub: 'Review requests', bg: 'bg-orange-50 text-orange-700' },
                { icon: '📄', name: 'Documents', sub: 'Expiry tracking', bg: 'bg-emerald-50 text-emerald-700' },
                { icon: '💰', name: 'Payroll', sub: 'Monthly runs', bg: 'bg-violet-50 text-violet-700' },
                { icon: '📊', name: 'Reports', sub: 'Analytics & exports', bg: 'bg-indigo-50 text-indigo-700' },
                { icon: '⚙️', name: 'Settings', sub: 'Workspace configuration', bg: 'bg-zinc-100 text-zinc-700' },
              ].map((a) => (
                <div
                  key={a.name}
                  className="flex items-center gap-2 rounded-[10px] border p-2"
                  style={{ borderColor: '#e8e3f5' }}
                >
                  <div className={cn('flex size-8 items-center justify-center rounded-lg text-sm', a.bg)}>{a.icon}</div>
                  <div>
                    <div className="text-[0.72rem] font-bold text-[#1a1033]">{a.name}</div>
                    <div className="text-[0.6rem] text-[#9ca3af]">{a.sub}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
              <div className="rounded-[10px] border p-2.5 sm:p-3" style={{ borderColor: '#e8e3f5', background: '#faf8ff' }}>
                <div className="text-[0.65rem] font-bold text-[#1a1033]">↗ Attendance overview</div>
                <div className="mt-2 space-y-2">
                  <div>
                    <div className="text-[0.55rem] text-[#6b7280]">On-time rate (this month)</div>
                    <div className="text-lg font-bold text-[#1a1033]">100%</div>
                    <div className="flex justify-between text-[0.55rem] text-[#9ca3af]">
                      <span>Last month: 100%</span>
                      <span className="font-semibold" style={{ color: G.from }}>
                        +0 pts
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 border-t pt-2" style={{ borderColor: '#e8e3f5' }}>
                    <div>
                      <div className="text-[0.55rem] text-[#6b7280]">Avg. work hours</div>
                      <div className="text-base font-bold">0h</div>
                    </div>
                    <div>
                      <div className="text-[0.55rem] text-[#6b7280]">Late (this month)</div>
                      <div className="text-base font-bold">0</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="rounded-[10px] border p-2.5 sm:p-3" style={{ borderColor: '#e8e3f5', background: '#faf8ff' }}>
                <div className="text-[0.65rem] font-bold text-[#1a1033]">💳 Payroll snapshot</div>
                <div className="mt-2 space-y-1.5 text-[0.65rem]">
                  <div className="flex justify-between">
                    <span className="text-[#6b7280]">Total cost (this month)</span>
                    <span className="font-bold">AED 0.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6b7280]">Average net pay</span>
                    <span className="font-bold">AED 0.00</span>
                  </div>
                </div>
                <button
                  type="button"
                  className={cn('mt-3 w-full rounded-lg py-1.5 text-[0.65rem] font-bold text-white', gradBg)}
                >
                  Open payroll
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LandingFaq() {
  const [open, setOpen] = React.useState(0);
  return (
    <div className="mx-auto max-w-3xl">
      {faqItems.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={item.q} className="border-b" style={{ borderColor: '#e8e3f5' }}>
            <button
              type="button"
              className="flex w-full items-center justify-between gap-4 py-5 text-left font-['inherit'] text-[0.95rem] font-semibold text-[#1a1033]"
              onClick={() => setOpen(isOpen ? -1 : i)}
            >
              {item.q}
              <span
                className={cn(
                  'flex size-7 shrink-0 items-center justify-center rounded-lg border text-lg font-light transition-transform',
                  isOpen && 'rotate-45',
                )}
                style={{ borderColor: '#e8e3f5', color: G.from }}
              >
                +
              </span>
            </button>
            {isOpen ? <p className="pb-5 text-[0.88rem] leading-relaxed text-[#6b7280]">{item.a}</p> : null}
          </div>
        );
      })}
    </div>
  );
}

const HeroHeader = () => {
  const [menuState, setMenuState] = React.useState(false);
  const [isScrolled, setIsScrolled] = React.useState(false);

  React.useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header>
      <nav data-state={menuState && 'active'} className="group fixed z-20 w-full px-2">
        <div
          className={cn(
            'mx-auto mt-2 max-w-6xl px-6 transition-all duration-300 lg:px-12',
            isScrolled && 'bg-background/50 max-w-4xl rounded-2xl border backdrop-blur-lg lg:px-5',
          )}
        >
          <div className="relative flex flex-wrap items-center justify-between gap-6 py-3 lg:gap-0 lg:py-4">
            <div className="flex w-full justify-between lg:w-auto">
              <BrandLogo size="md" href="/" />
              <button
                onClick={() => setMenuState(!menuState)}
                aria-label={menuState ? 'Close Menu' : 'Open Menu'}
                className="relative z-20 -m-2.5 -mr-4 block cursor-pointer p-2.5 lg:hidden"
              >
                <Menu className="group-data-[state=active]:scale-0 group-data-[state=active]:rotate-180 group-data-[state=active]:opacity-0 m-auto size-6 duration-200" />
                <X className="group-data-[state=active]:rotate-0 group-data-[state=active]:scale-100 group-data-[state=active]:opacity-100 absolute inset-0 m-auto size-6 -rotate-180 scale-0 opacity-0 duration-200" />
              </button>
            </div>
            <div className="absolute inset-0 m-auto hidden size-fit lg:block">
              <ul className="flex gap-8 text-sm">
                {menuItems.map((item, index) => (
                  <li key={index}>
                    <Link href={item.href} className="text-muted-foreground hover:text-foreground block duration-150">
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-background group-data-[state=active]:block lg:group-data-[state=active]:flex mb-6 hidden w-full flex-wrap items-center justify-end space-y-8 rounded-3xl border p-6 shadow-2xl shadow-zinc-300/20 md:flex-nowrap lg:m-0 lg:flex lg:w-fit lg:gap-6 lg:space-y-0 lg:border-transparent lg:bg-transparent lg:p-0 lg:shadow-none">
              <div className="lg:hidden">
                <ul className="space-y-6 text-base">
                  {menuItems.map((item, index) => (
                    <li key={index}>
                      <Link href={item.href} className="text-muted-foreground hover:text-foreground block duration-150">
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex w-full flex-col space-y-3 sm:flex-row sm:gap-3 sm:space-y-0 md:w-fit">
                <Button asChild variant="outline" size="sm" className={cn(isScrolled && 'lg:hidden')}>
                  <Link href="/login">Login</Link>
                </Button>
                <Button asChild size="sm" className={cn(isScrolled && 'lg:hidden')}>
                  <Link href="/register">Sign Up</Link>
                </Button>
                <Button asChild size="sm" className={cn(isScrolled ? 'lg:inline-flex' : 'hidden')}>
                  <Link href="/register">Get Started</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
};

export function HeroSection() {
  return (
    <>
      <HeroHeader />
      <main className="overflow-x-hidden bg-[#f5f4fb] text-[#1a1033]">
        {/* Hero — matches landing HTML; radial accents use brand purple tint */}
        <section
          className="relative flex min-h-screen flex-col items-center px-[5%] pb-20 pt-28 md:pt-36"
          style={{
            background: `
              radial-gradient(ellipse 70% 50% at 50% -5%, rgba(115, 22, 140, 0.12) 0%, transparent 60%),
              radial-gradient(ellipse 50% 30% at 90% 60%, rgba(40, 18, 89, 0.08) 0%, transparent 50%),
              #f5f4fb
            `,
          }}
        >
          <div className="mx-auto flex w-full max-w-6xl flex-col items-center text-center">
            <div
              className="mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium"
              style={{
                background: 'rgba(115, 22, 140, 0.08)',
                borderColor: 'rgba(115, 22, 140, 0.2)',
                color: '#1a1033',
              }}
            >
              <span className="relative flex size-2">
                <span
                  className="absolute inline-flex size-full animate-ping rounded-full opacity-60"
                  style={{ background: G.from }}
                />
                <span className="relative inline-flex size-2 rounded-full" style={{ background: G.from }} />
              </span>
              Built for UAE Labour Law Compliance
            </div>

            <h1 className="max-w-4xl text-balance text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl md:text-6xl lg:text-[3.25rem]">
              Run HR for Your Team in <Grad>Dubai,</Grad>
              <br />
              Not Spreadsheets
            </h1>
            <p className="mt-6 max-w-2xl text-balance text-base text-[#6b7280] sm:text-lg">
              Uppearance HRMS handles time tracking, payroll, leave, documents, and compliance — so you can focus on your
              people.
            </p>

            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
              <Link
                href="/register"
                className={cn(
                  'inline-flex items-center justify-center rounded-[10px] px-8 py-3.5 text-base font-semibold text-white shadow-lg transition hover:opacity-95',
                  gradBg,
                )}
                style={{ boxShadow: '0 6px 24px rgba(115, 22, 140, 0.35)' }}
              >
                Start Free Trial →
              </Link>
              <Link
                href="#features"
                className="inline-flex items-center justify-center rounded-[10px] border bg-white px-8 py-3.5 text-base font-semibold text-[#1a1033] transition hover:bg-[#faf8ff]"
                style={{ borderColor: '#e8e3f5' }}
              >
                Watch Demo
              </Link>
            </div>

            <div className="mt-12 grid w-full max-w-3xl grid-cols-2 gap-6 md:grid-cols-4">
              {[
                { n: '14', s: '+', l: 'Leave types covered' },
                { n: 'AES-256', s: '', l: 'Document encryption' },
                { n: '100%', s: '', l: 'UAE Labour Law aligned' },
                { n: '3', s: '', l: 'World clocks built-in' },
              ].map((st) => (
                <div key={st.l} className="text-center md:text-left">
                  <div className="text-2xl font-bold sm:text-3xl">
                    <span className={gradText}>
                      {st.n}
                      {st.s}
                    </span>
                  </div>
                  <div className="mt-1 text-xs font-medium text-[#6b7280] sm:text-sm">{st.l}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-[60px] flex w-full justify-center px-[5%]">
            <DashboardMock />
          </div>
        </section>

        {/* Features */}
        <section id="features" className="scroll-mt-24 py-24 md:py-28" style={{ background: '#f5f4fb' }}>
          <SectionShell>
            <div className="mx-auto mb-14 max-w-xl text-center md:max-w-[580px]">
              <SectionTag>Everything you need</SectionTag>
              <h2 className="text-[clamp(1.9rem,3.5vw,2.8rem)] font-bold leading-tight tracking-tight text-[#1a1033]">
                One Platform. <Grad>Every HR Task.</Grad>
              </h2>
              <p className="mt-4 text-[#6b7280]">
                From onboarding to payroll, leave to documents — Uppearance covers the full employee lifecycle.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {platformFeatures.map((f) => (
                <div
                  key={f.title}
                  className="relative overflow-hidden rounded-[14px] border bg-white p-[26px] shadow-sm transition duration-[250ms] hover:-translate-y-[3px] hover:border-[rgba(115,22,140,0.25)] hover:shadow-[0_12px_48px_rgba(115,22,140,0.14)]"
                  style={{ borderColor: '#e8e3f5' }}
                >
                  <FeatureIcon3D icon={f.icon} variant={f.iconVariant} />
                  <h3 className="text-[0.95rem] font-bold text-[#1a1033]">{f.title}</h3>
                  <p className="mt-2 text-[0.855rem] leading-relaxed text-[#6b7280]">{f.desc}</p>
                  {f.uae ? (
                    <p className="mt-3 inline-block rounded-md border px-2 py-1 text-[0.72rem] font-semibold text-[#6b7280]" style={{ borderColor: '#e8e3f5', background: '#faf8ff' }}>
                      🇦🇪 UAE Labour Law compliant
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </SectionShell>
        </section>

        {/* Compliance */}
        <section className="grid items-center gap-12 py-24 md:grid-cols-2 md:gap-20 md:py-28" style={{ background: 'white' }}>
          <SectionShell className="md:col-span-1 md:justify-self-end md:pr-0">
            <div className="max-w-xl">
              <SectionTag>UAE Labour Law</SectionTag>
              <h2 className="text-[clamp(1.9rem,3.5vw,2.8rem)] font-bold leading-tight tracking-tight text-[#1a1033]">
                Leave Rules Built <Grad>Right In</Grad>
              </h2>
              <p className="mt-4 text-[#6b7280]">
                Uppearance is built around the UAE Labour Law — including probation rules, leave entitlements, and
                statutory requirements.
              </p>
              <ul className="mt-7 space-y-3.5">
                {uaeBullets.map((b) => (
                  <li key={b.title} className="flex gap-3">
                    <span className={cn('mt-0.5 text-base font-bold', gradText)}>✓</span>
                    <div>
                      <div className="text-[0.9rem] font-bold text-[#1a1033]">{b.title}</div>
                      <div className="mt-0.5 text-[0.82rem] text-[#6b7280]">{b.desc}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </SectionShell>
          <SectionShell className="md:col-span-1 md:pl-0">
            <div className="rounded-[14px] border bg-[#faf8ff] p-6 shadow-sm" style={{ borderColor: '#e8e3f5' }}>
              <div className="flex items-start gap-3">
                <div className="text-2xl">🇦🇪</div>
                <div>
                  <div className="font-bold text-[#1a1033]">Leave Entitlements</div>
                  <div className="text-xs text-[#6b7280]">Per UAE Labour Law, Federal Decree-Law No. 33</div>
                </div>
              </div>
              <div className="mt-5 space-y-2">
                {leaveEntitlements.map((row) => (
                  <div
                    key={row.name}
                    className="flex items-center justify-between rounded-lg border bg-white px-3 py-2"
                    style={{ borderColor: '#e8e3f5' }}
                  >
                    <div className="flex items-center gap-2">
                      <div className={cn('size-2 rounded-full', row.dot)} />
                      <span className="text-sm font-medium text-[#1a1033]">{row.name}</span>
                    </div>
                    <span className={cn('text-sm font-bold', row.valueColor)}>{row.value}</span>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-center text-xs text-[#6b7280]">⚖️ Automatically enforced — no manual calculation required.</p>
            </div>
          </SectionShell>
        </section>

        {/* Metrics */}
        <section className="py-24 md:py-28" style={{ background: '#f5f4fb' }}>
          <SectionShell>
            <div className="text-center">
              <SectionTag>By the numbers</SectionTag>
              <h2 className="text-[clamp(1.9rem,3.5vw,2.8rem)] font-bold tracking-tight text-[#1a1033]">
                Built for <Grad>Real Teams</Grad>
              </h2>
            </div>
            <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {metrics.map((m) => (
                <div
                  key={m.label}
                  className="rounded-[14px] border bg-white p-6 text-center shadow-sm"
                  style={{ borderColor: '#e8e3f5' }}
                >
                  <div className={cn('text-2xl font-bold sm:text-3xl', gradText)}>{m.num}</div>
                  <div className="mt-2 text-sm text-[#6b7280]">{m.label}</div>
                </div>
              ))}
            </div>
          </SectionShell>
        </section>

        {/* Payroll */}
        <section className="grid items-center gap-12 py-24 md:grid-cols-2 md:gap-20 md:py-28" style={{ background: 'white' }}>
          <SectionShell className="order-2 md:order-1 md:justify-self-end md:pr-0">
            <div className="space-y-4">
              <div className="rounded-[14px] border bg-white p-4 shadow-md" style={{ borderColor: '#e8e3f5' }}>
                <div className="flex justify-between gap-4">
                  <div>
                    <div className="font-bold text-[#1a1033]">Ahmed Al-Rashidi</div>
                    <div className="text-xs text-[#6b7280]">April 2026 Payslip</div>
                  </div>
                  <div className="text-right">
                    <div className={cn('text-2xl font-bold tabular-nums', gradText)}>12,500</div>
                    <div className="text-[0.65rem] text-[#6b7280]">AED / month</div>
                  </div>
                </div>
                <hr className="my-3" style={{ borderColor: '#e8e3f5' }} />
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#6b7280]">Basic Salary</span>
                    <span>AED 10,000</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6b7280]">Housing Allowance</span>
                    <span className="text-emerald-600">+ AED 2,000</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6b7280]">Transport</span>
                    <span className="text-emerald-600">+ AED 500</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6b7280]">Leave Deduction</span>
                    <span className="text-red-500">- AED 0</span>
                  </div>
                  <div className="flex justify-between border-t pt-2 font-bold" style={{ borderColor: '#e8e3f5' }}>
                    <span>Net Pay</span>
                    <span className={gradText}>AED 12,500</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-lg border bg-[#faf8ff] px-3 py-1.5 text-xs font-semibold" style={{ borderColor: '#e8e3f5' }}>
                  ⬇ Download PDF
                </span>
                <span className="rounded-lg border bg-[#faf8ff] px-3 py-1.5 text-xs font-semibold" style={{ borderColor: '#e8e3f5' }}>
                  📋 Export CSV
                </span>
                <span className="rounded-lg border bg-[#faf8ff] px-3 py-1.5 text-xs font-semibold" style={{ borderColor: '#e8e3f5' }}>
                  📧 Email
                </span>
              </div>
              <div className="scale-[0.97] rounded-[14px] border bg-white/80 p-3 opacity-60" style={{ borderColor: '#e8e3f5' }}>
                <div className="flex justify-between text-sm">
                  <div>
                    <div className="font-bold">March 2026</div>
                    <div className="text-xs text-[#6b7280]">48 employees processed</div>
                  </div>
                  <div className={cn('font-bold', gradText)}>AED 187,450</div>
                </div>
              </div>
            </div>
          </SectionShell>
          <SectionShell className="order-1 md:order-2 md:pl-0">
            <SectionTag>Payroll</SectionTag>
            <h2 className="text-[clamp(1.9rem,3.5vw,2.8rem)] font-bold leading-tight tracking-tight text-[#1a1033]">
              Payroll in <Grad>Minutes,</Grad>
              <br />
              Not Days
            </h2>
            <p className="mt-4 text-[#6b7280]">
              Run monthly payroll, generate individual payslips, and export to CSV — all from one screen.
            </p>
            <ul className="mt-7 space-y-3">
              {payrollPoints.map((p) => (
                <li key={p} className="flex gap-2 text-[0.9rem] text-[#6b7280]">
                  <span className="font-bold" style={{ color: G.from }}>
                    ✓
                  </span>
                  {p}
                </li>
              ))}
            </ul>
          </SectionShell>
        </section>

        {/* Vault */}
        <section className="grid items-center gap-12 py-24 md:grid-cols-2 md:gap-20 md:py-28" style={{ background: '#f5f4fb' }}>
          <SectionShell>
            <SectionTag>Document Vault</SectionTag>
            <h2 className="text-[clamp(1.9rem,3.5vw,2.8rem)] font-bold leading-tight tracking-tight text-[#1a1033]">
              Every Doc, <Grad>Encrypted</Grad>
              <br />
              &amp; Tracked
            </h2>
            <p className="mt-4 text-[#6b7280]">
              Store passports, visas, contracts, and certificates in one encrypted vault. Get alerts before anything expires.
            </p>
            <ul className="mt-7 space-y-3">
              {docPoints.map((p) => (
                <li key={p} className="flex gap-2 text-[0.9rem] text-[#6b7280]">
                  <span className="font-bold" style={{ color: G.from }}>
                    ✓
                  </span>
                  {p}
                </li>
              ))}
            </ul>
          </SectionShell>
          <SectionShell>
            <div className="rounded-[14px] border bg-white p-5 shadow-md" style={{ borderColor: '#e8e3f5' }}>
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#1a1033]">Document Vault</span>
                <span className="rounded-md border px-2 py-0.5 text-[0.65rem] font-semibold" style={{ borderColor: '#e8e3f5', background: '#faf8ff' }}>
                  🔒 AES-256-GCM
                </span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {docShowcase.map((d) => (
                  <div key={d.name} className="rounded-lg border bg-[#faf8ff] p-2.5" style={{ borderColor: '#e8e3f5' }}>
                    <div className="text-lg">{d.icon}</div>
                    <div className="text-[0.72rem] font-bold">{d.name}</div>
                    <div className="text-[0.6rem] text-[#6b7280]">{d.meta}</div>
                    <div
                      className={cn(
                        'mt-1 text-[0.58rem] font-semibold',
                        d.tone === 'ok' && 'text-emerald-600',
                        d.tone === 'warn' && 'text-amber-600',
                        d.tone === 'exp' && 'text-red-600',
                      )}
                    >
                      {d.expiry}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex gap-2 rounded-lg border p-3 text-[0.75rem] text-[#6b7280]" style={{ borderColor: '#e8e3f5', background: '#faf8ff' }}>
                <span>🔑</span>
                All files encrypted with AES-256-GCM before storage. Keys are never exposed.
              </div>
            </div>
          </SectionShell>
        </section>

        {/* Pricing */}
        <section id="pricing" className="scroll-mt-24 py-24 md:py-28" style={{ background: 'white' }}>
          <SectionShell>
            <div className="mx-auto mb-14 max-w-lg text-center">
              <SectionTag>Pricing</SectionTag>
              <h2 className="text-[clamp(1.9rem,3.5vw,2.8rem)] font-bold tracking-tight text-[#1a1033]">
                Simple Plans for <Grad>Small Teams</Grad>
              </h2>
              <p className="mt-4 text-[#6b7280]">No hidden fees. Start free, upgrade when you&apos;re ready.</p>
            </div>
            <div className="grid gap-4 lg:grid-cols-3 lg:gap-5">
              {pricingPlans.map((plan) => (
                <div
                  key={plan.name}
                  className={cn(
                    'relative flex flex-col rounded-[14px] border bg-white p-6 shadow-sm',
                    plan.popular && 'bg-[#faf8ff]',
                  )}
                  style={
                    plan.popular
                      ? {
                          borderColor: G.from,
                          boxShadow: `0 0 0 4px rgba(115, 22, 140, 0.06), 0 12px 40px rgba(115, 22, 140, 0.1)`,
                        }
                      : { borderColor: '#e8e3f5' }
                  }
                >
                  {plan.popular ? (
                    <div
                      className={cn('absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3.5 py-1 text-[0.68rem] font-bold text-white', gradBg)}
                    >
                      Most Popular
                    </div>
                  ) : null}
                  <div className="text-[0.8rem] font-bold uppercase tracking-[0.08em] text-[#6b7280]">{plan.name}</div>
                  <div className="mt-2 flex items-baseline gap-1">
                    {plan.price !== 'Custom' ? (
                      <>
                        <span className="text-sm font-semibold text-[#6b7280]">AED</span>
                        <span className="text-4xl font-bold text-[#1a1033]">{plan.price}</span>
                        <span className="text-sm text-[#6b7280]">/ month</span>
                      </>
                    ) : (
                      <span className="text-3xl font-bold text-[#1a1033]">Custom</span>
                    )}
                  </div>
                  <p className="mt-3 text-sm text-[#6b7280]">{plan.desc}</p>
                  <div className="mt-5 flex flex-1 flex-col gap-2 border-t pt-5" style={{ borderColor: '#e8e3f5' }}>
                    {plan.features.map((f) => (
                      <div key={f.t} className="flex gap-2 text-sm">
                        <span className={f.ok ? 'font-bold text-emerald-600' : 'text-[#9ca3af]'}>{f.ok ? '✓' : '✗'}</span>
                        <span className={cn(!f.ok && 'text-[#9ca3af]')}>{f.t}</span>
                      </div>
                    ))}
                  </div>
                  {plan.external ? (
                    <a
                      href={plan.href}
                      className={cn(
                        'mt-6 w-full rounded-[10px] py-3 text-center text-sm font-bold transition',
                        plan.popular
                          ? `${gradBg} text-white shadow-md`
                          : 'border bg-white text-[#1a1033] hover:bg-[#faf8ff]',
                      )}
                      style={
                        plan.popular
                          ? { boxShadow: '0 4px 16px rgba(115, 22, 140, 0.3)' }
                          : { borderColor: '#e8e3f5' }
                      }
                    >
                      {plan.cta}
                    </a>
                  ) : (
                    <Link
                      href={plan.href}
                      className={cn(
                        'mt-6 w-full rounded-[10px] py-3 text-center text-sm font-bold transition',
                        plan.popular
                          ? `${gradBg} text-white shadow-md`
                          : 'border bg-white text-[#1a1033] hover:bg-[#faf8ff]',
                      )}
                      style={
                        plan.popular
                          ? { boxShadow: '0 4px 16px rgba(115, 22, 140, 0.3)' }
                          : { borderColor: '#e8e3f5' }
                      }
                    >
                      {plan.cta}
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </SectionShell>
        </section>

        {/* FAQ */}
        <section className="py-24 md:py-28" style={{ background: '#f5f4fb' }}>
          <SectionShell>
            <div className="text-center">
              <SectionTag>FAQ</SectionTag>
              <h2 className="text-[clamp(1.9rem,3.5vw,2.8rem)] font-bold tracking-tight text-[#1a1033]">
                Questions? <Grad>We&apos;ve Got Answers.</Grad>
              </h2>
            </div>
            <div className="mt-12">
              <LandingFaq />
            </div>
          </SectionShell>
        </section>

        {/* CTA */}
        <section
          id="about"
          className={cn('scroll-mt-24 px-[5%] py-24 text-center text-white md:py-28', gradBgBr)}
        >
          <div className="mx-auto max-w-2xl">
            <h2 className="text-3xl font-bold leading-tight md:text-4xl">
              From Hire to Retire —
              <br />
              We&apos;ve Got You Covered
            </h2>
            <p className="mt-4 text-sm text-white/85 md:text-base">
              Join teams across Dubai who run their HR on Uppearance. Get started in minutes, no credit card required.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/register"
                className="inline-flex items-center justify-center rounded-[10px] bg-white px-8 py-3.5 text-base font-bold text-[#1a1033] shadow-lg transition hover:bg-white/95"
              >
                Start Free Trial →
              </Link>
              <a
                href="mailto:hello@uppearance.com"
                className="inline-flex items-center justify-center rounded-[10px] border border-white/40 bg-transparent px-8 py-3.5 text-base font-bold text-white transition hover:bg-white/10"
              >
                Book a Demo
              </a>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t bg-white py-14" style={{ borderColor: '#e8e3f5' }}>
          <SectionShell>
            <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <div className="flex items-center gap-2 font-bold text-[#1a1033]">
                  <div className={cn('flex size-[26px] items-center justify-center rounded-lg text-[0.65rem] font-bold text-white', gradBg)}>
                    U
                  </div>
                  Uppearance HRMS
                </div>
                <p className="mt-3 text-sm leading-relaxed text-[#6b7280]">
                  Full-stack HR management built for small teams in the UAE. Clean, compliant, and easy to use.
                </p>
                <div className="mt-4 flex gap-2">
                  <span
                    className="flex size-[30px] cursor-pointer items-center justify-center rounded-lg border text-[0.8rem] text-[#6b7280]"
                    style={{ borderColor: '#e8e3f5', background: '#f5f4fb' }}
                  >
                    𝕏
                  </span>
                  <span
                    className="flex size-[30px] cursor-pointer items-center justify-center rounded-lg border text-[0.8rem] text-[#6b7280]"
                    style={{ borderColor: '#e8e3f5', background: '#f5f4fb' }}
                  >
                    in
                  </span>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#1a1033]">Product</h4>
                <ul className="mt-3 space-y-2 text-sm text-[#6b7280]">
                  <li>
                    <Link href="#features" className="hover:text-[#1a1033]">
                      Features
                    </Link>
                  </li>
                  <li>
                    <Link href="#pricing" className="hover:text-[#1a1033]">
                      Pricing
                    </Link>
                  </li>
                  <li>
                    <span className="cursor-default opacity-70">Changelog</span>
                  </li>
                  <li>
                    <span className="cursor-default opacity-70">API Docs</span>
                  </li>
                  <li>
                    <span className="cursor-default opacity-70">Roadmap</span>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#1a1033]">Compliance</h4>
                <ul className="mt-3 space-y-2 text-sm text-[#6b7280]">
                  <li>
                    <span className="cursor-default">UAE Labour Law</span>
                  </li>
                  <li>
                    <span className="cursor-default">Leave Policies</span>
                  </li>
                  <li>
                    <span className="cursor-default">WPS Export</span>
                  </li>
                  <li>
                    <span className="cursor-default">Data Security</span>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#1a1033]">Company</h4>
                <ul className="mt-3 space-y-2 text-sm text-[#6b7280]">
                  <li>
                    <Link href="#about" className="hover:text-[#1a1033]">
                      About
                    </Link>
                  </li>
                  <li>
                    <a href="mailto:hello@uppearance.com" className="hover:text-[#1a1033]">
                      Contact
                    </a>
                  </li>
                  <li>
                    <span className="cursor-default opacity-70">Privacy Policy</span>
                  </li>
                  <li>
                    <span className="cursor-default opacity-70">Terms of Service</span>
                  </li>
                </ul>
              </div>
            </div>
            <div className="mt-12 flex flex-col items-center justify-between gap-2 border-t pt-8 text-sm text-[#6b7280] md:flex-row" style={{ borderColor: '#e8e3f5' }}>
              <p>© {new Date().getFullYear()} Uppearance. All rights reserved.</p>
              <span className="text-[0.78rem] text-[#9ca3af]">🇦🇪 Made for Dubai</span>
            </div>
          </SectionShell>
        </footer>
      </main>
    </>
  );
}
