'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
import { Copy, Key, ExternalLink, Trash2 } from 'lucide-react';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

type Endpoint = {
  method: HttpMethod;
  path: string;
  description: string;
  auth: string;
};

type Category = { name: string; endpoints: Endpoint[] };

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1';

const CATEGORIES: Category[] = [
  {
    name: 'Auth',
    endpoints: [
      { method: 'POST', path: '/auth/login', description: 'Sign in with email and password.', auth: 'Public' },
      {
        method: 'POST',
        path: '/auth/register',
        description:
          'Self-register: send the same HR fields as POST /employees (full profile, compensation, bank, emergency contact) plus registrationCode and password (min 8). Code REGISTRATION_CODE_EMPLOYEE (default upp) → EMPLOYEE; REGISTRATION_CODE_ADMIN (default darkk) → ADMIN. Work email must be unique. Sets session cookies on success.',
        auth: 'Public',
      },
      {
        method: 'POST',
        path: '/auth/refresh',
        description:
          'Session restore: returns { user } when refresh cookie is valid (rotates tokens); returns 200 with { user: null } when there is no or invalid refresh cookie (no error status for anonymous browsers).',
        auth: 'Refresh cookie',
      },
      { method: 'POST', path: '/auth/logout', description: 'Invalidate session and clear auth cookies.', auth: 'Authenticated' },
      { method: 'POST', path: '/auth/forgot-password', description: 'Request a password reset email.', auth: 'Public' },
      { method: 'POST', path: '/auth/reset-password', description: 'Complete password reset with token.', auth: 'Public' },
      { method: 'GET', path: '/auth/me', description: 'Return the current user profile.', auth: 'Authenticated' },
      { method: 'PUT', path: '/auth/profile', description: 'Update the current user profile.', auth: 'Authenticated' },
    ],
  },
  {
    name: 'Employees',
    endpoints: [
      { method: 'GET', path: '/employees', description: 'List employees with optional filters.', auth: 'Authenticated' },
      { method: 'GET', path: '/employees/:id', description: 'Get a single employee by ID.', auth: 'Authenticated' },
      { method: 'POST', path: '/employees', description: 'Create an employee record.', auth: 'Admin / HR' },
      { method: 'PUT', path: '/employees/:id', description: 'Update an employee by ID.', auth: 'Admin / HR' },
      { method: 'PUT', path: '/employees/:id/role', description: 'Set linked user role (ADMIN or EMPLOYEE).', auth: 'Admin / HR' },
      { method: 'POST', path: '/employees/:id/archive', description: 'Archive employee: revoke sessions, block login, retain HR data.', auth: 'Admin / HR' },
      { method: 'POST', path: '/employees/:id/unarchive', description: 'Allow an archived employee to sign in again.', auth: 'Admin / HR' },
      { method: 'DELETE', path: '/employees/:id', description: 'Permanently delete employee, user account, and related data.', auth: 'Admin / HR' },
    ],
  },
  {
    name: 'Attendance',
    endpoints: [
      { method: 'POST', path: '/attendance/clock-in', description: 'Start a work session.', auth: 'Authenticated' },
      { method: 'POST', path: '/attendance/clock-out', description: 'End the current work session.', auth: 'Authenticated' },
      { method: 'POST', path: '/attendance/lunch-start', description: 'Mark lunch break start.', auth: 'Authenticated' },
      { method: 'POST', path: '/attendance/lunch-end', description: 'Mark lunch break end.', auth: 'Authenticated' },
      { method: 'GET', path: '/attendance/:employeeId/sessions', description: 'List attendance sessions for an employee.', auth: 'Authenticated' },
      { method: 'GET', path: '/attendance/:employeeId/export', description: 'Export attendance for an employee.', auth: 'Admin / HR' },
    ],
  },
  {
    name: 'Leave',
    endpoints: [
      { method: 'POST', path: '/leave/request', description: 'Submit a leave request.', auth: 'Authenticated' },
      { method: 'GET', path: '/leave/requests', description: 'List leave requests (scoped by role).', auth: 'Authenticated' },
      { method: 'PUT', path: '/leave/request/:id/approve', description: 'Approve a leave request.', auth: 'Admin / HR' },
      { method: 'PUT', path: '/leave/request/:id/reject', description: 'Reject a leave request.', auth: 'Admin / HR' },
      { method: 'GET', path: '/leave/balances/:employeeId', description: 'Get leave balances for an employee.', auth: 'Authenticated' },
    ],
  },
  {
    name: 'Payroll',
    endpoints: [
      { method: 'GET', path: '/payroll/runs', description: 'List payroll runs.', auth: 'Admin / HR' },
      { method: 'POST', path: '/payroll/:month/run', description: 'Trigger a payroll run for a month.', auth: 'Admin / HR' },
      { method: 'GET', path: '/payroll/employee/:id/payslips', description: 'List payslips for an employee.', auth: 'Authenticated' },
      { method: 'GET', path: '/payroll/:employeeId/:month', description: 'Get payroll detail for employee and month.', auth: 'Admin / HR' },
      { method: 'GET', path: '/payroll/export', description: 'Export payroll data.', auth: 'Admin / HR' },
    ],
  },
  {
    name: 'Documents',
    endpoints: [
      { method: 'GET', path: '/documents/expirations', description: 'Documents nearing or past expiry.', auth: 'Admin / HR' },
      { method: 'POST', path: '/documents/upload', description: 'Upload a document (multipart).', auth: 'Authenticated' },
      { method: 'GET', path: '/documents/:employeeId', description: 'List documents for an employee.', auth: 'Authenticated' },
      { method: 'DELETE', path: '/documents/:id', description: 'Delete a document by ID.', auth: 'Admin / HR' },
    ],
  },
  {
    name: 'Settings',
    endpoints: [
      { method: 'GET', path: '/settings', description: 'Get application settings.', auth: 'Admin' },
      { method: 'PUT', path: '/settings/:key', description: 'Update a setting value by key.', auth: 'Admin' },
      { method: 'POST', path: '/settings/smtp/test', description: 'Send a test email via SMTP config.', auth: 'Admin' },
      { method: 'GET', path: '/settings/nuke-app/backup', description: 'Download JSON snapshot of all application tables.', auth: 'Admin' },
      {
        method: 'POST',
        path: '/settings/nuke-app/execute',
        description: 'Wipe all application data (requires password + confirmation phrase DELETE ALL DATA).',
        auth: 'Admin',
      },
    ],
  },
  {
    name: 'Reports',
    endpoints: [
      { method: 'GET', path: '/reports/summary', description: 'High-level HR summary metrics.', auth: 'Admin / HR' },
      { method: 'GET', path: '/reports/attendance', description: 'Attendance aggregates and trends.', auth: 'Admin / HR' },
    ],
  },
  {
    name: 'Notifications',
    endpoints: [
      { method: 'GET', path: '/notifications', description: 'List notifications for the current user.', auth: 'Authenticated' },
      { method: 'PUT', path: '/notifications/:id/read', description: 'Mark a notification as read.', auth: 'Authenticated' },
    ],
  },
];

