'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
import Link from 'next/link';
import { Users, CalendarDays, FileText, Banknote, ArrowRight, Clock } from 'lucide-react';

type Employee = { id: string; fullName: string; department: string; probationStatus: string };
type LeaveRequest = { id: string; type: string; status: string; startDate: string; endDate: string; employee?: { fullName: string } };

export default function AdminDashboard() {
  const [employees, setEmployees] = React.useState<Employee[]>([]);
  const [pendingLeaves, setPendingLeaves] = React.useState<LeaveRequest[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    Promise.all([
      apiFetch<{ employees: Employee[] }>('/employees'),
      apiFetch<{ leaveRequests: LeaveRequest[] }>('/leave/requests?status=PENDING'),
    ])
      .then(([empRes, leaveRes]) => {
        setEmployees(empRes.employees);
        setPendingLeaves(leaveRes.leaveRequests);
      })
      .catch(() => toast.error('Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const onProbation = employees.filter((e) => e.probationStatus === 'ON_PROBATION').length;

  const quickLinks = [
    { href: '/app/admin/employees', label: 'Employees', icon: Users, desc: 'Manage team members', color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' },
    { href: '/app/admin/leave', label: 'Leave', icon: CalendarDays, desc: 'Review requests', color: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' },
    { href: '/app/admin/documents', label: 'Documents', icon: FileText, desc: 'Expiry tracking', color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' },
    { href: '/app/admin/payroll', label: 'Payroll', icon: Banknote, desc: 'Monthly runs', color: 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your team and pending actions.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{employees.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">On Probation</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{onProbation}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Leave</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{pendingLeaves.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {quickLinks.map((link) => (
          <Link key={link.href} href={link.href}>
            <Card className="group cursor-pointer transition-all hover:shadow-md hover:border-primary/30">
              <CardContent className="flex items-center gap-4 pt-6">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${link.color}`}>
                  <link.icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold">{link.label}</div>
                  <div className="text-xs text-muted-foreground">{link.desc}</div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {pendingLeaves.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Pending Leave Requests</CardTitle>
              <Link href="/app/admin/leave" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                View all &rarr;
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingLeaves.slice(0, 5).map((l) => (
                <div key={l.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{l.employee?.fullName ?? 'Unknown'}</span>
                    <Badge variant="secondary">{l.type.replace(/_/g, ' ')}</Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(l.startDate).toLocaleDateString('en-AE')} – {new Date(l.endDate).toLocaleDateString('en-AE')}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
