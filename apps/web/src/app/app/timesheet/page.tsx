'use client';

import * as React from 'react';
import { useAuth } from '@/components/auth-provider';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
import { Download, FileSpreadsheet } from 'lucide-react';

type TimesheetEntry = {
  id: string;
  clockInAt: string;
  clockOutAt: string | null;
  late: boolean;
  lateByMinutes: number;
  workComment: string | null;
  lunches: { startAt: string; endAt: string | null; durationMinutes: number }[];
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1';

export default function TimesheetPage() {
  const { state } = useAuth();
  const [entries, setEntries] = React.useState<TimesheetEntry[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [period, setPeriod] = React.useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [from, setFrom] = React.useState('');
  const [to, setTo] = React.useState('');

  React.useEffect(() => {
    const now = new Date();
    const past = new Date();
    past.setDate(past.getDate() - 30);
    setFrom(past.toISOString().slice(0, 10));
    setTo(now.toISOString().slice(0, 10));
  }, []);

  const employeeId = state.status === 'authenticated' ? state.user.employeeId : null;

  const fetchData = React.useCallback(async () => {
    if (!employeeId || !from || !to) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ period, from, to });
      const res = await apiFetch<any>(`/attendance/${employeeId}?${params}`);
      setEntries(Array.isArray(res) ? res : (res.sessions ?? res.entries ?? []));
    } catch {
      toast.error('Failed to load timesheet');
    } finally {
      setLoading(false);
    }
  }, [employeeId, period, from, to]);

  React.useEffect(() => { fetchData(); }, [fetchData]);

  const exportSheet = async (format: 'csv' | 'pdf') => {
    if (!employeeId) return;
    try {
      const params = new URLSearchParams({ period, from, to, format });
      const res = await fetch(`${API_BASE}/attendance/${employeeId}/export?${params}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `timesheet.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Export failed');
    }
  };

  if (state.status !== 'authenticated') return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Timesheet</h1>
        <p className="text-muted-foreground">Review your attendance records.</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Period</Label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value as 'daily' | 'weekly' | 'monthly')}
                className="flex h-9 w-32 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">From</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">To</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => exportSheet('csv')}>
                <Download className="mr-1 h-3 w-3" /> CSV
              </Button>
              <Button size="sm" variant="outline" onClick={() => exportSheet('pdf')}>
                <Download className="mr-1 h-3 w-3" /> PDF
              </Button>
            </div>
          </div>
        </CardHeader>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <FileSpreadsheet className="mb-3 h-8 w-8 opacity-40" />
            <p className="text-sm">No entries found for this period.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Clock In</TableHead>
                <TableHead>Clock Out</TableHead>
                <TableHead>Lunch</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Comment</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">{new Date(e.clockInAt).toLocaleDateString('en-AE')}</TableCell>
                  <TableCell>{new Date(e.clockInAt).toLocaleTimeString('en-AE', { hour: '2-digit', minute: '2-digit' })}</TableCell>
                  <TableCell>{e.clockOutAt ? new Date(e.clockOutAt).toLocaleTimeString('en-AE', { hour: '2-digit', minute: '2-digit' }) : '—'}</TableCell>
                  <TableCell>{e.lunches?.reduce((s, l) => s + l.durationMinutes, 0) ?? 0} min</TableCell>
                  <TableCell>
                    {e.late ? (
                      <Badge variant="destructive">{e.lateByMinutes}m late</Badge>
                    ) : (
                      <Badge variant="success">On time</Badge>
                    )}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-muted-foreground">{e.workComment ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
