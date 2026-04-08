'use client';

import * as React from 'react';
import { useAuth } from '@/components/auth-provider';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
import { Download, FileText } from 'lucide-react';

type Doc = {
  id: string;
  category: string;
  originalFileName: string | null;
  mimeType: string;
  sizeBytes: number;
  expiryDate: string | null;
  createdAt: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1';

export default function DocumentsPage() {
  const { state } = useAuth();
  const [docs, setDocs] = React.useState<Doc[]>([]);
  const [loading, setLoading] = React.useState(true);

  const employeeId = state.status === 'authenticated' ? state.user.employeeId : null;

  React.useEffect(() => {
    if (!employeeId) return;
    apiFetch<any>(`/documents/${employeeId}`)
      .then((res) => setDocs(Array.isArray(res) ? res : res.documents ?? []))
      .catch(() => toast.error('Failed to load documents'))
      .finally(() => setLoading(false));
  }, [employeeId]);

  const handleDownload = async (docId: string, fileName: string) => {
    if (!employeeId) return;
    try {
      const res = await fetch(`${API_BASE}/documents/${employeeId}/${docId}/download`, { credentials: 'include' });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Download failed');
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
        <h1 className="text-2xl font-bold tracking-tight">Documents</h1>
        <p className="text-muted-foreground">View and download your documents.</p>
      </div>

      <Card>
        {docs.length === 0 ? (
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <FileText className="mb-3 h-8 w-8 opacity-40" />
            <p className="text-sm">No documents uploaded yet.</p>
          </CardContent>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>File</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead>Size</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {docs.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.originalFileName ?? 'Untitled'}</TableCell>
                  <TableCell><Badge variant="secondary">{d.category.replace(/_/g, ' ')}</Badge></TableCell>
                  <TableCell>
                    {d.expiryDate ? (
                      <Badge variant={new Date(d.expiryDate) < new Date() ? 'destructive' : 'secondary'}>
                        {new Date(d.expiryDate).toLocaleDateString('en-AE')}
                      </Badge>
                    ) : '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{(d.sizeBytes / 1024).toFixed(1)} KB</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => handleDownload(d.id, d.originalFileName ?? 'download')}>
                      <Download className="h-4 w-4" />
                    </Button>
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
