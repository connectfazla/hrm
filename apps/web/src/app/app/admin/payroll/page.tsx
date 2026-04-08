'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Banknote, Download, Play, Clock, FileText, Users, PlusCircle, MinusCircle, Trash2 } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1';

function formatMonthKey(isoOrDate: string): string {
  const d = new Date(isoOrDate);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function formatAed(n: number): string {
  return new Intl.NumberFormat('en-AE', {
    style: 'currency',
    currency: 'AED',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-AE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

type PayrollRunRow = {
  id: string;
  month: string;
  status: string;
  generatedAt: string;
  _count: { payslips: number };
};

type Compensation = {
  baseSalary?: string | number | null;
  allowances?: string | number | null;
} | null;

type EmployeeRow = {
  id: string;
  fullName: string;
  department: string;
  compensation?: Compensation;
};

type PreviewRow = {
  employeeId: string;
  fullName: string;
  department: string;
  baseSalary: number;
  allowances: number;
  deductions: number;
  netPay: number;
};

export default function AdminPayrollPage() {
  const [month, setMonth] = React.useState('');
  const [selectedRunId, setSelectedRunId] = React.useState<string | null>(null);
  const [running, setRunning] = React.useState(false);
  const [runResult, setRunResult] = React.useState<{ payslipsCount?: number; status?: string } | null>(null);

  const [runs, setRuns] = React.useState<PayrollRunRow[]>([]);
  const [runsLoading, setRunsLoading] = React.useState(true);
  const [runsError, setRunsError] = React.useState(false);

  const [previewRows, setPreviewRows] = React.useState<PreviewRow[]>([]);
  const [previewLoading, setPreviewLoading] = React.useState(false);
  const [previewRefreshKey, setPreviewRefreshKey] = React.useState(0);

  React.useEffect(() => {
    const d = new Date();
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }, []);

  const loadRuns = React.useCallback(async () => {
    setRunsLoading(true);
    setRunsError(false);
    try {
      const res = await apiFetch<{ runs: PayrollRunRow[] }>('/payroll/runs');
      setRuns(res.runs ?? []);
    } catch (err) {
      setRunsError(true);
      toast.error((err as Error).message ?? 'Failed to load payroll runs');
    } finally {
      setRunsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadRuns();
  }, [loadRuns]);

  React.useEffect(() => {
    if (!month) return;
    let cancelled = false;
    setPreviewLoading(true);
    (async () => {
      try {
        const { employees } = await apiFetch<{ employees: EmployeeRow[] }>('/employees');
        const rows: PreviewRow[] = await Promise.all(
          (employees ?? []).map(async (emp) => {
            const base = Number(emp.compensation?.baseSalary ?? 0);
            const allow = Number(emp.compensation?.allowances ?? 0);
            let deductions = 0;
            let netPay = base + allow;
            try {
              const { payslip } = await apiFetch<{
                payslip: { deductionsTotal: number; netPay: number };
              }>(`/payroll/${emp.id}/${month}`);
              deductions = Number(payslip.deductionsTotal);
              netPay = Number(payslip.netPay);
            } catch {
              // No payslip for this month — show compensation-based gross as net with no deductions.
            }
            return {
              employeeId: emp.id,
              fullName: emp.fullName,
              department: emp.department,
              baseSalary: base,
              allowances: allow,
              deductions,
              netPay,
            };
          }),
        );
        if (!cancelled) setPreviewRows(rows);
      } catch (err) {
        if (!cancelled) {
          setPreviewRows([]);
          toast.error((err as Error).message ?? 'Failed to load employee payroll preview');
        }
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [month, previewRefreshKey]);

  const selectedRun = React.useMemo(
    () => (selectedRunId ? runs.find((r) => r.id === selectedRunId) ?? null : null),
    [runs, selectedRunId],
  );

  const totalEmployees = previewRows.length;
  const totalPayrollCost = React.useMemo(
    () => previewRows.reduce((s, r) => s + r.netPay, 0),
    [previewRows],
  );
  const averageSalary = totalEmployees > 0 ? totalPayrollCost / totalEmployees : 0;

  const runPayroll = async () => {
    setRunning(true);
    setRunResult(null);
    try {
      const res = await apiFetch<{ payslipsCount?: number; status?: string }>(`/payroll/${month}/run`, {
        method: 'POST',
      });
      setRunResult(res);
      toast.success(`Payroll processed: ${res.payslipsCount ?? 0} payslip(s)`);
      await loadRuns();
      setPreviewRefreshKey((k) => k + 1);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setRunning(false);
    }
  };

  const exportCsv = async () => {
    try {
      const res = await fetch(`${API_BASE}/payroll/export?month=${month}`, { credentials: 'include' });
      if (!res.ok) {
        let msg = 'Export failed';
        try {
          const data = (await res.json()) as { message?: string };
          if (data?.message) msg = data.message;
        } catch {
          //
        }
        throw new Error(msg);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payroll-${month}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('CSV downloaded');
    } catch (err) {
      toast.error((err as Error).message ?? 'Export failed');
    }
  };

  const exportPdf = async () => {
    try {
      const { employees } = await apiFetch<{ employees: EmployeeRow[] }>('/employees');
      let downloaded = 0;
      for (const emp of employees ?? []) {
        const res = await fetch(`${API_BASE}/payroll/${emp.id}/${month}/payslip.pdf`, {
          credentials: 'include',
        });
        if (!res.ok) continue;
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const safe = emp.fullName.replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').slice(0, 40);
        a.download = `payslip-${safe}-${month}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        downloaded += 1;
        await new Promise((r) => setTimeout(r, 300));
      }
      if (downloaded === 0) {
        toast.error('No payslip PDFs for this month. Run payroll first.');
      } else {
        toast.success(`Downloaded ${downloaded} payslip PDF(s).`);
      }
    } catch (err) {
      toast.error((err as Error).message ?? 'PDF export failed');
    }
  };

  const [adjustTarget, setAdjustTarget] = React.useState<PreviewRow | null>(null);
  const [adjDesc, setAdjDesc] = React.useState('');
  const [adjAmount, setAdjAmount] = React.useState('');
  const [adjIsAddition, setAdjIsAddition] = React.useState(false);
  const [adjSubmitting, setAdjSubmitting] = React.useState(false);

  const handleAddAdjustment = async () => {
    if (!adjustTarget || !adjDesc || !adjAmount) {
      toast.error('Fill in all fields');
      return;
    }
    setAdjSubmitting(true);
    try {
      const { payslip } = await apiFetch<{ payslip: { id: string } }>(`/payroll/${adjustTarget.employeeId}/${month}`);
      await apiFetch(`/payroll/${payslip.id}/adjustment`, {
        method: 'POST',
        json: { description: adjDesc, amount: Number(adjAmount), isAddition: adjIsAddition },
      });
      toast.success(`Adjustment added for ${adjustTarget.fullName}`);
      setAdjustTarget(null);
      setAdjDesc('');
      setAdjAmount('');
      setPreviewRefreshKey((k) => k + 1);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setAdjSubmitting(false);
    }
  };

  const onSelectRun = (run: PayrollRunRow) => {
    setSelectedRunId(run.id);
    setMonth(formatMonthKey(run.month));
    setRunResult(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Payroll</h1>
        <p className="text-muted-foreground">Run monthly payroll, review history, and export reports.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {previewLoading ? (
              <div className="h-8 w-16 animate-pulse rounded bg-muted" />
            ) : (
              <div className="text-2xl font-bold">{totalEmployees}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Payroll Cost</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {previewLoading ? (
              <div className="h-8 w-32 animate-pulse rounded bg-muted" />
            ) : (
              <div className="text-2xl font-bold">{formatAed(totalPayrollCost)}</div>
            )}
            <p className="text-xs text-muted-foreground">Net pay (selected month)</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Salary</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {previewLoading ? (
              <div className="h-8 w-28 animate-pulse rounded bg-muted" />
            ) : (
              <div className="text-2xl font-bold">{formatAed(averageSalary)}</div>
            )}
            <p className="text-xs text-muted-foreground">Mean net pay per employee</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Play className="h-4 w-4" /> Payroll run
          </CardTitle>
          <CardDescription>Generate payslips for the selected month and export data.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label htmlFor="payroll-month">Month</Label>
              <Input
                id="payroll-month"
                type="month"
                value={month}
                onChange={(e) => {
                  setMonth(e.target.value);
                  setSelectedRunId(null);
                  setRunResult(null);
                }}
                className="w-48"
              />
            </div>
            <Button onClick={runPayroll} disabled={running || !month}>
              <Play className="mr-2 h-4 w-4" />
              {running ? 'Processing…' : 'Run Payroll'}
            </Button>
            <Button variant="outline" onClick={exportCsv} disabled={!month}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
            <Button variant="outline" onClick={exportPdf} disabled={!month}>
              <FileText className="mr-2 h-4 w-4" />
              Export PDF
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Export PDF downloads one payslip PDF per employee for this month (if payslips exist).
          </p>
          {runResult && (
            <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-900/20">
              <Badge variant="success" className="shrink-0">
                Success
              </Badge>
              <p className="text-sm">
                Payroll for <span className="font-medium">{month}</span> processed.{' '}
                {runResult.payslipsCount ?? 0} payslip(s) generated.
                {runResult.status === 'ALREADY_EXISTS' && ' (Payroll run already existed.)'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4" /> Past payroll runs
          </CardTitle>
          <CardDescription>Select a run to align the month picker and preview payslips for that period.</CardDescription>
        </CardHeader>
        <CardContent>
          {runsLoading ? (
            <div className="flex justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : runsError ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Could not load payroll runs.</p>
          ) : runs.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No payroll runs yet. Run payroll for a month to see history here.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payslips</TableHead>
                  <TableHead>Generated at</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.map((run) => {
                  const key = formatMonthKey(run.month);
                  const isSelected = run.id === selectedRunId;
                  return (
                    <TableRow
                      key={run.id}
                      className={`cursor-pointer ${isSelected ? 'bg-muted/60' : ''}`}
                      onClick={() => onSelectRun(run)}
                    >
                      <TableCell className="font-medium">{key}</TableCell>
                      <TableCell>
                        {run.status === 'FINALIZED' ? (
                          <Badge variant="success">FINALIZED</Badge>
                        ) : run.status === 'DRAFT' ? (
                          <Badge variant="warning">DRAFT</Badge>
                        ) : (
                          <Badge variant="secondary">{run.status}</Badge>
                        )}
                      </TableCell>
                      <TableCell>{run._count?.payslips ?? 0}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDateTime(run.generatedAt)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {selectedRun && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Run details</CardTitle>
            <CardDescription>Payroll run {selectedRun.id.slice(0, 8)}…</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <span className="text-muted-foreground">Month</span>
              <p className="font-medium">{formatMonthKey(selectedRun.month)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Status</span>
              <p className="mt-1">
                {selectedRun.status === 'FINALIZED' ? (
                  <Badge variant="success">FINALIZED</Badge>
                ) : selectedRun.status === 'DRAFT' ? (
                  <Badge variant="warning">DRAFT</Badge>
                ) : (
                  <Badge variant="secondary">{selectedRun.status}</Badge>
                )}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Payslips</span>
              <p className="font-medium">{selectedRun._count?.payslips ?? 0}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Generated at</span>
              <p className="font-medium">{formatDateTime(selectedRun.generatedAt)}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Employee payroll preview</CardTitle>
          <CardDescription>
            Base salary and allowances from each employee&apos;s compensation record. Deductions and net pay use payslip
            figures when payroll has been run for {month || 'the selected month'}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!month ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Choose a month to load the preview.</p>
          ) : previewLoading ? (
            <div className="flex justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : previewRows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No employees to show.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead className="text-right">Base salary</TableHead>
                  <TableHead className="text-right">Allowances</TableHead>
                  <TableHead className="text-right">Deductions</TableHead>
                  <TableHead className="text-right">Net pay</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewRows.map((row) => (
                  <TableRow key={row.employeeId}>
                    <TableCell className="font-medium">{row.fullName}</TableCell>
                    <TableCell>{row.department}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatAed(row.baseSalary)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatAed(row.allowances)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatAed(row.deductions)}</TableCell>
                    <TableCell className="text-right tabular-nums font-medium">{formatAed(row.netPay)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => { setAdjustTarget(row); setAdjIsAddition(false); setAdjDesc(''); setAdjAmount(''); }}>
                        <PlusCircle className="mr-1 h-3 w-3" /> Adjust
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <Dialog open={!!adjustTarget} onOpenChange={(open) => { if (!open) setAdjustTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Payroll Adjustment</DialogTitle>
            <DialogDescription>
              {adjustTarget ? `Adjust payslip for ${adjustTarget.fullName} (${month})` : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={!adjIsAddition ? 'default' : 'outline'}
                onClick={() => setAdjIsAddition(false)}
              >
                <MinusCircle className="mr-1 h-3 w-3" /> Deduction
              </Button>
              <Button
                size="sm"
                variant={adjIsAddition ? 'default' : 'outline'}
                onClick={() => setAdjIsAddition(true)}
              >
                <PlusCircle className="mr-1 h-3 w-3" /> Addition / Bonus
              </Button>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={adjDesc}
                onChange={(e) => setAdjDesc(e.target.value)}
                placeholder="e.g., Late penalty, Overtime bonus"
              />
            </div>
            <div className="space-y-2">
              <Label>Amount (AED)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={adjAmount}
                onChange={(e) => setAdjAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustTarget(null)}>Cancel</Button>
            <Button onClick={handleAddAdjustment} disabled={adjSubmitting}>
              {adjSubmitting ? 'Adding…' : adjIsAddition ? 'Add Bonus' : 'Add Deduction'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
