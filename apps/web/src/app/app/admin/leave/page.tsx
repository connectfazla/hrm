'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
import { Check, X, CalendarDays, Clock, Search, Users } from 'lucide-react';

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

type Employee = {
  id: string;
  fullName: string;
  department?: string;
};

type LeaveBalance = {
  annualTotal: number;
  annualUsed: number;
  annualRemaining: number;
  sickUsed: number;
  emergencyUsed: number;
  unpaidUsed: number;
};

type EmployeeBalance = {
  employee: Employee;
  balances: LeaveBalance | null;
  loading: boolean;
};

function statusVariant(status: string) {
  if (status === 'APPROVED') return 'success' as const;
  if (status === 'REJECTED') return 'destructive' as const;
  return 'warning' as const;
}

function dayCount(start: string, end: string) {
  return Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / 86400000) + 1;
}

function leaveTypeToBalanceKey(type: string): keyof LeaveBalance | null {
  const normalized = type.toUpperCase().replace(/[\s_]+/g, '_');
  if (normalized.includes('ANNUAL') || normalized.includes('VACATION')) return 'annualRemaining';
  if (normalized.includes('SICK')) return 'sickUsed';
  if (normalized.includes('EMERGENCY')) return 'emergencyUsed';
  if (normalized.includes('UNPAID')) return 'unpaidUsed';
  return null;
}

