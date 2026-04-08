'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/components/auth-provider';
import {
  User,
  Mail,
  Phone,
  Building2,
  Briefcase,
  Calendar,
  Shield,
  Globe,
  Save,
  Lock,
  Heart,
} from 'lucide-react';

type EmployeeProfile = {
  fullName: string;
  jobTitle: string;
  department: string;
  dateOfBirth: string;
  nationality: string;
  personalEmail: string | null;
  workEmail: string | null;
  phone: string;
  dateJoined: string;
  employmentType: string;
  probationStatus: string;
  probationEndDate: string;
  emergencyContact: { name: string; relation: string; phone: string } | null;
};

type ProfileData = {
  userId: string;
  email: string;
  role: string;
  fullName: string | null;
  employee: EmployeeProfile | null;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-AE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatEmploymentType(t: string) {
  return t.split('_').map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
}

function getInitials(name: string | null | undefined, email: string | undefined) {
  if (name) {
    return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  }
  return (email ?? 'U').slice(0, 2).toUpperCase();
}

function tenure(dateJoined: string): string {
  const joined = new Date(dateJoined);
  const now = new Date();
  const months = (now.getFullYear() - joined.getFullYear()) * 12 + (now.getMonth() - joined.getMonth());
  if (months < 1) return 'Less than a month';
  const years = Math.floor(months / 12);
  const rem = months % 12;
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} year${years > 1 ? 's' : ''}`);
  if (rem > 0) parts.push(`${rem} month${rem > 1 ? 's' : ''}`);
  return parts.join(', ');
}

export default function ProfilePage() {
  const { state, setUser } = useAuth();
  const [profile, setProfile] = React.useState<ProfileData | null>(null);
  const [loading, setLoading] = React.useState(true);

  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    apiFetch<{ profile: ProfileData }>('/auth/me')
      .then((res) => setProfile(res.profile))
      .catch(() => toast.error('Failed to load profile'))
      .finally(() => setLoading(false));
  }, []);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!currentPassword) {
      toast.error('Current password is required');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setSaving(true);
    try {
      const res = await apiFetch<{ profile: ProfileData }>('/auth/profile', {
        method: 'PUT',
        json: { currentPassword, newPassword },
      });
      setProfile(res.profile);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Password updated successfully');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update password');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="py-20 text-center text-muted-foreground">
        <p>Could not load your profile.</p>
      </div>
    );
  }

  const emp = profile.employee;
  const initials = getInitials(profile.fullName, profile.email);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {/* Header Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            <Avatar className="h-20 w-20">
              <AvatarFallback className="bg-primary/10 text-2xl font-bold text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-2xl font-bold tracking-tight">
                {profile.fullName ?? 'User'}
              </h1>
              {emp && (
                <p className="mt-1 text-muted-foreground">
                  {emp.jobTitle} · {emp.department}
                </p>
              )}
              <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
                <Badge variant="secondary" className="capitalize">
                  {profile.role.toLowerCase()}
                </Badge>
                {emp && (
                  <Badge
                    variant={emp.probationStatus === 'CONFIRMED' ? 'success' : 'warning'}
                  >
                    {emp.probationStatus === 'CONFIRMED' ? 'Confirmed' : 'On Probation'}
                  </Badge>
                )}
                {emp && (
                  <Badge variant="outline">
                    {formatEmploymentType(emp.employmentType)}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personal Information */}
      {emp && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4" />
              Personal information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <InfoRow icon={User} label="Full name" value={emp.fullName} />
              <InfoRow icon={Calendar} label="Date of birth" value={formatDate(emp.dateOfBirth)} />
              <InfoRow icon={Globe} label="Nationality" value={emp.nationality} />
              <InfoRow icon={Phone} label="Phone" value={emp.phone} />
              <InfoRow icon={Mail} label="Work email" value={emp.workEmail ?? '—'} />
              <InfoRow icon={Mail} label="Personal email" value={emp.personalEmail ?? '—'} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Employment Details */}
      {emp && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Briefcase className="h-4 w-4" />
              Employment details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <InfoRow icon={Building2} label="Department" value={emp.department} />
              <InfoRow icon={Briefcase} label="Job title" value={emp.jobTitle} />
              <InfoRow icon={Calendar} label="Date joined" value={formatDate(emp.dateJoined)} />
              <InfoRow icon={Calendar} label="Tenure" value={tenure(emp.dateJoined)} />
              <InfoRow
                icon={Shield}
                label="Probation status"
                value={emp.probationStatus === 'CONFIRMED' ? 'Confirmed' : `On probation (ends ${formatDate(emp.probationEndDate)})`}
              />
              <InfoRow
                icon={Briefcase}
                label="Employment type"
                value={formatEmploymentType(emp.employmentType)}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Emergency Contact */}
      {emp?.emergencyContact && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Heart className="h-4 w-4" />
              Emergency contact
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <InfoRow icon={User} label="Name" value={emp.emergencyContact.name} />
              <InfoRow icon={Heart} label="Relation" value={emp.emergencyContact.relation} />
              <InfoRow icon={Phone} label="Phone" value={emp.emergencyContact.phone} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Lock className="h-4 w-4" />
            Change password
          </CardTitle>
          <CardDescription>Update your sign-in password. You must enter your current password first.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4 sm:max-w-md">
            <div className="space-y-2">
              <Label htmlFor="current-pw">Current password</Label>
              <Input
                id="current-pw"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label htmlFor="new-pw">New password</Label>
              <Input
                id="new-pw"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 8 characters"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-pw">Confirm new password</Label>
              <Input
                id="confirm-pw"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Updating…' : 'Update password'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Account info footer */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              <span>Sign-in email: <span className="font-medium text-foreground">{profile.email}</span></span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span>Role: <span className="font-medium text-foreground capitalize">{profile.role.toLowerCase()}</span></span>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            To update your personal details (name, phone, etc.), please contact your HR administrator.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}
