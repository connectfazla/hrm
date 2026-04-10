'use client';

import * as React from 'react';
import { useAuth } from '@/components/auth-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
type EmployeeOption = { id: string; fullName: string };

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
  const [loading, setLoading] = React.useState(false);
  const [initialized, setInitialized] = React.useState(false);
  const [from, setFrom] = React.useState('');
  const [to, setTo] = React.useState('');
  const [employees, setEmployees] = React.useState<EmployeeOption[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = React.useState<string>('');
  const [editingSession, setEditingSession] = React.useState<WorkSession | null>(null);
  const [editClockIn, setEditClockIn] = React.useState('');
  const [editClockOut, setEditClockOut] = React.useState('');
  const [editComment, setEditComment] = React.useState('');
  const [savingEdit, setSavingEdit] = React.useState(false);

  React.useEffect(() => {
    const now = new Date();
    const past = new Date();
    past.setDate(past.getDate() - 30);
    setFrom(past.toISOString().slice(0, 10));
    setTo(now.toISOString().slice(0, 10));
    setInitialized(true);
  }, []);

  const isAdmin = state.status === 'authenticated' && state.user.role === 'ADMIN';
  const employeeId = state.status === 'authenticated' ? state.user.employeeId : null;
  const targetEmployeeId = isAdmin ? selectedEmployeeId : employeeId;

  React.useEffect(() => {
    if (!isAdmin) return;
    apiFetch<{ employees: EmployeeOption[] }>('/employees')
      .then((res) => {
        const list = res.employees ?? [];
        setEmployees(list);
        if (!selectedEmployeeId && list[0]?.id) setSelectedEmployeeId(list[0].id);
      })
      .catch(() => toast.error('Failed to load employees for timesheet'));
  }, [isAdmin, selectedEmployeeId]);

  React.useEffect(() => {
    if (!initialized || !targetEmployeeId || !from || !to) return;
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams({ from, to, limit: '200' });
    apiFetch<{ sessions: WorkSession[] }>(`/attendance/${targetEmployeeId}/sessions?${params}`)
      .then((res) => { if (!cancelled) setSessions(res.sessions ?? []); })
      .catch(() => { if (!cancelled) toast.error('Failed to load timesheet'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [initialized, targetEmployeeId, from, to]);

  const exportSheet = async (format: 'csv' | 'pdf') => {
    if (!targetEmployeeId) return;
    try {
      const params = new URLSearchParams({ period: 'daily', from, to, format });
      const res = await fetch(`${API_BASE}/attendance/${targetEmployeeId}/export?${params}`, { credentials: 'include' });
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

  async function saveSessionEdit() {
    if (!editingSession || !editClockIn) return;
    setSavingEdit(true);
    try {
      const clockIn = new Date(editClockIn);
      const clockOut = editClockOut ? new Date(editClockOut) : null;
      await apiFetch(`/attendance/session/${editingSession.id}`, {
        method: 'PUT',
        json: {
          clockInAt: clockIn.toISOString(),
          clockOutAt: clockOut ? clockOut.toISOString() : null,
          workComment: editComment || null,
        },
      });
      setEditingSession(null);
      toast.success('Timesheet entry updated');
      if (targetEmployeeId) {
        const params = new URLSearchParams({ from, to, limit: '200' });
        const res = await apiFetch<{ sessions: WorkSession[] }>(`/attendance/${targetEmployeeId}/sessions?${params}`);
        setSessions(res.sessions ?? []);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update timesheet entry');
    } finally {
      setSavingEdit(false);
    }
  }

  if (state.status !== 'authenticated') return null;

  if (!targetEmployeeId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Timesheet</h1>
          <p className="text-muted-foreground">Review your attendance records.</p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <FileSpreadsheet className="mb-3 h-10 w-10 opacity-30" />
            <p className="text-sm font-medium">No employee profile linked</p>
            <p className="text-xs mt-1">Please log out and log back in to refresh your session.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

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
            {isAdmin && (
              <div className="space-y-2">
                <Label className="text-xs">Employee</Label>
                <select
                  className="border-input bg-background ring-offset-background focus-visible:ring-ring flex h-9 w-56 rounded-md border px-3 py-1 text-sm shadow-xs focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                >
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.fullName}
                    </option>
                  ))}
                </select>
              </div>
            )}
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
                {isAdmin && <TableHead className="text-right">Actions</TableHead>}
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
                  {isAdmin && (
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingSession(s);
                          setEditClockIn(s.clockInAt.slice(0, 16));
                          setEditClockOut(s.clockOutAt ? s.clockOutAt.slice(0, 16) : '');
                          setEditComment(s.workComment ?? '');
                        }}
                      >
                        Edit
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={!!editingSession} onOpenChange={(open) => !open && setEditingSession(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit timesheet entry</DialogTitle>
            <DialogDescription>Admins can update clock-in/out and comment.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Clock in</Label>
              <Input type="datetime-local" value={editClockIn} onChange={(e) => setEditClockIn(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Clock out</Label>
              <Input type="datetime-local" value={editClockOut} onChange={(e) => setEditClockOut(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Comment</Label>
              <Input value={editComment} onChange={(e) => setEditComment(e.target.value)} placeholder="Optional comment" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingSession(null)}>
              Cancel
            </Button>
            <Button onClick={saveSessionEdit} disabled={savingEdit}>
              {savingEdit ? 'Saving…' : 'Save changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
