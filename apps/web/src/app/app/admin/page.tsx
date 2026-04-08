'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
import Link from 'next/link';
import {
  Users,
  CalendarDays,
  FileText,
  Banknote,
  ArrowRight,
  Clock,
  TrendingUp,
  BarChart3,
  Settings,
  AlertTriangle,
  CheckCircle2,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '@/components/auth-provider';

type Summary = {
  headcount: {
    total: number;
    newHires: number;
    byDepartment: { department: string; count: number }[];
    byType: { type: string; count: number }[];
  };
  attendance: {
    todayPresent: number;
    lateThisMonth: number;
    onTimePercent: number;
    lastMonthOnTimePercent: number;
    avgWorkHours: number;
    totalSessions: number;
  };
  leave: {
    pending: number;
    byType: Record<string, number>;
    upcoming: { employee: string; type: string; startDate: string; endDate: string }[];
  };
  payroll: { totalCost: number; avgSalary: number; costByDepartment: Record<string, number> };
  probation: { onProbation: number; ending30: number; ending60: number; ending90: number };
};

type Employee = {
  id: string;
  fullName: string;
  jobTitle: string;
  department: string;
  workEmail: string;
  probationStatus: string;
};

type LeaveRequest = {
  id: string;
  type: string;
  status: string;
  startDate: string;
  endDate: string;
  employee?: { fullName: string };
};

function formatAed(value: number) {
  return new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED' }).format(value);
}

function todayLabel() {
  return new Intl.DateTimeFormat('en-AE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date());
}

export default function AdminDashboard() {
  const { state } = useAuth();
  const [summary, setSummary] = React.useState<Summary | null>(null);
  const [employees, setEmployees] = React.useState<Employee[]>([]);
  const [pendingLeaves, setPendingLeaves] = React.useState<LeaveRequest[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    Promise.all([
      apiFetch<Summary>('/reports/summary'),
      apiFetch<{ employees: Employee[] }>('/employees'),
      apiFetch<{ leaveRequests: LeaveRequest[] }>('/leave/requests?status=PENDING'),
    ])
      .then(([sum, empRes, leaveRes]) => {
        setSummary(sum);
        setEmployees(empRes.employees);
        setPendingLeaves(leaveRes.leaveRequests);
      })
      .catch(() => toast.error('Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  if (loading || !summary) {
    return (
      <div className="flex items-center justify-center py-20">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"
          role="status"
          aria-label="Loading"
        />
      </div>
    );
  }

  const onTimeDelta = summary.attendance.onTimePercent - summary.attendance.lastMonthOnTimePercent;

  const quickActions = [
    {
      href: '/app/admin/employees',
      label: 'Employees',
      icon: Users,
      desc: 'Manage team members',
      color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    },
    {
      href: '/app/admin/leave',
      label: 'Leave',
      icon: CalendarDays,
      desc: 'Review requests',
      color: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
    },
    {
      href: '/app/admin/documents',
      label: 'Documents',
      icon: FileText,
      desc: 'Expiry tracking',
      color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
    },
    {
      href: '/app/admin/payroll',
      label: 'Payroll',
      icon: Banknote,
      desc: 'Monthly runs',
      color: 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400',
    },
    {
      href: '/app/admin/reports',
      label: 'Reports',
      icon: BarChart3,
      desc: 'Analytics & exports',
      color: 'bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400',
    },
    {
      href: '/app/admin/settings',
      label: 'Settings',
      icon: Settings,
      desc: 'Workspace configuration',
      color: 'bg-muted text-foreground',
    },
  ];

  const topEmployees = employees.slice(0, 5);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome back{state.status === 'authenticated' && state.user.fullName ? `, ${state.user.fullName.split(' ')[0]}` : ''}!
        </h1>
        <p className="text-muted-foreground">{todayLabel()}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{summary.headcount.total}</div>
            <p className="mt-1 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
              <Badge variant="secondary" className="font-normal">
                +{summary.headcount.newHires} new
              </Badge>
              <span>vs. headcount at start of month</span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">On Probation</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{summary.probation.onProbation}</div>
            <p className="mt-1 text-xs text-muted-foreground">Active probation periods</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Leave</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{summary.leave.pending}</div>
            <p className="mt-1 text-xs text-muted-foreground">Awaiting review</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Today&apos;s Attendance</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{summary.attendance.todayPresent}</div>
            <p className="mt-1 text-xs text-muted-foreground">Clock-in sessions today</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {quickActions.map((link) => (
          <Link key={link.href} href={link.href}>
            <Card className="group h-full cursor-pointer transition-all hover:border-primary/30 hover:shadow-md">
              <CardContent className="flex items-center gap-4 pt-6">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${link.color}`}>
                  <link.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">{link.label}</div>
                  <div className="text-xs text-muted-foreground">{link.desc}</div>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4" />
              Attendance overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4 rounded-lg border bg-muted/40 px-4 py-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground">On-time rate (this month)</p>
                <p className="text-2xl font-bold">{summary.attendance.onTimePercent}%</p>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                <p>Last month: {summary.attendance.lastMonthOnTimePercent}%</p>
                <p className={onTimeDelta >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}>
                  {onTimeDelta >= 0 ? '+' : ''}
                  {onTimeDelta} pts vs. last month
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border px-3 py-2">
                <p className="text-xs text-muted-foreground">Avg. work hours</p>
                <p className="text-lg font-semibold">{summary.attendance.avgWorkHours}h</p>
                <p className="text-xs text-muted-foreground">Per completed session</p>
              </div>
              <div className="rounded-lg border px-3 py-2">
                <p className="text-xs text-muted-foreground">Late (this month)</p>
                <p className="text-lg font-semibold">{summary.attendance.lateThisMonth}</p>
                <p className="text-xs text-muted-foreground">
                  Last month on-time {summary.attendance.lastMonthOnTimePercent}% · {summary.attendance.totalSessions}{' '}
                  sessions this month
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Banknote className="h-4 w-4" />
              Payroll snapshot
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-4 py-3">
              <span className="text-sm text-muted-foreground">Total cost (this month)</span>
              <span className="text-lg font-bold tabular-nums">{formatAed(summary.payroll.totalCost)}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border px-4 py-3">
              <span className="text-sm text-muted-foreground">Average net pay</span>
              <span className="text-lg font-semibold tabular-nums">{formatAed(summary.payroll.avgSalary)}</span>
            </div>
            <Button variant="outline" size="sm" className="w-full" asChild>
              <Link href="/app/admin/payroll">Open payroll</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {summary.probation.ending30 > 0 && (
        <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900/40 dark:bg-amber-950/20">
          <CardHeader className="flex flex-row items-start gap-3 space-y-0 pb-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-base text-amber-900 dark:text-amber-100">Probation ending soon</CardTitle>
              <p className="text-sm text-muted-foreground">
                {summary.probation.ending30} employee{summary.probation.ending30 === 1 ? '' : 's'} with probation ending within
                30 days. Review outcomes and documentation in the employee records.
              </p>
            </div>
            <Button variant="outline" size="sm" className="shrink-0 border-amber-300 dark:border-amber-800" asChild>
              <Link href="/app/admin/employees">View employees</Link>
            </Button>
          </CardHeader>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarDays className="h-4 w-4" />
                Pending leave requests
              </CardTitle>
              <Button variant="ghost" size="sm" className="h-8 text-muted-foreground" asChild>
                <Link href="/app/admin/leave">View all</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {pendingLeaves.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-8 text-center text-sm text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                <p>No pending requests</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {pendingLeaves.slice(0, 8).map((l) => (
                  <li key={l.id} className="flex flex-col gap-1 border-b border-border/60 pb-3 last:border-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{l.employee?.fullName ?? 'Unknown'}</span>
                      <Badge variant="secondary">{l.type.replace(/_/g, ' ')}</Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(l.startDate).toLocaleDateString('en-AE')} –{' '}
                      {new Date(l.endDate).toLocaleDateString('en-AE')}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4" />
                Employees
              </CardTitle>
              <Button variant="ghost" size="sm" className="h-8 text-muted-foreground" asChild>
                <Link href="/app/admin/employees">View all</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {topEmployees.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No employees yet</p>
            ) : (
              <ul className="space-y-3">
                {topEmployees.map((e) => (
                  <li key={e.id}>
                    <Link
                      href={`/app/admin/employees/${e.id}`}
                      className="flex items-center justify-between gap-3 rounded-lg border border-transparent px-2 py-2 transition-colors hover:border-border hover:bg-muted/50"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{e.fullName}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {e.jobTitle} · {e.department}
                        </p>
                      </div>
                      {e.probationStatus === 'ON_PROBATION' ? (
                        <Badge variant="outline" className="shrink-0 text-xs">
                          Probation
                        </Badge>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
