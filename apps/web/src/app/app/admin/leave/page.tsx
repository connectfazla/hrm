'use client';

import * as React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
import { Check, X } from 'lucide-react';

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

export default function AdminLeavePage() {
  const [requests, setRequests] = React.useState<LeaveRequest[]>([]);
  const [filter, setFilter] = React.useState<'PENDING' | 'ALL'>('PENDING');
  const [loading, setLoading] = React.useState(true);
  const [decision, setDecision] = React.useState<{ id: string; action: 'approve' | 'reject' } | null>(null);
  const [comment, setComment] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  const load = React.useCallback(() => {
    setLoading(true);
    const url = filter === 'PENDING' ? '/leave/requests?status=PENDING' : '/leave/requests';
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Leave Management</h1>
        <p className="text-muted-foreground">Review and manage leave requests.</p>
      </div>

      <div className="flex gap-2">
        <Button size="sm" variant={filter === 'PENDING' ? 'default' : 'outline'} onClick={() => setFilter('PENDING')}>
          Pending
        </Button>
        <Button size="sm" variant={filter === 'ALL' ? 'default' : 'outline'} onClick={() => setFilter('ALL')}>
          All
        </Button>
      </div>

      <Card>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <p className="text-sm">No leave requests found.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.employee?.fullName ?? '—'}</TableCell>
                  <TableCell><Badge variant="secondary">{r.type.replace(/_/g, ' ')}</Badge></TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {new Date(r.startDate).toLocaleDateString('en-AE')} – {new Date(r.endDate).toLocaleDateString('en-AE')}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-muted-foreground">{r.reason}</TableCell>
                  <TableCell><Badge variant={statusVariant(r.status)}>{r.status}</Badge></TableCell>
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
