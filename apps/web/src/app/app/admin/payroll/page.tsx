'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
import { Banknote, Download, Play } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1';

export default function AdminPayrollPage() {
  const [month, setMonth] = React.useState('');
  const [running, setRunning] = React.useState(false);
  const [result, setResult] = React.useState<{ payslipsCount?: number; status?: string } | null>(null);

  React.useEffect(() => {
    const d = new Date();
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }, []);

  const runPayroll = async () => {
    setRunning(true);
    try {
      const res = await apiFetch<{ payslipsCount?: number; status?: string }>(`/payroll/${month}/run`, { method: 'POST' });
      setResult(res);
      toast.success(`Payroll processed: ${res.payslipsCount ?? 0} payslips`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setRunning(false);
    }
  };

  const exportCsv = async () => {
    try {
      const res = await fetch(`${API_BASE}/payroll/export?month=${month}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payroll-${month}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Export failed');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Payroll</h1>
        <p className="text-muted-foreground">Run monthly payroll and export data.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Banknote className="h-4 w-4" /> Run Payroll
          </CardTitle>
          <CardDescription>Generate payslips for all employees for the selected month.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label>Month</Label>
              <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-48" />
            </div>
            <Button onClick={runPayroll} disabled={running}>
              <Play className="mr-2 h-4 w-4" />{running ? 'Processing…' : 'Run Payroll'}
            </Button>
            <Button variant="outline" onClick={exportCsv}>
              <Download className="mr-2 h-4 w-4" />Export CSV
            </Button>
          </div>

          {result && (
            <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-900/20">
              <Badge variant="success" className="shrink-0">Success</Badge>
              <p className="text-sm">
                Payroll for <span className="font-medium">{month}</span> processed. {result.payslipsCount} payslip(s) generated.
                {result.status === 'ALREADY_EXISTS' && ' (Payroll run already existed.)'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
