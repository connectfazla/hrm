'use client';

import * as React from 'react';
import { useAuth } from '@/components/auth-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
import { Download, FileSpreadsheet, Clock, Coffee } from 'lucide-react';

type WorkSession = {
  id: string;
  clockInAt: string;
  clockOutAt: string | null;
  late: boolean;
  lateByMinutes: number;
  workComment: string | null;
  lunches: { startAt: string; endAt: string | null; durationMinutes: number }[];
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1';

function diffHours(start: string, end: string | null) {
  if (!end) return '—';
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h}h ${m}m`;
}

export default function TimesheetPage() {
  const { state } = useAuth();
  const [sessions, setSessions] = React.useState<WorkSession[]>([]);
  const [loading, setLoading] = React.useState(true);
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
      const params = new URLSearchParams({ from, to, limit: '200' });
      const res = await apiFetch<{ sessions: WorkSession[] }>(`/attendance/${employeeId}/sessions?${params}`);
      setSessions(res.sessions ?? []);
    } catch {
      toast.error('Failed to load timesheet');
    } finally {
      setLoading(false);
    }
  }, [employeeId, from, to]);

  React.useEffect(() => { fetchData(); }, [fetchData]);

  const exportSheet = async (format: 'csv' | 'pdf') => {
    if (!employeeId) return;
    try {
      const params = new URLSearchParams({ period: 'daily', from, to, format });
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

  const totalHours = sessions.reduce((sum, s) => {
    if (!s.clockOutAt) return sum;
    return sum + (new Date(s.clockOutAt).getTime() - new Date(s.clockInAt).getTime()) / 3600000;
  }, 0);
  const totalLunch = sessions.reduce((sum, s) => sum + (s.lunches?.reduce((a, l) => a + l.durationMinutes, 0) ?? 0), 0);
  const lateCount = sessions.filter(s => s.late).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Timesheet</h1>
        <p className="text-muted-foreground">Review your attendance records.</p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-wrap items-end gap-4">
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
      </Card>

      {/* Summary Cards */}
      {!loading && sessions.length > 0 && (
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-2xl font-bold">{sessions.length}</p>
              <p className="text-xs text-muted-foreground">Work Days</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-2xl font-bold">{totalHours.toFixed(1)}h</p>
              <p className="text-xs text-muted-foreground">Total Hours</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-2xl font-bold">{totalLunch}m</p>
              <p className="text-xs text-muted-foreground">Total Lunch</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <p className={`text-2xl font-bold ${lateCount > 0 ? 'text-destructive' : ''}`}>{lateCount}</p>
              <p className="text-xs text-muted-foreground">Late Arrivals</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Sessions Table */}
      <Card>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : sessions.length === 0 ? (
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <FileSpreadsheet className="mb-3 h-10 w-10 opacity-30" />
            <p className="text-sm font-medium">No entries found</p>
            <p className="text-xs mt-1">Adjust the date range or clock in to start tracking.</p>
          </CardContent>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Clock In</TableHead>
                <TableHead>Clock Out</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Lunch</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Comment</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">
                    {new Date(s.clockInAt).toLocaleDateString('en-AE', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      {new Date(s.clockInAt).toLocaleTimeString('en-AE', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </TableCell>
                  <TableCell>
                    {s.clockOutAt ? new Date(s.clockOutAt).toLocaleTimeString('en-AE', { hour: '2-digit', minute: '2-digit' }) : '—'}
                  </TableCell>
                  <TableCell className="font-medium">{diffHours(s.clockInAt, s.clockOutAt)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Coffee className="h-3 w-3" />
                      {s.lunches?.reduce((a, l) => a + l.durationMinutes, 0) ?? 0}m
                    </div>
                  </TableCell>
                  <TableCell>
                    {s.late ? (
                      <Badge variant="destructive">{s.lateByMinutes}m late</Badge>
                    ) : (
                      <Badge variant="success">On time</Badge>
                    )}
                  </TableCell>
                  <TableCell className="hidden md:table-cell max-w-[200px] truncate text-muted-foreground">
                    {s.workComment ?? '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
