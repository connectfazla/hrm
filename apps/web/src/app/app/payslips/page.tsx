'use client';

import * as React from 'react';
import { useAuth } from '@/components/auth-provider';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
import { Download, Receipt } from 'lucide-react';

type Payslip = {
  id: string;
  month: string;
  baseSalary: number | string;
  allowances: number | string;
  deductionsTotal: number | string;
  netPay: number | string;
  generatedAt: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1';

export default function PayslipsPage() {
  const { state } = useAuth();
  const [payslips, setPayslips] = React.useState<Payslip[]>([]);
  const [loading, setLoading] = React.useState(true);

  const employeeId = state.status === 'authenticated' ? state.user.employeeId : null;

  React.useEffect(() => {
    if (!employeeId) return;
    apiFetch<{ payslips: Payslip[] }>(`/payroll/employee/${employeeId}/payslips`)
      .then((res) => setPayslips(res.payslips))
      .catch(() => toast.error('Failed to load payslips'))
      .finally(() => setLoading(false));
  }, [employeeId]);

  const downloadPdf = async (monthStr: string) => {
    if (!employeeId) return;
    try {
      const month = new Date(monthStr).toISOString().slice(0, 7);
      const res = await fetch(`${API_BASE}/payroll/${employeeId}/${month}/payslip.pdf`, { credentials: 'include' });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payslip-${month}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to download payslip');
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Payslips</h1>
        <p className="text-muted-foreground">View and download your monthly payslips.</p>
      </div>

      <Card>
        {payslips.length === 0 ? (
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Receipt className="mb-3 h-8 w-8 opacity-40" />
            <p className="text-sm">No payslips generated yet.</p>
          </CardContent>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead className="text-right">Base Salary</TableHead>
                <TableHead className="text-right">Allowances</TableHead>
                <TableHead className="text-right">Deductions</TableHead>
                <TableHead className="text-right">Net Pay</TableHead>
                <TableHead className="text-right">PDF</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payslips.map((p) => {
                const month = new Date(p.month).toLocaleDateString('en-AE', { year: 'numeric', month: 'long' });
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{month}</TableCell>
                    <TableCell className="text-right">AED {Number(p.baseSalary).toLocaleString('en-AE')}</TableCell>
                    <TableCell className="text-right">AED {Number(p.allowances).toLocaleString('en-AE')}</TableCell>
                    <TableCell className="text-right text-destructive">AED {Number(p.deductionsTotal).toLocaleString('en-AE')}</TableCell>
                    <TableCell className="text-right font-semibold">AED {Number(p.netPay).toLocaleString('en-AE')}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => downloadPdf(p.month)}>
                        <Download className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