function methodBadgeClass(method: HttpMethod): string {
  switch (method) {
    case 'GET':
      return 'bg-blue-100 text-blue-800 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300';
    case 'POST':
      return 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300';
    case 'PUT':
      return 'bg-amber-100 text-amber-900 hover:bg-amber-100 dark:bg-amber-950 dark:text-amber-200';
    case 'DELETE':
      return 'bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-950 dark:text-red-300';
    default:
      return '';
  }
}

function buildCurl(method: HttpMethod, path: string): string {
  const base = API_BASE_URL.replace(/\/$/, '');
  const url = `${base}${path}`;
  const cookie = '-H "Cookie: accessToken=YOUR_TOKEN"';
  if (method === 'GET' || method === 'DELETE') {
    return `curl -X ${method} ${url} ${cookie}`;
  }
  return `curl -X ${method} ${url} ${cookie} -H "Content-Type: application/json" -d '{}'`;
}

function EndpointRow({
  ep,
  onCopy,
}: {
  ep: Endpoint;
  onCopy: (cmd: string) => void;
}) {
  const cmd = buildCurl(ep.method, ep.path);
  return (
    <tr className="border-b border-border/60 last:border-0">
      <td className="py-3 pr-3 align-top">
        <div className="flex items-center gap-1.5">
          {ep.method === 'DELETE' ? <Trash2 className="h-3.5 w-3.5 text-red-600 dark:text-red-400" aria-hidden /> : null}
          <Badge variant="secondary" className={`shrink-0 font-mono text-[10px] uppercase ${methodBadgeClass(ep.method)}`}>
            {ep.method}
          </Badge>
        </div>
      </td>
      <td className="py-3 pr-3 align-top font-mono text-sm">{ep.path}</td>
      <td className="py-3 pr-3 align-top text-sm text-muted-foreground">{ep.description}</td>
      <td className="py-3 pr-3 align-top text-sm">{ep.auth}</td>
      <td className="py-3 align-top text-right">
        <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => onCopy(cmd)}>
          <Copy className="h-3.5 w-3.5" />
          Copy cURL
        </Button>
      </td>
    </tr>
  );
}

