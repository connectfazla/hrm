'use client';

import * as React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
import { filterOutLegacyDemoEmployees } from '@/lib/legacy-demo-employees';
import Link from 'next/link';
import { Plus, Search } from 'lucide-react';

type Employee = {
  id: string;
  fullName: string;
  jobTitle: string;
  department: string;
  workEmail: string;
  phone: string;
  employmentType: string;
  probationStatus: string;
  dateJoined: string;
  archivedAt?: string | null;
};

export default function EmployeesPage() {
  const [employees, setEmployees] = React.useState<Employee[]>([]);
  const [search, setSearch] = React.useState('');
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    apiFetch<{ employees: Employee[] }>('/employees')
      .then((res) => setEmployees(filterOutLegacyDemoEmployees(res.employees ?? [])))
      .catch(() => toast.error('Failed to load employees'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = employees.filter(
    (e) =>
      e.fullName.toLowerCase().includes(search.toLowerCase()) ||
      e.department.toLowerCase().includes(search.toLowerCase()) ||
      e.jobTitle.toLowerCase().includes(search.toLowerCase()),
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Employees</h1>
          <p className="text-muted-foreground">{employees.length} team members</p>
        </div>
        <Button asChild>
          <Link href="/app/admin/employees/new">
            <Plus className="mr-2 h-4 w-4" /> Add Employee
          </Link>
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name, department, or title…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>Contact</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((e) => {
              const initials = e.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2);
              return (
                <TableRow key={e.id}>
                  <TableCell>
                    <Link href={`/app/admin/employees/${e.id}`} className="flex items-center gap-3 group">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium group-hover:underline">{e.fullName}</span>
                          {e.archivedAt && (
                            <Badge variant="secondary" className="text-[10px] font-normal border-amber-300 bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
                              Archived
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">{e.jobTitle}</div>
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell>{e.department}</TableCell>
                  <TableCell>
                    <Badge variant={e.probationStatus === 'CONFIRMED' ? 'success' : 'warning'}>
                      {e.probationStatus === 'CONFIRMED' ? 'Confirmed' : 'Probation'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(e.dateJoined).toLocaleDateString('en-AE')}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{e.workEmail}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <p className="text-sm">No employees match your search.</p>
          </div>
        )}
      </Card>
    </div>
  );
}
