'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
import { Clock, Users, AlertTriangle, CheckCircle2, Search } from 'lucide-react';

type AttendanceReport = {
  employees: {
    employeeId: string;
    fullName: string;
    department: string;
    daysWorked: number;
    daysLate: number;
    avgHoursPerDay: number;
    avgClockInTime: string | null;
    avgLateMinutes: number;
  }[];
  summary: { totalLate: number; totalDays: number; onTimePercent: number };
};

const MONTHS: { value: number; label: string }[] = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

function formatAvgClockIn(time: string | null): string {
  if (!time) return '—';
  const trimmed = time.trim();
  const match = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!match) return trimmed;
  let h = parseInt(match[1], 10);
  const m = match[2];
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m} ${ampm}`;
}

function daysLateBadgeClass(daysLate: number): string {
  if (daysLate === 0) return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30';
  if (daysLate <= 3) return 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30';
  return 'bg-destructive/15 text-destructive border-destructive/30';
}

export default function AdminAttendancePage() {
  const [year, setYear] = React.useState(0);
  const [month, setMonth] = React.useState(0);
  const [department, setDepartment] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [report, setReport] = React.useState<AttendanceReport | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const now = new Date();
    setYear(now.getFullYear());
    setMonth(now.getMonth() + 1);
  }, []);

  React.useEffect(() => {
    if (!year || !month) return;
    const params = new URLSearchParams({
      year: String(year),
      month: String(month),
      department: department.trim(),
    });
    setLoading(true);
    apiFetch<AttendanceReport>(`/reports/attendance?${params.toString()}`)
      .then(setReport)
      .catch(() => {
        toast.error('Failed to load attendance report');
        setReport(null);
      })
      .finally(() => setLoading(false));
  }, [year, month, department]);

  const filteredEmployees = React.useMemo(() => {
    const list = report?.employees ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((e) => e.fullName.toLowerCase().includes(q));
  }, [report, search]);

  const summary = report?.summary;
  const latePercent =
    summary != null ? Math.max(0, Math.min(100, 100 - summary.onTimePercent)) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Attendance Report</h1>
        <p className="text-muted-foreground">Work days, lateness, and clock-in averages by period.</p>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-medium">Filters</CardTitle>
          <div className="flex flex-col gap-4 pt-2 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="space-y-1.5">
              <Label htmlFor="att-year" className="text-xs">
                Year
              </Label>
              <Input
                id="att-year"
                type="number"
                className="w-[7rem]"
                value={year || ''}
                onChange={(e) => setYear(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="att-month" className="text-xs">
                Month
              </Label>
              <select
                id="att-month"
                className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-9 w-[11rem] rounded-md border px-3 py-1 text-sm shadow-xs focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                value={month || ''}
                onChange={(e) => setMonth(Number(e.target.value))}
              >
                <option value="" disabled>
                  Select month
                </option>
                {MONTHS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-[10rem] flex-1 space-y-1.5">
              <Label htmlFor="att-dept" className="text-xs">
                Department
              </Label>
              <Input
                id="att-dept"
                placeholder="All departments"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              />
            </div>
            <div className="min-w-[12rem] flex-1 space-y-1.5">
              <Label htmlFor="att-search" className="text-xs">
                Search employee
              </Label>
              <div className="relative">
                <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
                <Input
                  id="att-search"
                  className="pl-8"
                  placeholder="Filter by name…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={() => {
                setSearch('');
                setDepartment('');
                const now = new Date();
                setYear(now.getFullYear());
                setMonth(now.getMonth() + 1);
              }}
            >
              Reset
            </Button>
          </div>
        </CardHeader>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Days Worked</CardTitle>
                <Users className="text-muted-foreground size-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary?.totalDays ?? 0}</div>
                <p className="text-muted-foreground text-xs">Aggregate days in period</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Late Arrivals</CardTitle>
                <AlertTriangle className="text-muted-foreground size-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary?.totalLate ?? 0}</div>
                <p className="text-muted-foreground text-xs">{latePercent.toFixed(1)}% late</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">On-Time Percentage</CardTitle>
                <CheckCircle2 className="text-muted-foreground size-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(summary?.onTimePercent ?? 0).toFixed(1)}%
                </div>
                <p className="text-muted-foreground text-xs">Clock-ins on time</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="size-4" />
                Employees
              </CardTitle>
            </CardHeader>
            <CardContent className="px-0 sm:px-6">
              {!report || report.employees.length === 0 ? (
                <div className="text-muted-foreground flex flex-col items-center justify-center px-6 py-14 text-center text-sm">
                  <p>No attendance data for this period.</p>
                  <p className="mt-1">Try another year, month, or department.</p>
                </div>
              ) : filteredEmployees.length === 0 ? (
                <div className="text-muted-foreground flex flex-col items-center justify-center px-6 py-14 text-center text-sm">
                  <p>No employees match &ldquo;{search.trim()}&rdquo;.</p>
                  <p className="mt-1">Clear the search filter to see all rows.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead className="text-right">Days Worked</TableHead>
                      <TableHead className="text-right">Days Late</TableHead>
                      <TableHead className="text-right">Avg Hours/Day</TableHead>
                      <TableHead className="text-right">Avg Clock-In</TableHead>
                      <TableHead className="text-right">Avg Late (mins)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEmployees.map((e) => (
                      <TableRow key={e.employeeId}>
                        <TableCell className="font-medium">{e.fullName}</TableCell>
                        <TableCell className="text-muted-foreground">{e.department || '—'}</TableCell>
                        <TableCell className="text-right tabular-nums">{e.daysWorked}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline" className={daysLateBadgeClass(e.daysLate)}>
                            {e.daysLate}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {e.avgHoursPerDay.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatAvgClockIn(e.avgClockInTime)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {e.avgLateMinutes.toFixed(0)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
