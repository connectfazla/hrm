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
import { Settings, User, Building2, Mail, FileText, Save, TestTube } from 'lucide-react';

type TabId = 'profile' | 'company' | 'smtp' | 'templates';

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

const tabs: { id: TabId; label: string; icon: typeof Settings }[] = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'company', label: 'Company', icon: Building2 },
  { id: 'smtp', label: 'SMTP', icon: Mail },
  { id: 'templates', label: 'Email Templates', icon: FileText },
];

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = React.useState<TabId>('profile');

  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = React.useState(true);
  const [profileSaving, setProfileSaving] = React.useState(false);
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

  const [smtp, setSmtp] = React.useState<SmtpForm>(parseSmtp(null));
  const [smtpSaving, setSmtpSaving] = React.useState(false);
  const [smtpTesting, setSmtpTesting] = React.useState(false);

  const [templates, setTemplates] = React.useState<Record<string, TemplateEntry>>(emptyTemplates());
  const [templatesSaving, setTemplatesSaving] = React.useState(false);

  const needsSettings = activeTab === 'company' || activeTab === 'smtp' || activeTab === 'templates';

  React.useEffect(() => {
    let cancelled = false;
    setProfileLoading(true);
    apiFetch<{ profile: Profile }>('/auth/me')
      .then((res) => {
        if (cancelled) return;
        setProfile(res.profile);
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
    if (!needsSettings || settingsLoaded || settingsLoading) return;
    let cancelled = false;
    setSettingsLoading(true);
    apiFetch<Record<string, unknown>>('/settings')
      .then((data) => {
        if (cancelled) return;
        setCompanyName(String(data.company_name ?? ''));
        setTimezone(String(data.timezone ?? ''));
        setCurrency(String(data.currency ?? 'AED'));
        setWorkdayStart(String(data.workday_start ?? '09:00'));
        setLateGraceMinutes(String(data.late_grace_minutes ?? '15'));
        setSmtp(parseSmtp(data.smtp));
        setTemplates(parseTemplates(data.email_templates));
        setSettingsLoaded(true);
      })
      .catch(() => toast.error('Failed to load settings'))
      .finally(() => {
        if (!cancelled) setSettingsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [needsSettings, settingsLoaded, settingsLoading]);

  const applySettingsToForms = React.useCallback((data: Record<string, unknown>) => {
    setCompanyName(String(data.company_name ?? ''));
    setTimezone(String(data.timezone ?? ''));
    setCurrency(String(data.currency ?? 'AED'));
    setWorkdayStart(String(data.workday_start ?? '09:00'));
    setLateGraceMinutes(String(data.late_grace_minutes ?? '15'));
    setSmtp(parseSmtp(data.smtp));
    setTemplates(parseTemplates(data.email_templates));
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
    const payload: { email?: string; currentPassword?: string; newPassword?: string } = {};
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
    </div>
  );
}
