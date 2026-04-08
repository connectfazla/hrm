'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
import { Users, Clock, CalendarDays, Banknote, AlertTriangle, TrendingUp, Building2, Briefcase } from 'lucide-react';

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
  payroll: {
    totalCost: number;
    avgSalary: number;
    costByDepartment: Record<string, number>;
  };
  probation: {
    onProbation: number;
    ending30: number;
    ending60: number;
    ending90: number;
  };
};

const EMPLOYMENT_TYPES = ['FULL_TIME', 'PART_TIME', 'CONTRACT'] as const;

const fmtAed = (v: number) =>
  `AED ${Number(v).toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatEmploymentLabel = (t: string) =>
  t
    .split('_')
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ');

const formatShortDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-AE', { day: 'numeric', month: 'short', year: 'numeric' });

export default function AdminReportsPage() {
  const [data, setData] = React.useState<Summary | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    apiFetch<Summary>('/reports/summary')
      .then(setData)
      .catch((err) => {
        toast.error((err as Error).message ?? 'Failed to load reports');
        setData(null);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reports & analytics</h1>
          <p className="text-muted-foreground">Unable to load summary data.</p>
        </div>
      </div>
    );
  }

  const { headcount, attendance, leave, payroll, probation } = data;
  const typeCounts = Object.fromEntries(headcount.byType.map((x) => [x.type, x.count]));
  const onTimeDelta = attendance.onTimePercent - attendance.lastMonthOnTimePercent;
  const leaveTypeEntries = Object.entries(leave.byType).sort((a, b) => b[1] - a[1]);
  const payrollDeptEntries = Object.entries(payroll.costByDepartment).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reports & analytics</h1>
        <p className="text-muted-foreground">Organization summary from live HR data.</p>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">Headcount</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total employees</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-3xl font-bold">{headcount.total}</span>
                {headcount.newHires > 0 && (
                  <Badge variant="success" className="font-semibold">
                    +{headcount.newHires} new this month
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">New hires this month</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{headcount.newHires}</div>
              <p className="mt-1 text-xs text-muted-foreground">Compared to headcount at month start</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">By department</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {headcount.byDepartment.length === 0 ? (
                  <li className="text-muted-foreground">No departments</li>
                ) : (
                  headcount.byDepartment
                    .slice()
                    .sort((a, b) => b.count - a.count)
                    .map((d) => (
                      <li key={d.department} className="flex justify-between gap-4">
                        <span className="truncate text-foreground">{d.department}</span>
                        <span className="shrink-0 font-medium tabular-nums">{d.count}</span>
                      </li>
                    ))
                )}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">By employment type</CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {EMPLOYMENT_TYPES.map((t) => (
                  <li key={t} className="flex justify-between gap-4">
                    <span>{formatEmploymentLabel(t)}</span>
                    <span className="font-medium tabular-nums">{typeCounts[t] ?? 0}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">Attendance</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">On-time rate</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tabular-nums">{attendance.onTimePercent}%</div>
              <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                <span>Last month: {attendance.lastMonthOnTimePercent}%</span>
                {onTimeDelta !== 0 && (
                  <Badge variant={onTimeDelta > 0 ? 'success' : 'destructive'} className="font-normal">
                    {onTimeDelta > 0 ? '+' : ''}
                    {onTimeDelta} pts
                  </Badge>
                )}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Avg. work hours / day</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tabular-nums">{attendance.avgWorkHours}h</div>
              <p className="mt-1 text-xs text-muted-foreground">Completed sessions this month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Late arrivals</CardTitle>
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tabular-nums">{attendance.lateThisMonth}</div>
              <p className="mt-1 text-xs text-muted-foreground">This month</p>
            </CardContent>
          </Card>

          <Card className="md:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total sessions</CardTitle>
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tabular-nums">{attendance.totalSessions}</div>
              <p className="mt-1 text-xs text-muted-foreground">Clock-ins this month</p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">Leave</h2>
        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending requests</CardTitle>
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tabular-nums">{leave.pending}</div>
              <p className="mt-1 text-xs text-muted-foreground">Awaiting approval</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Days taken by type (this month)</CardTitle>
            </CardHeader>
            <CardContent>
              {leaveTypeEntries.length === 0 ? (
                <p className="text-sm text-muted-foreground">No approved leave days recorded this month.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {leaveTypeEntries.map(([type, days]) => (
                    <li key={type} className="flex justify-between gap-4">
                      <span className="truncate">{type.replace(/_/g, ' ')}</span>
                      <span className="shrink-0 font-medium tabular-nums">
                        {days} {days === 1 ? 'day' : 'days'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Upcoming approved leave</CardTitle>
            </CardHeader>
            <CardContent>
              {leave.upcoming.length === 0 ? (
                <p className="text-sm text-muted-foreground">No upcoming leave on the calendar.</p>
              ) : (
                <ul className="max-h-72 space-y-3 overflow-y-auto text-sm pr-1">
                  {leave.upcoming.map((row, i) => (
                    <li key={`${row.employee}-${row.startDate}-${i}`} className="rounded-md border border-border/60 bg-muted/30 px-3 py-2">
                      <div className="font-medium">{row.employee}</div>
                      <div className="mt-0.5 text-muted-foreground">{row.type.replace(/_/g, ' ')}</div>
                      <div className="mt-1 text-xs tabular-nums text-muted-foreground">
                        {formatShortDate(row.startDate)} — {formatShortDate(row.endDate)}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">Payroll</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total payroll cost</CardTitle>
              <Banknote className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums sm:text-3xl">{fmtAed(payroll.totalCost)}</div>
              <p className="mt-1 text-xs text-muted-foreground">Net pay, payslips this month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Average salary</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums sm:text-3xl">{fmtAed(payroll.avgSalary)}</div>
              <p className="mt-1 text-xs text-muted-foreground">Mean net pay per payslip</p>
            </CardContent>
          </Card>

          <Card className="md:col-span-3">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Cost by department</CardTitle>
            </CardHeader>
            <CardContent>
              {payrollDeptEntries.length === 0 ? (
                <p className="text-sm text-muted-foreground">No compensation data.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {payrollDeptEntries.map(([dept, cost]) => (
                    <li key={dept} className="flex justify-between gap-4">
                      <span className="truncate">{dept}</span>
                      <span className="shrink-0 font-medium tabular-nums">{fmtAed(cost)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">Probation</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">On probation</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tabular-nums">{probation.onProbation}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Ending within 30 days</CardTitle>
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-2">
              <div className="text-3xl font-bold tabular-nums">{probation.ending30}</div>
              <Badge variant="warning">Review soon</Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Ending within 60 days</CardTitle>
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-2">
              <div className="text-3xl font-bold tabular-nums">{probation.ending60}</div>
              <Badge variant="warning">Plan ahead</Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Ending within 90 days</CardTitle>
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-2">
              <div className="text-3xl font-bold tabular-nums">{probation.ending90}</div>
              <Badge variant="warning">On radar</Badge>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
