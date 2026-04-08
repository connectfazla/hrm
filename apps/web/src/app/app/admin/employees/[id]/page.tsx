'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
import { ArrowLeft, Download, Edit, Save, X } from 'lucide-react';

type EmployeeDetail = {
  id: string;
  fullName: string;
  jobTitle: string;
  department: string;
  dateOfBirth: string;
  nationality: string;
  personalEmail: string | null;
  workEmail: string;
  phone: string;
  emiratesIdNumber: string;
  emiratesIdExpiryDate: string;
  passportNumber: string;
  passportExpiryDate: string;
  dateJoined: string;
  employmentType: string;
  probationStatus: string;
  probationEndDate: string;
  notes: string | null;
  compensation?: { baseSalary: number | string; allowances: number | string };
  bankAccount?: { bankName: string; accountHolderName: string; iban: string | null; accountNumber: string | null };
  emergencyContact?: { name: string; relation: string; phone: string };
  salaryHistory?: Array<{
    id: string;
    effectiveDate: string;
    oldBaseSalary: number;
    newBaseSalary: number;
    oldAllowances: number;
    newAllowances: number;
    reason: string;
  }>;
};

type DocRecord = {
  id: string;
  category: string;
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
  expiryDate: string | null;
  createdAt: string;
};

type LeaveRecord = {
  id: string;
  type: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: string;
};

type AttendanceRecord = {
  id: string;
  clockInAt: string;
  clockOutAt: string | null;
  late: boolean;
  lateByMinutes: number;
  workComment: string | null;
};

function InfoRow({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      {children ?? <span className="text-sm font-medium">{value ?? '—'}</span>}
    </div>
  );
}

const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('en-AE') : '—';
const fmtCurrency = (v: number | string) => `AED ${Number(v).toLocaleString('en-AE', { minimumFractionDigits: 2 })}`;

