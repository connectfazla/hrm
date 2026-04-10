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
import { Clock, Users, AlertTriangle, CheckCircle2, Search, Download, ArrowUpDown } from 'lucide-react';

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
  const d = new Date(time);
  if (isNaN(d.getTime())) return time;
  return d.toLocaleTimeString('en-AE', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function daysLateBadgeClass(daysLate: number): string {
  if (daysLate === 0) return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30';
  if (daysLate <= 3) return 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30';
  return 'bg-destructive/15 text-destructive border-destructive/30';
}

type SortKey =
  | 'fullName'
  | 'department'
  | 'daysWorked'
  | 'daysLate'
  | 'avgHoursPerDay'
  | 'avgClockInTime'
  | 'avgLateMinutes'
  | 'totalHours'
  | 'overtime';

type SortDir = 'asc' | 'desc';

const STANDARD_HOURS_PER_DAY = 8;

function computeTotalHours(e: AttendanceReport['employees'][number]) {
  return e.avgHoursPerDay * e.daysWorked;
}

function computeOvertime(e: AttendanceReport['employees'][number]) {
  return computeTotalHours(e) - STANDARD_HOURS_PER_DAY * e.daysWorked;
}

export default function AdminAttendancePage() {
  const [year, setYear] = React.useState(0);
  const [month, setMonth] = React.useState(0);
  const [department, setDepartment] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [report, setReport] = React.useState<AttendanceReport | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [sortKey, setSortKey] = React.useState<SortKey>('fullName');
  const [sortDir, setSortDir] = React.useState<SortDir>('asc');

  const toggleSort = React.useCallback((key: SortKey) => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        return prev;
      }
      setSortDir('asc');
      return key;
    });
  }, []);

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

  const sortedEmployees = React.useMemo(() => {
    const rows = [...filteredEmployees];
    const dir = sortDir === 'asc' ? 1 : -1;
    rows.sort((a, b) => {
      let av: number | string;
      let bv: number | string;
      switch (sortKey) {
        case 'fullName':
          return dir * a.fullName.localeCompare(b.fullName);
        case 'department':
          return dir * (a.department || '').localeCompare(b.department || '');
        case 'avgClockInTime':
          av = a.avgClockInTime ?? '';
          bv = b.avgClockInTime ?? '';
          return dir * String(av).localeCompare(String(bv));
        case 'totalHours':
          return dir * (computeTotalHours(a) - computeTotalHours(b));
        case 'overtime':
          return dir * (computeOvertime(a) - computeOvertime(b));
        default:
          return dir * ((a[sortKey] as number) - (b[sortKey] as number));
      }
    });
    return rows;
  }, [filteredEmployees, sortKey, sortDir]);

  const aggregateTotalHours = React.useMemo(() => {
    return filteredEmployees.reduce((sum, e) => sum + computeTotalHours(e), 0);
  }, [filteredEmployees]);

  const exportCsv = React.useCallback(() => {
    if (!sortedEmployees.length) return;
    const headers = [
      'Employee',
      'Department',
      'Days Worked',
      'Days Late',
      'Avg Hours/Day',
      'Total Hours',
      'Overtime',
      'Avg Clock-In',
      'Avg Late (mins)',
    ];
    const csvRows = [
      headers.join(','),
      ...sortedEmployees.map((e) => {
        const totalH = computeTotalHours(e);
        const ot = computeOvertime(e);
        return [
          `"${e.fullName}"`,
          `"${e.department || ''}"`,
          e.daysWorked,
          e.daysLate,
          e.avgHoursPerDay.toFixed(2),
          totalH.toFixed(2),
          ot.toFixed(2),
          `"${formatAvgClockIn(e.avgClockInTime)}"`,
          e.avgLateMinutes.toFixed(0),
        ].join(',');
      }),
    ];
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-${year}-${String(month).padStart(2, '0')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  }, [sortedEmployees, year, month]);

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
        <>
          <div className="grid gap-4 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="bg-muted h-4 w-28 animate-pulse rounded" />
                  <div className="bg-muted size-4 animate-pulse rounded" />
                </CardHeader>
                <CardContent>
                  <div className="bg-muted mb-1 h-7 w-16 animate-pulse rounded" />
                  <div className="bg-muted h-3 w-24 animate-pulse rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardHeader>
              <div className="bg-muted h-5 w-32 animate-pulse rounded" />
            </CardHeader>
            <CardContent className="px-0 sm:px-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    {Array.from({ length: 9 }).map((_, i) => (
                      <TableHead key={i}>
                        <div className="bg-muted h-4 w-20 animate-pulse rounded" />
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 5 }).map((_, row) => (
                    <TableRow key={row}>
                      {Array.from({ length: 9 }).map((_, col) => (
                        <TableCell key={col}>
                          <div className="bg-muted h-4 w-full animate-pulse rounded" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-4">
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
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Work Hours</CardTitle>
                <Clock className="text-muted-foreground size-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{aggregateTotalHours.toFixed(1)}</div>
                <p className="text-muted-foreground text-xs">Hours across all employees</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="size-4" />
                Employees
              </CardTitle>
              {sortedEmployees.length > 0 && (
                <Button variant="outline" size="sm" onClick={exportCsv}>
                  <Download className="mr-1.5 size-4" />
                  Export CSV
                </Button>
              )}
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
                      <SortableHead activeKey={sortKey} dir={sortDir} column="fullName" onClick={toggleSort}>
                        Employee
                      </SortableHead>
                      <SortableHead activeKey={sortKey} dir={sortDir} column="department" onClick={toggleSort}>
                        Department
                      </SortableHead>
                      <SortableHead activeKey={sortKey} dir={sortDir} column="daysWorked" onClick={toggleSort} className="text-right">
                        Days Worked
                      </SortableHead>
                      <SortableHead activeKey={sortKey} dir={sortDir} column="daysLate" onClick={toggleSort} className="text-right">
                        Days Late
                      </SortableHead>
                      <SortableHead activeKey={sortKey} dir={sortDir} column="avgHoursPerDay" onClick={toggleSort} className="text-right">
                        Avg Hours/Day
                      </SortableHead>
                      <SortableHead activeKey={sortKey} dir={sortDir} column="totalHours" onClick={toggleSort} className="text-right">
                        Total Hours
                      </SortableHead>
                      <SortableHead activeKey={sortKey} dir={sortDir} column="overtime" onClick={toggleSort} className="text-right">
                        Overtime
                      </SortableHead>
                      <SortableHead activeKey={sortKey} dir={sortDir} column="avgClockInTime" onClick={toggleSort} className="text-right">
                        Avg Clock-In
                      </SortableHead>
                      <SortableHead activeKey={sortKey} dir={sortDir} column="avgLateMinutes" onClick={toggleSort} className="text-right">
                        Avg Late (mins)
                      </SortableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedEmployees.map((e) => {
                      const totalH = computeTotalHours(e);
                      const ot = computeOvertime(e);
                      return (
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
                            {totalH.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            <span className={ot > 0 ? 'text-emerald-600 dark:text-emerald-400' : ot < 0 ? 'text-destructive' : ''}>
                              {ot > 0 ? '+' : ''}
                              {ot.toFixed(2)}
                            </span>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatAvgClockIn(e.avgClockInTime)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {e.avgLateMinutes.toFixed(0)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
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

function SortableHead({
  column,
  activeKey,
  dir,
  onClick,
  className,
  children,
}: {
  column: SortKey;
  activeKey: SortKey;
  dir: SortDir;
  onClick: (key: SortKey) => void;
  className?: string;
  children: React.ReactNode;
}) {
  const active = activeKey === column;
  return (
    <TableHead className={className}>
      <button
        type="button"
        className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
        onClick={() => onClick(column)}
      >
        {children}
        <ArrowUpDown
          className={`size-3.5 shrink-0 ${active ? 'text-foreground' : 'text-muted-foreground/50'}`}
          style={active ? { transform: dir === 'desc' ? 'scaleY(-1)' : undefined } : undefined}
        />
      </button>
    </TableHead>
  );
}