export default function AdminApiDocsPage() {
  const [query, setQuery] = React.useState('');
  const [verifying, setVerifying] = React.useState(false);

  const swaggerUrl = '/api/docs';

  const filteredCategories = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CATEGORIES;
    return CATEGORIES.map((cat) => ({
      ...cat,
      endpoints: cat.endpoints.filter(
        (e) =>
          e.path.toLowerCase().includes(q) ||
          e.method.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q) ||
          e.auth.toLowerCase().includes(q) ||
          cat.name.toLowerCase().includes(q),
      ),
    })).filter((c) => c.endpoints.length > 0);
  }, [query]);

  const copyCurl = React.useCallback((cmd: string) => {
    void navigator.clipboard.writeText(cmd).then(
      () => toast.success('cURL copied to clipboard'),
      () => toast.error('Could not copy'),
    );
  }, []);

  const verifySession = React.useCallback(() => {
    setVerifying(true);
    apiFetch<unknown>('/auth/me')
      .then(() => toast.success('Session OK — /auth/me succeeded'))
      .catch((e: Error) => toast.error(e.message || 'Request failed'))
      .finally(() => setVerifying(false));
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">API documentation</h1>
        <p className="text-muted-foreground">Reference for REST endpoints used by this application.</p>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Key className="h-5 w-5 text-muted-foreground" aria-hidden />
              <CardTitle className="text-lg">Interactive docs</CardTitle>
            </div>
            <CardDescription>
              Open Swagger UI for try-it-out requests, schemas, and response examples.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" disabled={verifying} onClick={verifySession}>
              {verifying ? 'Checking…' : 'Verify session'}
            </Button>
            <Button variant="default" size="sm" className="gap-2" asChild>
              <a href={swaggerUrl} target="_blank" rel="noopener noreferrer">
                Open Swagger
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm">
            <p className="font-medium text-foreground">Base URL</p>
            <p className="mt-1 font-mono text-muted-foreground break-all">{API_BASE_URL}</p>
            <p className="mt-2 text-muted-foreground">
              All paths below are relative to this base (equivalent to prefix <span className="font-mono text-foreground">/api/v1</span> on the API host).
            </p>
          </div>
          <div className="max-w-md">
            <label htmlFor="api-docs-filter" className="sr-only">
              Filter endpoints
            </label>
            <Input
              id="api-docs-filter"
              placeholder="Filter by path, method, description, or category…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        {filteredCategories.map((cat) => (
          <Card key={cat.name}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{cat.name}</CardTitle>
              <CardDescription>{cat.endpoints.length} endpoint{cat.endpoints.length === 1 ? '' : 's'}</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto pt-0">
              <table className="w-full min-w-[640px] border-collapse text-left">
                <thead>
                  <tr className="border-b text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <th className="pb-2 pr-3">Method</th>
                    <th className="pb-2 pr-3">Path</th>
                    <th className="pb-2 pr-3">Description</th>
                    <th className="pb-2 pr-3">Auth</th>
                    <th className="pb-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {cat.endpoints.map((ep) => (
                    <EndpointRow key={`${ep.method}-${ep.path}`} ep={ep} onCopy={copyCurl} />
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredCategories.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground">No endpoints match your filter.</p>
      ) : null}
    </div>
  );
}
