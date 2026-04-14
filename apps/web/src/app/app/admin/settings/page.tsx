'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Settings, User, Building2, Mail, FileText, Save, TestTube, Key, Shield, Users, Copy, Trash2, Upload, Image } from 'lucide-react';

type TabId = 'profile' | 'company' | 'smtp' | 'templates' | 'api-keys' | 'users';

type Profile = {
  userId: string;
  email: string;
  role: string;
  fullName: string | null;
};

type SmtpForm = {
  host: string;
  port: string;
  username: string;
  password: string;
  tls: boolean;
};

type TemplateEntry = { subject: string; body: string };

const TEMPLATE_DEFS = [
  { id: 'leave_approved', label: 'Leave Approved' },
  { id: 'leave_rejected', label: 'Leave Rejected' },
  { id: 'salary_changed', label: 'Salary Changed' },
  { id: 'document_expiry', label: 'Document Expiry Warning' },
  { id: 'welcome_employee', label: 'Welcome Employee' },
] as const;

const ALL_PLACEHOLDERS =
  '{{employee_name}}, {{leave_type}}, {{start_date}}, {{end_date}}, {{salary_amount}}, {{document_name}}, {{expiry_date}}';

function placeholdersForTemplate(id: string): string {
  switch (id) {
    case 'leave_approved':
    case 'leave_rejected':
      return '{{employee_name}}, {{leave_type}}, {{start_date}}, {{end_date}}';
    case 'salary_changed':
      return '{{employee_name}}, {{salary_amount}}';
    case 'document_expiry':
      return '{{employee_name}}, {{document_name}}, {{expiry_date}}';
    case 'welcome_employee':
      return '{{employee_name}}';
    default:
      return ALL_PLACEHOLDERS;
  }
}

function emptyTemplates(): Record<string, TemplateEntry> {
  return Object.fromEntries(TEMPLATE_DEFS.map((t) => [t.id, { subject: '', body: '' }])) as Record<
    string,
    TemplateEntry
  >;
}

function parseTemplates(raw: unknown): Record<string, TemplateEntry> {
  const base = emptyTemplates();
  if (!raw || typeof raw !== 'object') return base;
  const o = raw as Record<string, unknown>;
  for (const t of TEMPLATE_DEFS) {
    const v = o[t.id];
    if (v && typeof v === 'object' && v !== null) {
      const e = v as Record<string, unknown>;
      base[t.id] = {
        subject: typeof e.subject === 'string' ? e.subject : '',
        body: typeof e.body === 'string' ? e.body : '',
      };
    }
  }
  return base;
}

function parseSmtp(raw: unknown): SmtpForm {
  if (!raw || typeof raw !== 'object') {
    return { host: '', port: '587', username: '', password: '', tls: true };
  }
  const o = raw as Record<string, unknown>;
  return {
    host: typeof o.host === 'string' ? o.host : '',
    port: String(o.port ?? '587'),
    username: typeof o.username === 'string' ? o.username : typeof o.user === 'string' ? o.user : '',
    password: typeof o.password === 'string' ? o.password : typeof o.pass === 'string' ? o.pass : '',
    tls: typeof o.tls === 'boolean' ? o.tls : true,
  };
}

type ApiKeyRow = { id: string; name: string; keyPrefix: string; permissions: string[]; lastUsedAt: string | null; createdAt: string };
type EmployeeUser = { id: string; fullName: string; department: string; userId?: string; role?: string };