export default function EmployeeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [emp, setEmp] = React.useState<EmployeeDetail | null>(null);
  const [docs, setDocs] = React.useState<DocRecord[]>([]);
  const [leaves, setLeaves] = React.useState<LeaveRecord[]>([]);
  const [attendance, setAttendance] = React.useState<AttendanceRecord[]>([]);
  const [editing, setEditing] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    Promise.all([
      apiFetch<{ employee: EmployeeDetail }>(`/employees/${id}`).then((r) => setEmp(r.employee)),
      apiFetch<{ documents: DocRecord[] }>(`/documents/${id}`).then((r) => setDocs(r.documents)).catch(() => setDocs([])),
      apiFetch<{ leaveRequests: LeaveRecord[] }>(`/leave/requests?employeeId=${id}`).then((r) => setLeaves(r.leaveRequests)).catch(() => setLeaves([])),
      apiFetch<{ sessions: AttendanceRecord[] }>(`/attendance/timesheet/${id}?from=2024-01-01&to=2030-12-31`).then((r) => setAttendance(r.sessions)).catch(() => setAttendance([])),
    ])
      .catch(() => toast.error('Failed to load employee'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const get = (k: string) => fd.get(k)?.toString() ?? '';

    const payload: Record<string, unknown> = {
      fullName: get('fullName'),
      jobTitle: get('jobTitle'),
      department: get('department'),
      phone: get('phone'),
      nationality: get('nationality'),
      employmentType: get('employmentType'),
      notes: get('notes') || null,
      baseSalary: Number(get('baseSalary')),
      allowances: Number(get('allowances')),
      salaryChangeReason: get('salaryChangeReason') || null,
      bankAccount: {
        bankName: get('bankName'),
        accountHolderName: get('accountHolderName'),
        iban: get('iban') || null,
        accountNumber: get('accountNumber') || null,
      },
      emergencyContact: {
        name: get('emergencyName'),
        relation: get('emergencyRelation'),
        phone: get('emergencyPhone'),
      },
    };

    setSaving(true);
    try {
      const res = await apiFetch<{ employee: EmployeeDetail }>(`/employees/${id}`, { method: 'PUT', json: payload });
      setEmp(res.employee);
      setEditing(false);
      toast.success('Employee updated');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }
  if (!emp) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <p>Employee not found.</p>
        <Button variant="ghost" size="sm" className="mt-2" onClick={() => router.back()}>Go back</Button>
      </div>
    );
  }

  if (editing) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Edit {emp.fullName}</h1>
            <p className="text-muted-foreground">Update employee details</p>
          </div>
          <Button variant="ghost" onClick={() => setEditing(false)}>
            <X className="mr-2 h-4 w-4" />Cancel
          </Button>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Basic Info</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label>Full Name</Label><Input name="fullName" defaultValue={emp.fullName} required /></div>
              <div className="space-y-2"><Label>Job Title</Label><Input name="jobTitle" defaultValue={emp.jobTitle} required /></div>
              <div className="space-y-2"><Label>Department</Label><Input name="department" defaultValue={emp.department} required /></div>
              <div className="space-y-2"><Label>Phone</Label><Input name="phone" defaultValue={emp.phone} required /></div>
              <div className="space-y-2"><Label>Nationality</Label><Input name="nationality" defaultValue={emp.nationality} required /></div>
              <div className="space-y-2">
                <Label>Employment Type</Label>
                <select name="employmentType" defaultValue={emp.employmentType} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                  <option value="FULL_TIME">Full Time</option>
                  <option value="PART_TIME">Part Time</option>
                  <option value="CONTRACT">Contract</option>
                </select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Compensation (AED)</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label>Base Salary</Label><Input name="baseSalary" type="number" step="0.01" defaultValue={Number(emp.compensation?.baseSalary ?? 0)} /></div>
              <div className="space-y-2"><Label>Allowances</Label><Input name="allowances" type="number" step="0.01" defaultValue={Number(emp.compensation?.allowances ?? 0)} /></div>
              <div className="space-y-2 sm:col-span-2"><Label>Salary Change Reason</Label><Input name="salaryChangeReason" placeholder="Reason for salary change (if any)" /></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Bank Account</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label>Bank Name</Label><Input name="bankName" defaultValue={emp.bankAccount?.bankName ?? ''} /></div>
              <div className="space-y-2"><Label>Account Holder</Label><Input name="accountHolderName" defaultValue={emp.bankAccount?.accountHolderName ?? ''} /></div>
              <div className="space-y-2"><Label>IBAN</Label><Input name="iban" defaultValue={emp.bankAccount?.iban ?? ''} /></div>
              <div className="space-y-2"><Label>Account Number</Label><Input name="accountNumber" defaultValue={emp.bankAccount?.accountNumber ?? ''} /></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Emergency Contact</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2"><Label>Name</Label><Input name="emergencyName" defaultValue={emp.emergencyContact?.name ?? ''} /></div>
              <div className="space-y-2"><Label>Relation</Label><Input name="emergencyRelation" defaultValue={emp.emergencyContact?.relation ?? ''} /></div>
              <div className="space-y-2"><Label>Phone</Label><Input name="emergencyPhone" defaultValue={emp.emergencyContact?.phone ?? ''} /></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">HR Notes</CardTitle></CardHeader>
            <CardContent>
              <Textarea name="notes" defaultValue={emp.notes ?? ''} placeholder="HR notes (visible to admins only)…" />
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button type="submit" disabled={saving}>
              <Save className="mr-2 h-4 w-4" />{saving ? 'Saving…' : 'Save Changes'}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        </form>
      </div>
    );
  }

  const statusColor = (s: string) => {
    if (s === 'APPROVED') return 'success' as const;
    if (s === 'REJECTED') return 'destructive' as const;
    return 'warning' as const;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{emp.fullName}</h1>
            <p className="text-muted-foreground">{emp.jobTitle} &middot; {emp.department}</p>
          </div>
        </div>
        <Button onClick={() => setEditing(true)}>
          <Edit className="mr-2 h-4 w-4" />Edit
        </Button>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="salary">Salary History</TabsTrigger>
          <TabsTrigger value="leave">Leave</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
        </TabsList>

        {/* ─── Overview Tab ─── */}
        <TabsContent value="overview">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm font-medium">Personal Info</CardTitle></CardHeader>
              <CardContent className="space-y-0 divide-y divide-border">
                <InfoRow label="Work Email" value={emp.workEmail} />
                <InfoRow label="Personal Email" value={emp.personalEmail ?? '—'} />
                <InfoRow label="Phone" value={emp.phone} />
                <InfoRow label="Date of Birth" value={fmtDate(emp.dateOfBirth)} />
                <InfoRow label="Nationality" value={emp.nationality} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm font-medium">Employment</CardTitle></CardHeader>
              <CardContent className="space-y-0 divide-y divide-border">
                <InfoRow label="Type" value={emp.employmentType.replace(/_/g, ' ')} />
                <InfoRow label="Date Joined" value={fmtDate(emp.dateJoined)} />
                <InfoRow label="Probation">
                  <Badge variant={emp.probationStatus === 'CONFIRMED' ? 'success' : 'warning'}>
                    {emp.probationStatus === 'CONFIRMED' ? 'Confirmed' : 'On Probation'}
                  </Badge>
                </InfoRow>
                <InfoRow label="Probation End" value={fmtDate(emp.probationEndDate)} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm font-medium">ID Documents</CardTitle></CardHeader>
              <CardContent className="space-y-0 divide-y divide-border">
                <InfoRow label="Emirates ID" value={emp.emiratesIdNumber} />
                <InfoRow label="EID Expiry" value={fmtDate(emp.emiratesIdExpiryDate)} />
                <InfoRow label="Passport" value={emp.passportNumber} />
                <InfoRow label="Passport Expiry" value={fmtDate(emp.passportExpiryDate)} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm font-medium">Compensation</CardTitle></CardHeader>
              <CardContent className="space-y-0 divide-y divide-border">
                <InfoRow label="Base Salary" value={fmtCurrency(emp.compensation?.baseSalary ?? 0)} />
                <InfoRow label="Allowances" value={fmtCurrency(emp.compensation?.allowances ?? 0)} />
                <InfoRow label="Total" value={fmtCurrency(Number(emp.compensation?.baseSalary ?? 0) + Number(emp.compensation?.allowances ?? 0))} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm font-medium">Bank Account</CardTitle></CardHeader>
              <CardContent className="space-y-0 divide-y divide-border">
                <InfoRow label="Bank" value={emp.bankAccount?.bankName ?? '—'} />
                <InfoRow label="Holder" value={emp.bankAccount?.accountHolderName ?? '—'} />
                <InfoRow label="IBAN" value={emp.bankAccount?.iban ?? '—'} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm font-medium">Emergency Contact</CardTitle></CardHeader>
              <CardContent className="space-y-0 divide-y divide-border">
                <InfoRow label="Name" value={emp.emergencyContact?.name ?? '—'} />
                <InfoRow label="Relation" value={emp.emergencyContact?.relation ?? '—'} />
                <InfoRow label="Phone" value={emp.emergencyContact?.phone ?? '—'} />
              </CardContent>
            </Card>
          </div>

          {emp.notes && (
            <Card className="mt-4">
              <CardHeader className="pb-3"><CardTitle className="text-sm font-medium">HR Notes</CardTitle></CardHeader>
              <CardContent><p className="whitespace-pre-line text-sm text-muted-foreground">{emp.notes}</p></CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ─── Documents Tab ─── */}
        <TabsContent value="documents">
          {docs.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <p className="text-sm">No documents uploaded for this employee.</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Expiry</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {docs.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium">{doc.originalFileName ?? 'Untitled'}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{doc.category.replace(/_/g, ' ')}</Badge>
                      </TableCell>
                      <TableCell>
                        {doc.expiryDate ? (
                          <span className={new Date(doc.expiryDate) < new Date(Date.now() + 30 * 86400000) ? 'text-destructive font-medium' : ''}>
                            {fmtDate(doc.expiryDate)}
                          </span>
                        ) : '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{fmtDate(doc.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => window.open(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1'}/documents/${doc.id}/download`, '_blank')}>
                          <Download className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        {/* ─── Salary History Tab ─── */}
        <TabsContent value="salary">
          {!emp.salaryHistory || emp.salaryHistory.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <p className="text-sm">No salary changes recorded.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {emp.salaryHistory.map((entry, i) => (
                <Card key={entry.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium">{fmtDate(entry.effectiveDate)}</CardTitle>
                      <Badge variant={i === 0 ? 'default' : 'secondary'}>{i === 0 ? 'Current' : 'Previous'}</Badge>
                    </div>
                    <CardDescription>{entry.reason}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Base Salary</p>
                        <p className="text-sm font-medium">
                          {fmtCurrency(entry.oldBaseSalary)} &rarr; {fmtCurrency(entry.newBaseSalary)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Allowances</p>
                        <p className="text-sm font-medium">
                          {fmtCurrency(entry.oldAllowances)} &rarr; {fmtCurrency(entry.newAllowances)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ─── Leave Tab ─── */}
        <TabsContent value="leave">
          {leaves.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <p className="text-sm">No leave requests found.</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Start</TableHead>
                    <TableHead>End</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaves.map((lr) => (
                    <TableRow key={lr.id}>
                      <TableCell className="font-medium">{lr.type.replace(/_/g, ' ')}</TableCell>
                      <TableCell>{fmtDate(lr.startDate)}</TableCell>
                      <TableCell>{fmtDate(lr.endDate)}</TableCell>
                      <TableCell className="max-w-[200px] truncate text-muted-foreground">{lr.reason}</TableCell>
                      <TableCell><Badge variant={statusColor(lr.status)}>{lr.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        {/* ─── Attendance Tab ─── */}
        <TabsContent value="attendance">
          {attendance.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <p className="text-sm">No attendance records found.</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Clock In</TableHead>
                    <TableHead>Clock Out</TableHead>
                    <TableHead>Late</TableHead>
                    <TableHead>Comment</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendance.slice(0, 30).map((ws) => (
                    <TableRow key={ws.id}>
                      <TableCell className="font-medium">{fmtDate(ws.clockInAt)}</TableCell>
                      <TableCell>{new Date(ws.clockInAt).toLocaleTimeString('en-AE', { hour: '2-digit', minute: '2-digit' })}</TableCell>
                      <TableCell>{ws.clockOutAt ? new Date(ws.clockOutAt).toLocaleTimeString('en-AE', { hour: '2-digit', minute: '2-digit' }) : '—'}</TableCell>
                      <TableCell>
                        {ws.late ? (
                          <Badge variant="destructive">{ws.lateByMinutes}m late</Badge>
                        ) : (
                          <Badge variant="success">On time</Badge>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-muted-foreground">{ws.workComment ?? '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
