'use client';

import * as React from 'react';
import { useAuth } from '@/components/auth-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
import { CalendarDays, Send } from 'lucide-react';

type LeaveBalance = {
  paidAccruedDays: number;
  paidAnnualDays: number;
  carryOverDays: number;
  paidUsedDays: number;
  emergencyUnpaidRemainingDays: number;
  unpaidUsedDays: number;
};

type LeaveRequest = {
  id: string;
  type: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: string;
  adminComment?: string;
  createdAt: string;
};

const LEAVE_TYPES = [
  { value: 'ANNUAL', label: 'Annual Leave' },
  { value: 'EMERGENCY_UNPAID', label: 'Emergency / Unpaid' },
  { value: 'SICK', label: 'Sick Leave' },
  { value: 'MATERNITY', label: 'Maternity Leave' },
  { value: 'PATERNITY', label: 'Paternity Leave' },
  { value: 'STUDY', label: 'Study Leave' },
  { value: 'BEREAVEMENT_IMMEDIATE', label: 'Bereavement (Immediate)' },
  { value: 'BEREAVEMENT_EXTENDED', label: 'Bereavement (Extended)' },
  { value: 'HAJJ', label: 'Hajj Leave' },
];

function statusVariant(status: string) {
  if (status === 'APPROVED') return 'success' as const;
  if (status === 'REJECTED') return 'destructive' as const;
  return 'warning' as const;
}

export default function LeavePage() {
  const { state } = useAuth();
  const [balances, setBalances] = React.useState<LeaveBalance | null>(null);
  const [requests, setRequests] = React.useState<LeaveRequest[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [form, setForm] = React.useState({ type: 'ANNUAL', startDate: '', endDate: '', reason: '' });

  const employeeId = state.status === 'authenticated' ? state.user.employeeId : null;

  const load = React.useCallback(async () => {
    if (!employeeId) return;
    try {
      const [balRes, reqRes] = await Promise.all([
        apiFetch<{ snapshot: LeaveBalance }>(`/leave/balances/${employeeId}`),
        apiFetch<{ leaveRequests: LeaveRequest[] }>('/leave/requests'),
      ]);
      setBalances(balRes.snapshot);
      setRequests(reqRes.leaveRequests);
    } catch {
      toast.error('Failed to load leave data');
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  React.useEffect(() => { load(); }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiFetch('/leave/request', { method: 'POST', json: form });
      toast.success('Leave request submitted');
      setForm({ type: 'ANNUAL', startDate: '', endDate: '', reason: '' });
      await load();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (state.status !== 'authenticated') return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const totalPaid = (balances?.paidAccruedDays ?? 0) + (balances?.paidAnnualDays ?? 0) + (balances?.carryOverDays ?? 0);
  const paidRemaining = totalPaid - (balances?.paidUsedDays ?? 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Leave</h1>
        <p className="text-muted-foreground">View balances, request leave, and track history.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Paid Remaining</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-3xl font-bold">{paidRemaining}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Emergency Unpaid</CardTitle>
          </CardHeader>
          <CardContent><div className="text-3xl font-bold">{balances?.emergencyUnpaidRemainingDays ?? 0}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Unpaid Used</CardTitle>
          </CardHeader>
          <CardContent><div className="text-3xl font-bold">{balances?.unpaidUsedDays ?? 0}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Request Leave</CardTitle>
          <CardDescription>Submit a new leave request for approval.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Leave Type</Label>
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {LEAVE_TYPES.map((t) => (<option key={t.value} value={t.value}>{t.label}</option>))}
              </select>
            </div>
            <div />
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input type="date" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} required />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Reason</Label>
              <Textarea value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} placeholder="Briefly describe your reason…" required minLength={3} />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={submitting}>
                <Send className="mr-2 h-4 w-4" />{submitting ? 'Submitting…' : 'Submit Request'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Leave History</CardTitle></CardHeader>
        {requests.length === 0 ? (
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <p className="text-sm">No leave requests yet.</p>
          </CardContent>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.type.replace(/_/g, ' ')}</TableCell>
                  <TableCell>{new Date(r.startDate).toLocaleDateString('en-AE')}</TableCell>
                  <TableCell>{new Date(r.endDate).toLocaleDateString('en-AE')}</TableCell>
                  <TableCell><Badge variant={statusVariant(r.status)}>{r.status}</Badge></TableCell>
                  <TableCell className="text-muted-foreground">{new Date(r.createdAt).toLocaleDateString('en-AE')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