const tabs: { id: TabId; label: string; icon: typeof Settings }[] = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'company', label: 'Company', icon: Building2 },
  { id: 'smtp', label: 'SMTP', icon: Mail },
  { id: 'templates', label: 'Email Templates', icon: FileText },
  { id: 'api-keys', label: 'API Keys', icon: Key },
  { id: 'users', label: 'User Roles', icon: Shield },
];

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = React.useState<TabId>('profile');

  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = React.useState(true);
  const [profileSaving, setProfileSaving] = React.useState(false);
  const [fullName, setFullName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');

  const [settingsLoading, setSettingsLoading] = React.useState(false);
  const [settingsLoaded, setSettingsLoaded] = React.useState(false);

  const [companyName, setCompanyName] = React.useState('');
  const [timezone, setTimezone] = React.useState('');
  const [currency, setCurrency] = React.useState('AED');
  const [workdayStart, setWorkdayStart] = React.useState('09:00');
  const [lateGraceMinutes, setLateGraceMinutes] = React.useState('15');
  const [companySaving, setCompanySaving] = React.useState(false);
  const [companyLogo, setCompanyLogo] = React.useState<string | null>(null);
  const [logoUploading, setLogoUploading] = React.useState(false);
  const logoInputRef = React.useRef<HTMLInputElement>(null);

  const [smtp, setSmtp] = React.useState<SmtpForm>(parseSmtp(null));
  const [smtpSaving, setSmtpSaving] = React.useState(false);
  const [smtpTesting, setSmtpTesting] = React.useState(false);

  const [templates, setTemplates] = React.useState<Record<string, TemplateEntry>>(emptyTemplates());
  const [templatesSaving, setTemplatesSaving] = React.useState(false);

  const [apiKeys, setApiKeys] = React.useState<ApiKeyRow[]>([]);
  const [apiKeysLoading, setApiKeysLoading] = React.useState(false);
  const [apiKeysLoaded, setApiKeysLoaded] = React.useState(false);
  const [newKeyName, setNewKeyName] = React.useState('');
  const [newKeyPerms, setNewKeyPerms] = React.useState<string[]>(['read']);
  const [creatingKey, setCreatingKey] = React.useState(false);
  const [revealedSecret, setRevealedSecret] = React.useState<string | null>(null);

  const [employeeUsers, setEmployeeUsers] = React.useState<EmployeeUser[]>([]);
  const [usersLoading, setUsersLoading] = React.useState(false);
  const [usersLoaded, setUsersLoaded] = React.useState(false);
  const [roleChanging, setRoleChanging] = React.useState<string | null>(null);
  const [demoBusy, setDemoBusy] = React.useState<null | 'add' | 'delete'>(null);
  const [demoConfirmOpen, setDemoConfirmOpen] = React.useState(false);

  const needsSettings = activeTab === 'company' || activeTab === 'smtp' || activeTab === 'templates';

  React.useEffect(() => {
    let cancelled = false;
    setProfileLoading(true);
    apiFetch<{ profile: Profile }>('/auth/me')
      .then((res) => {
        if (cancelled) return;
        setProfile(res.profile);
        setFullName(res.profile.fullName ?? '');
        setEmail(res.profile.email);
      })
      .catch(() => toast.error('Failed to load profile'))
      .finally(() => {
        if (!cancelled) setProfileLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (!needsSettings || settingsLoaded) return;
    setSettingsLoading(true);
    apiFetch<Record<string, unknown>>('/settings')
      .then((data) => {
        setCompanyName(String(data.company_name ?? ''));
        setTimezone(String(data.timezone ?? ''));
        setCurrency(String(data.currency ?? 'AED'));
        setWorkdayStart(String(data.workday_start ?? '09:00'));
        setLateGraceMinutes(String(data.late_grace_minutes ?? '15'));
        setSmtp(parseSmtp(data.smtp));
        setTemplates(parseTemplates(data.email_templates));
        if (typeof data.company_logo === 'string') setCompanyLogo(data.company_logo);
      })
      .catch(() => toast.error('Failed to load settings'))
      .finally(() => {
        setSettingsLoaded(true);
        setSettingsLoading(false);
      });
  }, [needsSettings, settingsLoaded]);

  React.useEffect(() => {
    if (activeTab !== 'api-keys' || apiKeysLoaded || apiKeysLoading) return;
    setApiKeysLoading(true);
    apiFetch<{ keys: ApiKeyRow[] }>('/settings/api-keys')
      .then((res) => setApiKeys(res.keys))
      .catch(() => toast.error('Failed to load API keys'))
      .finally(() => { setApiKeysLoaded(true); setApiKeysLoading(false); });
  }, [activeTab, apiKeysLoaded, apiKeysLoading]);

  React.useEffect(() => {
    if (activeTab !== 'users' || usersLoaded || usersLoading) return;
    setUsersLoading(true);
    apiFetch<{ employees: EmployeeUser[] }>('/employees')
      .then((res) => setEmployeeUsers(res.employees))
      .catch(() => toast.error('Failed to load users'))
      .finally(() => { setUsersLoading(false); setUsersLoaded(true); });
  }, [activeTab, usersLoaded, usersLoading]);

  const applySettingsToForms = React.useCallback((data: Record<string, unknown>) => {
    setCompanyName(String(data.company_name ?? ''));
    setTimezone(String(data.timezone ?? ''));
    setCurrency(String(data.currency ?? 'AED'));
    setWorkdayStart(String(data.workday_start ?? '09:00'));
    setLateGraceMinutes(String(data.late_grace_minutes ?? '15'));
    setSmtp(parseSmtp(data.smtp));
    setTemplates(parseTemplates(data.email_templates));
    if (typeof data.company_logo === 'string') setCompanyLogo(data.company_logo);
  }, []);

  const refreshSettings = React.useCallback(async () => {
    const data = await apiFetch<Record<string, unknown>>('/settings');
    applySettingsToForms(data);
    setSettingsLoaded(true);
  }, [applySettingsToForms]);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword && newPassword.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }
    if (newPassword && !currentPassword) {
      toast.error('Current password is required to set a new password');
      return;
    }
    const payload: { fullName?: string; email?: string; currentPassword?: string; newPassword?: string } = {};
    if (fullName.trim()) payload.fullName = fullName.trim();
    if (email.trim()) payload.email = email.trim();
    if (newPassword) {
      payload.currentPassword = currentPassword;
      payload.newPassword = newPassword;
    }
    if (Object.keys(payload).length === 0) {
      toast.message('Nothing to update');
      return;
    }
    setProfileSaving(true);
    try {
      const res = await apiFetch<{ profile: Profile }>('/auth/profile', { method: 'PUT', json: payload });
      setProfile(res.profile);
      setFullName(res.profile.fullName ?? '');
      setEmail(res.profile.email);
      setCurrentPassword('');
      setNewPassword('');
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setProfileSaving(false);
    }
  }

  async function handleAddDemo() {
    setDemoBusy('add');
    try {
      const res = await apiFetch<{ ok: true; message: string; demo?: { adminEmail: string; employeeEmail: string; password: string } }>(
        '/settings/demo-data/add',
        { method: 'POST', json: {} },
      );
      toast.success(res.message || 'Demo data added');
      if (res.demo) {
        toast.message(`Demo accounts: ${res.demo.adminEmail} + ${res.demo.employeeEmail} (password: ${res.demo.password})`);
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setDemoBusy(null);
    }
  }

  async function handleDeleteDemo() {
    setDemoBusy('delete');
    try {
      const res = await apiFetch<{ ok: true; usersDeleted: number; employeesDeleted: number }>(
        '/settings/demo-data/delete',
        { method: 'POST', json: {} },
      );
      toast.success(`Deleted demo data (users: ${res.usersDeleted}, employees: ${res.employeesDeleted})`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setDemoBusy(null);
      setDemoConfirmOpen(false);
    }
  }

  async function handleSaveCompany() {
    setCompanySaving(true);
    try {
      await Promise.all([
        apiFetch('/settings/company_name', { method: 'PUT', json: { value: companyName } }),
        apiFetch('/settings/timezone', { method: 'PUT', json: { value: timezone } }),
        apiFetch('/settings/currency', { method: 'PUT', json: { value: currency } }),
        apiFetch('/settings/workday_start', { method: 'PUT', json: { value: workdayStart } }),
        apiFetch('/settings/late_grace_minutes', { method: 'PUT', json: { value: lateGraceMinutes } }),
      ]);
      toast.success('Company settings saved');
      await refreshSettings();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save company settings');
    } finally {
      setCompanySaving(false);
    }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error('Logo must be under 2 MB'); return; }
    if (!file.type.startsWith('image/')) { toast.error('File must be an image'); return; }
    setLogoUploading(true);
    try {
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      await apiFetch('/settings/company_logo', { method: 'PUT', json: { value: dataUrl } });
      setCompanyLogo(dataUrl);
      toast.success('Logo uploaded');
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed to upload logo'); }
    finally { setLogoUploading(false); if (logoInputRef.current) logoInputRef.current.value = ''; }
  }

  async function handleSaveSmtp() {
    const payload = {
      host: smtp.host.trim(),
      port: smtp.port.trim() ? Number(smtp.port) : 587,
      username: smtp.username,
      password: smtp.password,
      tls: smtp.tls,
    };
    setSmtpSaving(true);
    try {
      await apiFetch('/settings/smtp', { method: 'PUT', json: { value: payload } });
      toast.success('SMTP settings saved');
      await refreshSettings();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save SMTP');
    } finally {
      setSmtpSaving(false);
    }
  }

  async function handleTestSmtp() {
    const port = smtp.port.trim() ? Number(smtp.port) : 587;
    if (!smtp.host.trim() || Number.isNaN(port)) {
      toast.error('Host and a valid port are required');
      return;
    }
    setSmtpTesting(true);
    try {
      const res = await apiFetch<{ success: boolean; message?: string }>('/settings/smtp/test', {
        method: 'POST',
        json: {
          host: smtp.host.trim(),
          port,
          user: smtp.username || undefined,
          pass: smtp.password || undefined,
        },
      });
      if (res.success) toast.success(res.message ?? 'SMTP connection OK');
      else toast.error(res.message ?? 'SMTP test failed');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'SMTP test failed');
    } finally {
      setSmtpTesting(false);
    }
  }

  async function handleSaveTemplates() {
    setTemplatesSaving(true);
    try {
      await apiFetch('/settings/email_templates', { method: 'PUT', json: { value: templates } });
      toast.success('Email templates saved');
      await refreshSettings();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save templates');
    } finally {
      setTemplatesSaving(false);
    }
  }

  async function handleCreateApiKey() {
    if (!newKeyName.trim()) { toast.error('Key name is required'); return; }
    setCreatingKey(true);
    try {
      const res = await apiFetch<{ key: ApiKeyRow; secret: string }>('/settings/api-keys', {
        method: 'POST', json: { name: newKeyName.trim(), permissions: newKeyPerms },
      });
      setApiKeys((prev) => [res.key, ...prev]);
      setRevealedSecret(res.secret);
      setNewKeyName('');
      toast.success('API key created');
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed to create key'); }
    finally { setCreatingKey(false); }
  }

  async function handleRevokeApiKey(id: string) {
    try {
      await apiFetch(`/settings/api-keys/${id}`, { method: 'DELETE' });
      setApiKeys((prev) => prev.filter((k) => k.id !== id));
      toast.success('API key revoked');
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed to revoke key'); }
  }

  async function handleToggleRole(employeeId: string, currentRole: string) {
    const newRole = currentRole === 'ADMIN' ? 'EMPLOYEE' : 'ADMIN';
    setRoleChanging(employeeId);
    try {
      await apiFetch(`/employees/${employeeId}/role`, { method: 'PUT', json: { role: newRole } });
      setEmployeeUsers((prev) => prev.map((u) => u.id === employeeId ? { ...u, role: newRole } : u));
      toast.success(`Role updated to ${newRole}`);
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed to update role'); }
    finally { setRoleChanging(null); }
  }

  function updateTemplate(id: string, patch: Partial<TemplateEntry>) {
    setTemplates((prev) => ({
      ...prev,
      [id]: { ...prev[id], ...patch },
    }));
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Settings className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Manage your account, company, mail delivery, and notification templates.</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-border pb-3">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = activeTab === t.id;
          return (
            <Button
              key={t.id}
              type="button"
              variant={active ? 'default' : 'ghost'}
              size="sm"
              className={active ? '' : 'text-muted-foreground'}
              onClick={() => setActiveTab(t.id)}
            >
              <Icon className="mr-2 h-4 w-4" />
              {t.label}
            </Button>
          );
        })}
      </div>

      {activeTab === 'profile' && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <User className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-lg">Profile</CardTitle>
                <CardDescription>Update your sign-in email and password.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {profileLoading ? (
              <div className="flex justify-center py-12">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : (
              <form onSubmit={handleSaveProfile} className="space-y-6">
                {profile && (
                  <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 px-4 py-3 text-sm">
                    <span className="text-muted-foreground">Signed in as</span>
                    <span className="font-medium">{profile.fullName ?? '—'}</span>
                    <Badge variant="secondary" className="capitalize">
                      {profile.role.toLowerCase().replace(/_/g, ' ')}
                    </Badge>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full name</Label>
                  <Input
                    id="fullName"
                    autoComplete="name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="max-w-md"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="max-w-md"
                  />
                </div>
                <Separator />
                <div className="grid gap-6 sm:max-w-md">
                  <div className="space-y-2">
                    <Label htmlFor="current-password">Current password</Label>
                    <Input
                      id="current-password"
                      type="password"
                      autoComplete="current-password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Required to change password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-password">New password</Label>
                    <Input
                      id="new-password"
                      type="password"
                      autoComplete="new-password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Leave blank to keep current password"
                    />
                  </div>
                </div>
                <Button type="submit" disabled={profileSaving}>
                  <Save className="mr-2 h-4 w-4" />
                  {profileSaving ? 'Saving…' : 'Save profile'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'company' && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Building2 className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-lg">Company</CardTitle>
                <CardDescription>Regional defaults and working hours used across the app.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {settingsLoading && !settingsLoaded ? (
              <div className="flex justify-center py-12">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : (
              <div className="space-y-6">
                <div className="space-y-4">
                  <Label>Company Logo</Label>
                  <div className="flex items-center gap-4">
                    {companyLogo ? (
                      <img src={companyLogo} alt="Company logo" className="h-16 w-16 rounded-lg border object-contain bg-background p-1" />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed bg-muted/30">
                        <Image className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                      <Button type="button" variant="outline" size="sm" disabled={logoUploading} onClick={() => logoInputRef.current?.click()}>
                        <Upload className="mr-2 h-4 w-4" /> {logoUploading ? 'Uploading…' : 'Upload Logo'}
                      </Button>
                      <p className="mt-1 text-xs text-muted-foreground">Max 2 MB. PNG, JPG, or SVG recommended.</p>
                    </div>
                  </div>
                </div>
                <Separator />
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="company_name">Company name</Label>
                    <Input id="company_name" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <Input
                      id="timezone"
                      placeholder="e.g. Asia/Dubai"
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currency">Currency</Label>
                    <Input id="currency" value={currency} onChange={(e) => setCurrency(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="workday_start">Workday start</Label>
                    <Input id="workday_start" type="time" value={workdayStart} onChange={(e) => setWorkdayStart(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="late_grace">Late grace (minutes)</Label>
                    <Input
                      id="late_grace"
                      inputMode="numeric"
                      value={lateGraceMinutes}
                      onChange={(e) => setLateGraceMinutes(e.target.value)}
                    />
                  </div>
                </div>
                <Button type="button" onClick={handleSaveCompany} disabled={companySaving}>
                  <Save className="mr-2 h-4 w-4" />
                  {companySaving ? 'Saving…' : 'Save company settings'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'smtp' && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Mail className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-lg">SMTP</CardTitle>
                <CardDescription>Outbound email server used for system notifications.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {settingsLoading && !settingsLoaded ? (
              <div className="flex justify-center py-12">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="smtp-host">SMTP host</Label>
                    <Input
                      id="smtp-host"
                      value={smtp.host}
                      onChange={(e) => setSmtp((s) => ({ ...s, host: e.target.value }))}
                      placeholder="smtp.example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtp-port">Port</Label>
                    <Input
                      id="smtp-port"
                      inputMode="numeric"
                      value={smtp.port}
                      onChange={(e) => setSmtp((s) => ({ ...s, port: e.target.value }))}
                    />
                  </div>
                  <div className="flex items-end pb-2">
                    <label className="flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-input accent-primary"
                        checked={smtp.tls}
                        onChange={(e) => setSmtp((s) => ({ ...s, tls: e.target.checked }))}
                      />
                      <span>Use TLS</span>
                    </label>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtp-user">Username</Label>
                    <Input
                      id="smtp-user"
                      autoComplete="off"
                      value={smtp.username}
                      onChange={(e) => setSmtp((s) => ({ ...s, username: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtp-pass">Password</Label>
                    <Input
                      id="smtp-pass"
                      type="password"
                      autoComplete="new-password"
                      value={smtp.password}
                      onChange={(e) => setSmtp((s) => ({ ...s, password: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button type="button" variant="secondary" onClick={handleTestSmtp} disabled={smtpTesting}>
                    <TestTube className="mr-2 h-4 w-4" />
                    {smtpTesting ? 'Testing…' : 'Send Test Email'}
                  </Button>
                  <Button type="button" onClick={handleSaveSmtp} disabled={smtpSaving}>
                    <Save className="mr-2 h-4 w-4" />
                    {smtpSaving ? 'Saving…' : 'Save SMTP'}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Connection test verifies the server; it does not send an email. Stored TLS applies when sending mail from
                  the server.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'templates' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-lg">Email templates</CardTitle>
                  <CardDescription>
                    Subject and body for automated emails. Placeholders: {ALL_PLACEHOLDERS}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          {settingsLoading && !settingsLoaded ? (
            <div className="flex justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : (
            <>
              {TEMPLATE_DEFS.map((t) => (
                <Card key={t.id}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">{t.label}</CardTitle>
                    <CardDescription className="text-xs">
                      Available placeholders: {placeholdersForTemplate(t.id)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor={`sub-${t.id}`}>Subject</Label>
                      <Input
                        id={`sub-${t.id}`}
                        value={templates[t.id]?.subject ?? ''}
                        onChange={(e) => updateTemplate(t.id, { subject: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`body-${t.id}`}>Body</Label>
                      <Textarea
                        id={`body-${t.id}`}
                        rows={6}
                        className="min-h-[120px] resize-y font-mono text-sm"
                        placeholder={`Use variables like ${placeholdersForTemplate(t.id)}`}
                        value={templates[t.id]?.body ?? ''}
                        onChange={(e) => updateTemplate(t.id, { body: e.target.value })}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
              <Button type="button" onClick={handleSaveTemplates} disabled={templatesSaving}>
                <Save className="mr-2 h-4 w-4" />
                {templatesSaving ? 'Saving…' : 'Save all templates'}
              </Button>
            </>
          )}
        </div>
      )}

      {activeTab === 'api-keys' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Key className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-lg">API Keys</CardTitle>
                  <CardDescription>Create keys for external integrations. Keys are shown only once upon creation.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="key-name">Key name</Label>
                  <Input id="key-name" placeholder="e.g. Payroll Integration" value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label className="text-xs">Permissions</Label>
                  <div className="flex flex-wrap gap-2">
                    {['read', 'write', 'payroll', 'attendance', 'leave'].map((p) => (
                      <label key={p} className="flex cursor-pointer items-center gap-1.5 text-sm">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-input accent-primary"
                          checked={newKeyPerms.includes(p)}
                          onChange={(e) => setNewKeyPerms((prev) => e.target.checked ? [...prev, p] : prev.filter((x) => x !== p))}
                        />
                        <span className="capitalize">{p}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <Button onClick={handleCreateApiKey} disabled={creatingKey}>
                <Key className="mr-2 h-4 w-4" /> {creatingKey ? 'Creating…' : 'Create API Key'}
              </Button>
            </CardContent>
          </Card>

          {revealedSecret && (
            <Card className="border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20">
              <CardContent className="pt-6">
                <p className="mb-2 text-sm font-medium text-emerald-800 dark:text-emerald-300">Your API key (copy now — it won&apos;t be shown again):</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 overflow-x-auto rounded border bg-background px-3 py-2 font-mono text-sm">{revealedSecret}</code>
                  <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(revealedSecret); toast.success('Copied to clipboard'); }}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <Button variant="ghost" size="sm" className="mt-2" onClick={() => setRevealedSecret(null)}>Dismiss</Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Active keys</CardTitle>
            </CardHeader>
            <CardContent>
              {apiKeysLoading ? (
                <div className="flex justify-center py-8">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : apiKeys.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No API keys created yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Prefix</TableHead>
                      <TableHead>Permissions</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {apiKeys.map((k) => (
                      <TableRow key={k.id}>
                        <TableCell className="font-medium">{k.name}</TableCell>
                        <TableCell><code className="text-xs">{k.keyPrefix}…</code></TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {k.permissions.map((p) => <Badge key={p} variant="secondary" className="text-xs capitalize">{p}</Badge>)}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{new Date(k.createdAt).toLocaleDateString('en-AE', { month: 'short', day: 'numeric', year: 'numeric' })}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="destructive" onClick={() => handleRevokeApiKey(k.id)}>
                            <Trash2 className="mr-1 h-3 w-3" /> Revoke
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Usage</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">Include your API key in the <code className="rounded bg-muted px-1">X-API-Key</code> header:</p>
              <pre className="overflow-x-auto rounded-lg border bg-muted/50 p-4 text-sm font-mono">
{`curl -H "X-API-Key: uppk_your_key_here" \\
  https://your-domain/api/v1/employees`}
              </pre>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Users className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-lg">User Roles</CardTitle>
                  <CardDescription>Promote employees to admin or demote admins to employee role.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <div className="flex justify-center py-8">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : employeeUsers.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No employees found.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Current Role</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employeeUsers.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.fullName}</TableCell>
                        <TableCell className="text-muted-foreground">{u.department}</TableCell>
                        <TableCell>
                          <Badge variant={u.role === 'ADMIN' ? 'default' : 'secondary'} className="capitalize">
                            {(u.role ?? 'employee').toLowerCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant={u.role === 'ADMIN' ? 'outline' : 'default'}
                            disabled={roleChanging === u.id}
                            onClick={() => handleToggleRole(u.id, u.role ?? 'EMPLOYEE')}
                          >
                            <Shield className="mr-1 h-3 w-3" />
                            {roleChanging === u.id ? 'Updating…' : u.role === 'ADMIN' ? 'Remove Admin' : 'Make Admin'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-foreground">
                  <TestTube className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-base">Demo Data</CardTitle>
                  <CardDescription>Create or remove 2 demo accounts only.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
                This only affects demo users:\n
                <div className="mt-2 font-mono text-xs text-foreground/80">
                  demo.admin@uppearance.demo\n
                  demo.employee@uppearance.demo
                </div>
              </div>
              <Button className="w-full" disabled={demoBusy !== null} onClick={handleAddDemo}>
                {demoBusy === 'add' ? 'Adding…' : 'Add demo data'}
              </Button>
              <Button
                className="w-full"
                variant="outline"
                disabled={demoBusy !== null}
                onClick={() => setDemoConfirmOpen(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete demo data
              </Button>
            </CardContent>
          </Card>

          <Dialog open={demoConfirmOpen} onOpenChange={setDemoConfirmOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete demo data?</DialogTitle>
                <DialogDescription>
                  This will delete only the 2 demo users and their related demo employee records.\n
                  Anything created by real users will remain.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDemoConfirmOpen(false)} disabled={demoBusy === 'delete'}>
                  Cancel
                </Button>
                <Button onClick={handleDeleteDemo} disabled={demoBusy === 'delete'}>
                  {demoBusy === 'delete' ? 'Deleting…' : 'Delete demo data'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  );
}
