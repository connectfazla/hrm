'use client';

import * as React from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';

type LateEntry = { employeeId: string; fullName: string; lateCount: number; totalLateMins: number };

export default function AdminAttendancePage() {
  const [report, setReport] = React.useState<LateEntry[]>([]);
  const [year, setYear] = React.useState(0);
  const [month, setMonth] = React.useState(0);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    setYear(new Date().getFullYear());
    setMonth(new Date().getMonth() + 1);
  }, []);

  React.useEffect(() => {
    if (!year || !month) return;
    setLoading(true);
    apiFetch<any>(`/reports/attendance?year=${year}&month=${month}`)
      .then((res) => setReport(Array.isArray(res) ? res : (res.report ?? [])))
      .catch(() => toast.error('Failed to load attendance report'))
      .finally(() => setLoading(false));
  }, [year, month]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Attendance Report</h1>
        <p className="text-muted-foreground">Late arrival reports and attendance overview.</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="space-y-1">
              <Label className="text-xs">Year</Label>
              <Input type="number" value={year || ''} onChange={(e) => setYear(Number(e.target.value))} className="w-24" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Month</Label>
              <Input type="number" min={1} max={12} value={month || ''} onChange={(e) => setMonth(Number(e.target.value))} className="w-20" />
            </div>
          </div>
        </CardHeader>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : report.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <p className="text-sm">No late arrivals recorded for this period.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead className="text-right">Late Count</TableHead>
                <TableHead className="text-right">Total Late (mins)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.map((r) => (
                <TableRow key={r.employeeId}>
                  <TableCell className="font-medium">{r.fullName}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={r.lateCount >= 5 ? 'destructive' : r.lateCount >= 3 ? 'warning' : 'secondary'}>
                      {r.lateCount}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">{r.totalLateMins}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
