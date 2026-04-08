'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
import { Upload, FileText } from 'lucide-react';

type ExpiringDoc = { id: string; category: string; originalFileName: string | null; expiryDate: string; employee?: { fullName: string } };
type Employee = { id: string; fullName: string };

const CATEGORIES = [
  'EMPLOYMENT_CONTRACT', 'EMIRATES_ID', 'PASSPORT', 'VISA',
  'PROFESSIONAL_CERTIFICATE', 'CV_RESUME', 'PROFILE_PHOTO', 'BANK_DETAILS_LETTER', 'OTHER',
];

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1';

export default function AdminDocumentsPage() {
  const [expiring, setExpiring] = React.useState<ExpiringDoc[]>([]);
  const [employees, setEmployees] = React.useState<Employee[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [uploading, setUploading] = React.useState(false);

  React.useEffect(() => {
    Promise.all([
      apiFetch<any>('/documents/expirations?withinDays=90'),
      apiFetch<{ employees: Employee[] }>('/employees'),
    ])
      .then(([expRes, empRes]) => {
        setExpiring(Array.isArray(expRes) ? expRes : (expRes.documents ?? []));
        setEmployees(empRes.employees);
      })
      .catch(() => toast.error('Failed to load data'))
      .finally(() => setLoading(false));
  }, []);

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setUploading(true);
    try {
      const res = await fetch(`${API_BASE}/documents/upload`, {
        method: 'POST',
        body: fd,
        credentials: 'include',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? 'Upload failed');
      }
      toast.success('Document uploaded');
      (e.target as HTMLFormElement).reset();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploading(false);
    }
  };

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
        <h1 className="text-2xl font-bold tracking-tight">Documents</h1>
        <p className="text-muted-foreground">Upload documents and track expirations.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Upload className="h-4 w-4" /> Upload Document</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpload} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Employee</Label>
              <select name="employeeId" required className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                <option value="">Select employee…</option>
                {employees.map((e) => (<option key={e.id} value={e.id}>{e.fullName}</option>))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <select name="category" required className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                {CATEGORIES.map((c) => (<option key={c} value={c}>{c.replace(/_/g, ' ')}</option>))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>File</Label>
              <Input type="file" name="file" required />
            </div>
            <div className="space-y-2">
              <Label>Expiry Date</Label>
              <Input type="date" name="expiryDate" />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={uploading}>
                <Upload className="mr-2 h-4 w-4" />{uploading ? 'Uploading…' : 'Upload'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" /> Expiring Documents
            <Badge variant="secondary" className="ml-2">{expiring.length}</Badge>
          </CardTitle>
        </CardHeader>
        {expiring.length === 0 ? (
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <p className="text-sm">No documents expiring in the next 90 days.</p>
          </CardContent>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Document</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Expiry Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expiring.map((d) => {
                const daysLeft = Math.ceil((new Date(d.expiryDate).getTime() - Date.now()) / 86400000);
                return (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.employee?.fullName ?? '—'}</TableCell>
                    <TableCell>{d.originalFileName ?? 'Untitled'}</TableCell>
                    <TableCell><Badge variant="secondary">{d.category.replace(/_/g, ' ')}</Badge></TableCell>
                    <TableCell>
                      <Badge variant={daysLeft <= 30 ? 'destructive' : daysLeft <= 60 ? 'warning' : 'secondary'}>
                        {new Date(d.expiryDate).toLocaleDateString('en-AE')} ({daysLeft}d)
                      </Badge>
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