export default function AdminLeavePage() {
  const [requests, setRequests] = React.useState<LeaveRequest[]>([]);
  const [filter, setFilter] = React.useState<'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'>('ALL');
  const [search, setSearch] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [decision, setDecision] = React.useState<{ id: string; action: 'approve' | 'reject' } | null>(null);
  const [comment, setComment] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  const [dateFrom, setDateFrom] = React.useState('');
  const [dateTo, setDateTo] = React.useState('');

  const [employees, setEmployees] = React.useState<Employee[]>([]);
  const [employeeBalances, setEmployeeBalances] = React.useState<Map<string, LeaveBalance>>(new Map());
  const [balancesLoading, setBalancesLoading] = React.useState(false);
  const [balanceSearch, setBalanceSearch] = React.useState('');

  const [requestBalances, setRequestBalances] = React.useState<Map<string, LeaveBalance>>(new Map());

  const load = React.useCallback(() => {
    setLoading(true);
    const url = filter === 'ALL' ? '/leave/requests' : `/leave/requests?status=${filter}`;
    apiFetch<{ leaveRequests: LeaveRequest[] }>(url)
      .then((res) => setRequests(res.leaveRequests))
      .catch(() => toast.error('Failed to load leave requests'))
      .finally(() => setLoading(false));
  }, [filter]);

  React.useEffect(() => { load(); }, [load]);

  React.useEffect(() => {
    const employeeIds = new Set<string>();
    requests.forEach((r) => {
      if (r.employee?.id) employeeIds.add(r.employee.id);
    });

    const missing = Array.from(employeeIds).filter((id) => !requestBalances.has(id));
    if (missing.length === 0) return;

    Promise.allSettled(
      missing.map((id) =>
        apiFetch<{ balances: LeaveBalance }>(`/leave/balances/${id}`).then((res) => ({
          id,
          balances: res.balances,
        })),
      ),
    ).then((results) => {
      setRequestBalances((prev) => {
        const next = new Map(prev);
        for (const result of results) {
          if (result.status === 'fulfilled') {
            next.set(result.value.id, result.value.balances);
          }
        }
        return next;
      });
    });
  }, [requests]);

  const loadBalances = React.useCallback(() => {
    setBalancesLoading(true);
    apiFetch<{ employees: Employee[] }>('/employees')
      .then(async (res) => {
        setEmployees(res.employees);
        const results = await Promise.allSettled(
          res.employees.map((emp) =>
            apiFetch<{ balances: LeaveBalance }>(`/leave/balances/${emp.id}`).then((r) => ({
              id: emp.id,
              balances: r.balances,
            })),
          ),
        );
        setEmployeeBalances(() => {
          const map = new Map<string, LeaveBalance>();
          for (const result of results) {
            if (result.status === 'fulfilled') {
              map.set(result.value.id, result.value.balances);
            }
          }
          return map;
        });
      })
      .catch(() => toast.error('Failed to load employee balances'))
      .finally(() => setBalancesLoading(false));
  }, []);

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
    if (search) {
      const q = search.toLowerCase();
      if (
        !r.employee?.fullName.toLowerCase().includes(q) &&
        !r.type.toLowerCase().includes(q) &&
        !r.reason.toLowerCase().includes(q)
      ) return false;
    }
    if (dateFrom) {
      if (new Date(r.endDate) < new Date(dateFrom)) return false;
    }
    if (dateTo) {
      if (new Date(r.startDate) > new Date(dateTo)) return false;
    }
    return true;
  });

  const filteredBalanceEmployees = employees.filter((emp) => {
    if (!balanceSearch) return true;
    return emp.fullName.toLowerCase().includes(balanceSearch.toLowerCase());
  });

  const pendingCount = requests.filter((r) => r.status === 'PENDING').length;
  const approvedCount = requests.filter((r) => r.status === 'APPROVED').length;
  const rejectedCount = requests.filter((r) => r.status === 'REJECTED').length;
  const totalDaysApproved = requests
    .filter((r) => r.status === 'APPROVED')
    .reduce((sum, r) => sum + dayCount(r.startDate, r.endDate), 0);

  function getRemainingForType(employeeId: string | undefined, type: string): string {
    if (!employeeId) return '—';
    const bal = requestBalances.get(employeeId);
    if (!bal) return '…';
    const key = leaveTypeToBalanceKey(type);
    if (!key) return '—';
    if (key === 'annualRemaining') return `${bal.annualRemaining}d`;
    if (key === 'sickUsed') return `${bal.sickUsed}d used`;
    if (key === 'emergencyUsed') return `${bal.emergencyUsed}d used`;
    if (key === 'unpaidUsed') return `${bal.unpaidUsed}d used`;
    return '—';
  }

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

      <Tabs defaultValue="requests" onValueChange={(v) => { if (v === 'balances') loadBalances(); }}>
        <TabsList>
          <TabsTrigger value="requests" className="gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" /> Requests
          </TabsTrigger>
          <TabsTrigger value="balances" className="gap-1.5">
            <Users className="h-3.5 w-3.5" /> Balances
          </TabsTrigger>
        </TabsList>

        {/* ── Requests Tab ── */}
        <TabsContent value="requests" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((f) => (
                <Button key={f} size="sm" variant={filter === f ? 'default' : 'outline'} onClick={() => setFilter(f)}>
                  {f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
                </Button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <div className="grid gap-1">
                <Label className="text-xs text-muted-foreground">From</Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-36 h-8 text-xs"
                />
              </div>
              <div className="grid gap-1">
                <Label className="text-xs text-muted-foreground">To</Label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-36 h-8 text-xs"
                />
              </div>
              {(dateFrom || dateTo) && (
                <Button size="sm" variant="ghost" className="mt-4 h-8 text-xs" onClick={() => { setDateFrom(''); setDateTo(''); }}>
                  Clear
                </Button>
              )}
            </div>

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
                    <TableHead>Remaining</TableHead>
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
                      <TableCell>
                        <span className="text-xs font-medium text-muted-foreground">
                          {getRemainingForType(r.employee?.id, r.type)}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-[250px]">
                        <Popover>
                          <PopoverTrigger asChild>
                            <button className="max-w-full truncate text-left text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                              {r.reason}
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-80 text-sm">
                            <p className="font-medium mb-1">Reason</p>
                            <p className="text-muted-foreground whitespace-pre-wrap">{r.reason}</p>
                            {r.adminComment && (
                              <>
                                <Separator className="my-2" />
                                <p className="font-medium mb-1">Admin Comment</p>
                                <p className="text-muted-foreground whitespace-pre-wrap">{r.adminComment}</p>
                              </>
                            )}
                          </PopoverContent>
                        </Popover>
                      </TableCell>
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
        </TabsContent>

        {/* ── Balances Tab ── */}
        <TabsContent value="balances" className="space-y-4">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filter by employee name…"
              value={balanceSearch}
              onChange={(e) => setBalanceSearch(e.target.value)}
              className="w-72"
            />
          </div>

          <Card>
            {balancesLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : filteredBalanceEmployees.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Users className="mb-3 h-10 w-10 opacity-30" />
                <p className="text-sm font-medium">No employees found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead className="text-center">Annual Total</TableHead>
                    <TableHead className="text-center">Annual Used</TableHead>
                    <TableHead className="text-center">Annual Remaining</TableHead>
                    <TableHead className="text-center">Sick Used</TableHead>
                    <TableHead className="text-center">Emergency Used</TableHead>
                    <TableHead className="text-center">Unpaid Used</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBalanceEmployees.map((emp) => {
                    const bal = employeeBalances.get(emp.id);
                    return (
                      <TableRow key={emp.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{emp.fullName}</p>
                            {emp.department && (
                              <p className="text-xs text-muted-foreground">{emp.department}</p>
                            )}
                          </div>
                        </TableCell>
                        {bal ? (
                          <>
                            <TableCell className="text-center font-medium">{bal.annualTotal}</TableCell>
                            <TableCell className="text-center text-muted-foreground">{bal.annualUsed}</TableCell>
                            <TableCell className="text-center">
                              <Badge variant={bal.annualRemaining <= 5 ? 'destructive' : 'success'}>
                                {bal.annualRemaining}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center text-muted-foreground">{bal.sickUsed}</TableCell>
                            <TableCell className="text-center text-muted-foreground">{bal.emergencyUsed}</TableCell>
                            <TableCell className="text-center text-muted-foreground">{bal.unpaidUsed}</TableCell>
                          </>
                        ) : (
                          <TableCell colSpan={6} className="text-center text-muted-foreground text-xs">
                            Unable to load balance
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>
      </Tabs>

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
