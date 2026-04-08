'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
import { Check, X, CalendarDays, Clock, Search } from 'lucide-react';

type LeaveRequest = {
  id: string;
  type: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: string;
  adminComment?: string;
  createdAt: string;
  employee?: { id: string; fullName: string };
};

function statusVariant(status: string) {
  if (status === 'APPROVED') return 'success' as const;
  if (status === 'REJECTED') return 'destructive' as const;
  return 'warning' as const;
}

function dayCount(start: string, end: string) {
  return Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / 86400000) + 1;
}

export default function AdminLeavePage() {
  const [requests, setRequests] = React.useState<LeaveRequest[]>([]);
  const [filter, setFilter] = React.useState<'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'>('ALL');
  const [search, setSearch] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [decision, setDecision] = React.useState<{ id: string; action: 'approve' | 'reject' } | null>(null);
  const [comment, setComment] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  const load = React.useCallback(() => {
    setLoading(true);
    const url = filter === 'ALL' ? '/leave/requests' : `/leave/requests?status=${filter}`;
    apiFetch<{ leaveRequests: LeaveRequest[] }>(url)
      .then((res) => setRequests(res.leaveRequests))
      .catch(() => toast.error('Failed to load leave requests'))
      .finally(() => setLoading(false));
  }, [filter]);

  React.useEffect(() => { load(); }, [load]);

  const handleDecision = async () => {
    if (!decision || comment.length < 3) {
      toast.error('Please enter a comment (min 3 chars)');
      return;
    }
    setSubmitting(true);
    try {
      await apiFetch(`/leave/request/${decision.id}/${decision.action}`, { method: 'PUT', json: { comment } });
      toast.success(`Leave ${decision.action === 'approve' ? 'approved' : 'rejected'}`);
      setDecision(null);
      setComment('');
      load();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = requests.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.employee?.fullName.toLowerCase().includes(q) ||
      r.type.toLowerCase().includes(q) ||
      r.reason.toLowerCase().includes(q)
    );
  });

  const pendingCount = requests.filter((r) => r.status === 'PENDING').length;
  const approvedCount = requests.filter((r) => r.status === 'APPROVED').length;
  const rejectedCount = requests.filter((r) => r.status === 'REJECTED').length;
  const totalDaysApproved = requests
    .filter((r) => r.status === 'APPROVED')
    .reduce((sum, r) => sum + dayCount(r.startDate, r.endDate), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Leave Management</h1>
        <p className="text-muted-foreground">Review and manage leave requests for all employees.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold text-emerald-600">{approvedCount}</p>
            <p className="text-xs text-muted-foreground">Approved</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold text-red-600">{rejectedCount}</p>
            <p className="text-xs text-muted-foreground">Rejected</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold">{totalDaysApproved}</p>
            <p className="text-xs text-muted-foreground">Days Granted</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((f) => (
          <Button key={f} size="sm" variant={filter === f ? 'default' : 'outline'} onClick={() => setFilter(f)}>
            {f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
          </Button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, type, or reason…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64"
          />
        </div>
      </div>

      <Card>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <CalendarDays className="mb-3 h-10 w-10 opacity-30" />
            <p className="text-sm font-medium">No leave requests found</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Days</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.employee?.fullName ?? '—'}</TableCell>
                  <TableCell><Badge variant="secondary">{r.type.replace(/_/g, ' ')}</Badge></TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground text-xs">
                    {new Date(r.startDate).toLocaleDateString('en-AE', { month: 'short', day: 'numeric' })} – {new Date(r.endDate).toLocaleDateString('en-AE', { month: 'short', day: 'numeric' })}
                  </TableCell>
                  <TableCell className="font-medium">{dayCount(r.startDate, r.endDate)}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-muted-foreground">{r.reason}</TableCell>
                  <TableCell><Badge variant={statusVariant(r.status)}>{r.status}</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(r.createdAt).toLocaleDateString('en-AE', { month: 'short', day: 'numeric' })}
                  </TableCell>
                  <TableCell className="text-right">
                    {r.status === 'PENDING' && (
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="outline" onClick={() => { setDecision({ id: r.id, action: 'approve' }); setComment(''); }}>
                          <Check className="mr-1 h-3 w-3" /> Approve
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => { setDecision({ id: r.id, action: 'reject' }); setComment(''); }}>
                          <X className="mr-1 h-3 w-3" /> Reject
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={!!decision} onOpenChange={(open) => { if (!open) setDecision(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{decision?.action === 'approve' ? 'Approve' : 'Reject'} Leave Request</DialogTitle>
            <DialogDescription>Add a comment for the employee.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Comment</Label>
            <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Enter your comment…" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDecision(null)}>Cancel</Button>
            <Button variant={decision?.action === 'reject' ? 'destructive' : 'default'} onClick={handleDecision} disabled={submitting}>
              {submitting ? 'Processing…' : decision?.action === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
