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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
import {
  ArrowLeft, Download, Edit, Save, X,
  Mail, Phone, Globe, Calendar, Building2, BadgeCheck,
  CreditCard, Landmark, AlertTriangle, UserRound, FileText,
  TrendingUp, CalendarDays, ClipboardList,
} from 'lucide-react';

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
  daysUntil?: number | null;
  warningLevel?: string | null;
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
  lunches?: { startAt: string; endAt: string | null; durationMinutes: number }[];
};

const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('en-AE', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
const fmtCurrency = (v: number | string) => `AED ${Number(v).toLocaleString('en-AE', { minimumFractionDigits: 2 })}`;

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function InfoRow({ icon: Icon, label, value, children }: { icon?: React.ElementType; label: string; value?: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      {Icon && <Icon className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        {children ?? <p className="text-sm font-medium truncate">{value ?? '—'}</p>}
      </div>
    </div>
  );
}

export default function EmployeeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [emp, setEmp] = React.useState<EmployeeDetail | null>(null);
  const [docs, setDocs] = React.useState<DocRecord[]>([]);
  const [leaves, setLeaves] = React.useState<LeaveRecord[]>([]);
  const [attendance, setAttendance] = React.useState<AttendanceRecord[]>([]);
  const [leaveBalance, setLeaveBalance] = React.useState<{
    paidAccruedDays: number; paidAnnualDays: number; carryOverDays: number;
    paidUsedDays: number; emergencyUnpaidRemainingDays: number; unpaidUsedDays: number;
  } | null>(null);
  const [editing, setEditing] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState('overview');

  React.useEffect(() => {
    apiFetch<{ employee: EmployeeDetail }>(`/employees/${id}`)
      .then((r) => setEmp(r.employee))
      .catch(() => toast.error('Failed to load employee'))
      .finally(() => setLoading(false));
    apiFetch<any>(`/leave/balances/${id}`)
      .then((r) => setLeaveBalance(r))
      .catch(() => {});
  }, [id]);

  // Lazy-load tab data
  React.useEffect(() => {
    if (activeTab === 'documents' && docs.length === 0) {
      apiFetch<DocRecord[]>(`/documents/${id}`)
        .then((r) => setDocs(Array.isArray(r) ? r : []))
        .catch(() => setDocs([]));
    }
    if (activeTab === 'leave' && leaves.length === 0) {
      apiFetch<{ leaveRequests: LeaveRecord[] }>(`/leave/requests?employeeId=${id}`)
        .then((r) => setLeaves(r.leaveRequests ?? []))
        .catch(() => setLeaves([]));
    }
    if (activeTab === 'attendance' && attendance.length === 0) {
      apiFetch<{ sessions: AttendanceRecord[] }>(`/attendance/${id}/sessions?limit=50`)
        .then((r) => setAttendance(r.sessions ?? []))
        .catch(() => setAttendance([]));
    }
  }, [activeTab, id, docs.length, leaves.length, attendance.length]);

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
      salaryChangeDate: get('salaryChangeDate') || null,
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
              <div className="space-y-2"><Label>Salary Change Reason</Label><Input name="salaryChangeReason" placeholder="Reason for salary change (if any)" /></div>
              <div className="space-y-2"><Label>Effective Date</Label><Input name="salaryChangeDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} /></div>
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

  const totalComp = Number(emp.compensation?.baseSalary ?? 0) + Number(emp.compensation?.allowances ?? 0);
  const yearsAtCompany = Math.max(0, Math.round((Date.now() - new Date(emp.dateJoined).getTime()) / (365.25 * 86400000) * 10) / 10);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Avatar className="h-14 w-14 text-lg">
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">{initials(emp.fullName)}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{emp.fullName}</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{emp.jobTitle}</span>
              <span>&middot;</span>
              <span>{emp.department}</span>
              <Badge variant={emp.probationStatus === 'CONFIRMED' ? 'success' : 'warning'} className="ml-1">
                {emp.probationStatus === 'CONFIRMED' ? 'Confirmed' : 'Probation'}
              </Badge>
            </div>
          </div>
        </div>
        <Button onClick={() => setEditing(true)}>
          <Edit className="mr-2 h-4 w-4" />Edit
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold">{fmtCurrency(totalComp)}</p>
            <p className="text-xs text-muted-foreground">Monthly Package</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold">{yearsAtCompany}</p>
            <p className="text-xs text-muted-foreground">Years at Company</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold">{emp.employmentType.replace(/_/g, ' ')}</p>
            <p className="text-xs text-muted-foreground">Employment Type</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <p className="text-2xl font-bold">{fmtDate(emp.dateJoined)}</p>
            <p className="text-xs text-muted-foreground">Date Joined</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="documents">
            <FileText className="mr-1.5 h-3.5 w-3.5" />Documents
          </TabsTrigger>
          <TabsTrigger value="salary">
            <TrendingUp className="mr-1.5 h-3.5 w-3.5" />Salary
          </TabsTrigger>
          <TabsTrigger value="leave">
            <CalendarDays className="mr-1.5 h-3.5 w-3.5" />Leave
          </TabsTrigger>
          <TabsTrigger value="attendance">
            <ClipboardList className="mr-1.5 h-3.5 w-3.5" />Attendance
          </TabsTrigger>
        </TabsList>

        {/* ─── Overview Tab ─── */}
        <TabsContent value="overview">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <UserRound className="h-4 w-4" /> Personal Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-0">
                <InfoRow icon={Mail} label="Work Email" value={emp.workEmail} />
                <InfoRow icon={Mail} label="Personal Email" value={emp.personalEmail ?? '—'} />
                <InfoRow icon={Phone} label="Phone" value={emp.phone} />
                <InfoRow icon={Calendar} label="Date of Birth" value={fmtDate(emp.dateOfBirth)} />
                <InfoRow icon={Globe} label="Nationality" value={emp.nationality} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Building2 className="h-4 w-4" /> Employment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-0">
                <InfoRow icon={BadgeCheck} label="Employment Type" value={emp.employmentType.replace(/_/g, ' ')} />
                <InfoRow icon={Calendar} label="Date Joined" value={fmtDate(emp.dateJoined)} />
                <InfoRow label="Probation Status">
                  <Badge variant={emp.probationStatus === 'CONFIRMED' ? 'success' : 'warning'}>
                    {emp.probationStatus === 'CONFIRMED' ? 'Confirmed' : 'On Probation'}
                  </Badge>
                </InfoRow>
                <InfoRow icon={Calendar} label="Probation End" value={fmtDate(emp.probationEndDate)} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <CreditCard className="h-4 w-4" /> ID Documents
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-0">
                <InfoRow label="Emirates ID" value={emp.emiratesIdNumber} />
                <InfoRow label="EID Expiry" value={fmtDate(emp.emiratesIdExpiryDate)} />
                <InfoRow label="Passport" value={emp.passportNumber} />
                <InfoRow label="Passport Expiry" value={fmtDate(emp.passportExpiryDate)} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Landmark className="h-4 w-4" /> Compensation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-0">
                <InfoRow label="Base Salary" value={fmtCurrency(emp.compensation?.baseSalary ?? 0)} />
                <InfoRow label="Allowances" value={fmtCurrency(emp.compensation?.allowances ?? 0)} />
                <Separator />
                <InfoRow label="Total Package" value={fmtCurrency(totalComp)} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Landmark className="h-4 w-4" /> Bank Account
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-0">
                <InfoRow label="Bank" value={emp.bankAccount?.bankName ?? '—'} />
                <InfoRow label="Holder" value={emp.bankAccount?.accountHolderName ?? '—'} />
                <InfoRow label="IBAN" value={emp.bankAccount?.iban ?? '—'} />
                <InfoRow label="Account #" value={emp.bankAccount?.accountNumber ?? '—'} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" /> Emergency Contact
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-0">
                <InfoRow label="Name" value={emp.emergencyContact?.name ?? '—'} />
                <InfoRow label="Relation" value={emp.emergencyContact?.relation ?? '—'} />
                <InfoRow icon={Phone} label="Phone" value={emp.emergencyContact?.phone ?? '—'} />
              </CardContent>
            </Card>
          </div>

          {/* Leave Balance Card */}
          {leaveBalance && (
            <Card className="mt-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" /> Leave Balance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="text-center p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
                    <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                      {Math.max(0, (leaveBalance.paidAccruedDays + leaveBalance.paidAnnualDays + leaveBalance.carryOverDays) - leaveBalance.paidUsedDays)}
                    </p>
                    <p className="text-xs text-muted-foreground">Paid Days Left</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20">
                    <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{leaveBalance.paidUsedDays}</p>
                    <p className="text-xs text-muted-foreground">Paid Days Used</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{leaveBalance.emergencyUnpaidRemainingDays}</p>
                    <p className="text-xs text-muted-foreground">Emergency Days Left</p>
                  </div>
                </div>
                <div className="mt-3 text-xs text-muted-foreground space-y-1">
                  {emp.probationStatus === 'ON_PROBATION' && (
                    <p className="flex items-center gap-1">
                      <Badge variant="warning" className="text-[10px] py-0">Probation</Badge>
                      All leave during probation is unpaid. After 6 months: 2 emergency days/month (no carryover).
                    </p>
                  )}
                  {emp.probationStatus === 'CONFIRMED' && (
                    <p>Annual entitlement: 30 paid days per year after 1 year of service.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {emp.notes && (
            <Card className="mt-4">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">HR Notes</CardTitle></CardHeader>
              <CardContent><p className="whitespace-pre-line text-sm text-muted-foreground">{emp.notes}</p></CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ─── Documents Tab ─── */}
        <TabsContent value="documents">
          {docs.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <FileText className="mb-3 h-10 w-10 opacity-30" />
                <p className="text-sm font-medium">No documents uploaded</p>
                <p className="text-xs mt-1">Upload documents from the Documents page.</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Expiry</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {docs.map((doc) => {
                    const expiringSoon = doc.daysUntil != null && doc.daysUntil <= 30;
                    return (
                      <TableRow key={doc.id}>
                        <TableCell className="font-medium">{doc.originalFileName ?? 'Untitled'}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{doc.category.replace(/_/g, ' ')}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {(doc.sizeBytes / 1024).toFixed(0)} KB
                        </TableCell>
                        <TableCell>
                          {doc.expiryDate ? (
                            <span className={expiringSoon ? 'text-destructive font-medium' : ''}>
                              {fmtDate(doc.expiryDate)}
                              {expiringSoon && <span className="ml-1 text-xs">({doc.daysUntil}d)</span>}
                            </span>
                          ) : '—'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{fmtDate(doc.createdAt)}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => window.open(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1'}/documents/${id}/${doc.id}/download`, '_blank')}>
                            <Download className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        {/* ─── Salary History Tab ─── */}
        <TabsContent value="salary">
          {!emp.salaryHistory || emp.salaryHistory.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <TrendingUp className="mb-3 h-10 w-10 opacity-30" />
                <p className="text-sm font-medium">No salary changes recorded</p>
                <p className="text-xs mt-1">Salary changes will appear here when updated.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {emp.salaryHistory.map((entry, i) => {
                const change = Number(entry.newBaseSalary) - Number(entry.oldBaseSalary);
                const pct = Number(entry.oldBaseSalary) > 0 ? ((change / Number(entry.oldBaseSalary)) * 100).toFixed(1) : '—';
                return (
                  <Card key={entry.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-sm font-medium">{fmtDate(entry.effectiveDate)}</CardTitle>
                          {i === 0 && <Badge>Current</Badge>}
                          {i > 0 && <Badge variant="secondary">Previous</Badge>}
                        </div>
                        {change !== 0 && (
                          <Badge variant={change > 0 ? 'success' : 'destructive'}>
                            {change > 0 ? '+' : ''}{pct}%
                          </Badge>
                        )}
                      </div>
                      <CardDescription>{entry.reason}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Base Salary</p>
                          <p className="text-sm font-medium">
                            {fmtCurrency(entry.oldBaseSalary)} &rarr; {fmtCurrency(entry.newBaseSalary)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Allowances</p>
                          <p className="text-sm font-medium">
                            {fmtCurrency(entry.oldAllowances)} &rarr; {fmtCurrency(entry.newAllowances)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ─── Leave Tab ─── */}
        <TabsContent value="leave">
          {leaves.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <CalendarDays className="mb-3 h-10 w-10 opacity-30" />
                <p className="text-sm font-medium">No leave requests</p>
                <p className="text-xs mt-1">Leave requests for this employee will appear here.</p>
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
              <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <ClipboardList className="mb-3 h-10 w-10 opacity-30" />
                <p className="text-sm font-medium">No attendance records</p>
                <p className="text-xs mt-1">Clock-in records will appear here.</p>
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
                    <TableHead>Lunch</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Comment</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendance.map((ws) => (
                    <TableRow key={ws.id}>
                      <TableCell className="font-medium">{fmtDate(ws.clockInAt)}</TableCell>
                      <TableCell>{new Date(ws.clockInAt).toLocaleTimeString('en-AE', { hour: '2-digit', minute: '2-digit' })}</TableCell>
                      <TableCell>{ws.clockOutAt ? new Date(ws.clockOutAt).toLocaleTimeString('en-AE', { hour: '2-digit', minute: '2-digit' }) : '—'}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {ws.lunches?.reduce((s, l) => s + l.durationMinutes, 0) ?? 0} min
                      </TableCell>
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
