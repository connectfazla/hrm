'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { BrandLogo } from '@/components/brand/brand-logo';
import { useAuth } from '@/components/auth-provider';
import { apiFetch } from '@/lib/api';
import type { SessionUser } from '@/lib/auth';

export default function RegisterPage() {
  const router = useRouter();
  const { setUser } = useAuth();
  const [submitting, setSubmitting] = React.useState(false);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const get = (k: string) => fd.get(k)?.toString() ?? '';

    const password = get('password');
    const confirmPassword = get('confirmPassword');
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    const baseSalary = Number(get('baseSalary'));
    const allowances = Number(get('allowances'));
    if (Number.isNaN(baseSalary) || baseSalary < 0) {
      toast.error('Enter a valid base salary.');
      return;
    }
    if (Number.isNaN(allowances) || allowances < 0) {
      toast.error('Enter valid allowances.');
      return;
    }

    const personalEmailRaw = get('personalEmail').trim();
    const payload = {
      registrationCode: get('registrationCode'),
      password,
      fullName: get('fullName'),
      jobTitle: get('jobTitle'),
      department: get('department'),
      dateOfBirth: get('dateOfBirth'),
      nationality: get('nationality'),
      personalEmail: personalEmailRaw ? personalEmailRaw : null,
      workEmail: get('workEmail'),
      phone: get('phone'),
      emiratesIdNumber: get('emiratesIdNumber'),
      emiratesIdExpiryDate: get('emiratesIdExpiryDate'),
      passportNumber: get('passportNumber'),
      passportExpiryDate: get('passportExpiryDate'),
      dateJoined: get('dateJoined'),
      employmentType: get('employmentType'),
      notes: get('notes').trim() || null,
      baseSalary,
      allowances,
      bankAccount: {
        bankName: get('bankName'),
        accountHolderName: get('accountHolderName'),
        iban: get('iban').trim() || null,
        accountNumber: get('accountNumber').trim() || null,
      },
      emergencyContact: {
        name: get('emergencyName'),
        relation: get('emergencyRelation'),
        phone: get('emergencyPhone'),
      },
    };

    setSubmitting(true);
    try {
      const res = await apiFetch<{ user: SessionUser }>('/auth/register', {
        method: 'POST',
        json: payload,
      });
      setUser(res.user);
      toast.success('Account created — welcome to Uppearance!');
      router.push(res.user.role === 'ADMIN' ? '/app/admin' : '/app');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-start justify-center bg-background px-4 py-10">
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,hsl(var(--primary)/0.03)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--primary)/0.03)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
      <div className="absolute left-1/2 top-1/3 -z-10 h-[500px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/5 blur-3xl" />
      <div className="w-full max-w-3xl animate-fade-up pb-16">
        <div className="mb-8 flex justify-center">
          <BrandLogo size="lg" href="/" />
        </div>
        <Card className="border-border/50 shadow-xl shadow-black/5">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl">Create your account</CardTitle>
            <CardDescription className="text-base">
              Complete your HR profile. Use the registration code from your administrator. Your work email becomes your
              sign-in email.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-6">
              <Card className="border-dashed">
                <CardHeader className="py-3">
                  <CardTitle className="text-base">Access</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="registrationCode">Registration code *</Label>
                    <Input
                      id="registrationCode"
                      name="registrationCode"
                      type="password"
                      autoComplete="off"
                      required
                      minLength={1}
                      placeholder="Provided by HR or IT"
                      className="h-10"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-base">Personal Information</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Full Name *</Label>
                    <Input name="fullName" required className="h-10" />
                  </div>
                  <div className="space-y-2">
                    <Label>Date of Birth *</Label>
                    <Input name="dateOfBirth" type="date" required className="h-10" />
                  </div>
                  <div className="space-y-2">
                    <Label>Nationality *</Label>
                    <Input name="nationality" required className="h-10" />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone *</Label>
                    <Input name="phone" required minLength={5} className="h-10" />
                  </div>
                  <div className="space-y-2">
                    <Label>Personal Email</Label>
                    <Input name="personalEmail" type="email" className="h-10" />
                  </div>
                  <div className="space-y-2">
                    <Label>Work Email *</Label>
                    <Input name="workEmail" type="email" required autoComplete="email" className="h-10" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-base">National ID (NID)</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>NID *</Label>
                    <Input name="emiratesIdNumber" required className="h-10" />
                  </div>
                  <div className="space-y-2">
                    <Label>NID expiry *</Label>
                    <Input name="emiratesIdExpiryDate" type="date" required className="h-10" />
                  </div>
                  <div className="space-y-2">
                    <Label>Passport Number *</Label>
                    <Input name="passportNumber" required className="h-10" />
                  </div>
                  <div className="space-y-2">
                    <Label>Passport Expiry *</Label>
                    <Input name="passportExpiryDate" type="date" required className="h-10" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-base">Employment</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Job Title *</Label>
                    <Input name="jobTitle" required className="h-10" />
                  </div>
                  <div className="space-y-2">
                    <Label>Department *</Label>
                    <Input name="department" required className="h-10" />
                  </div>
                  <div className="space-y-2">
                    <Label>Date Joined *</Label>
                    <Input name="dateJoined" type="date" required className="h-10" />
                  </div>
                  <div className="space-y-2">
                    <Label>Employment Type *</Label>
                    <select
                      name="employmentType"
                      required
                      className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="FULL_TIME">Full Time</option>
                      <option value="PART_TIME">Part Time</option>
                      <option value="CONTRACT">Contract</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password *</Label>
                    <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} className="h-10" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm password *</Label>
                    <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required minLength={8} className="h-10" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-base">Compensation (AED)</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Base Salary *</Label>
                    <Input name="baseSalary" type="number" step="0.01" min="0" required className="h-10" />
                  </div>
                  <div className="space-y-2">
                    <Label>Allowances *</Label>
                    <Input name="allowances" type="number" step="0.01" min="0" required className="h-10" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-base">Bank Account</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Bank Name *</Label>
                    <Input name="bankName" required className="h-10" />
                  </div>
                  <div className="space-y-2">
                    <Label>Account Holder *</Label>
                    <Input name="accountHolderName" required className="h-10" />
                  </div>
                  <div className="space-y-2">
                    <Label>IBAN</Label>
                    <Input name="iban" className="h-10" />
                  </div>
                  <div className="space-y-2">
                    <Label>Account Number</Label>
                    <Input name="accountNumber" className="h-10" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-base">Emergency Contact</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Name *</Label>
                    <Input name="emergencyName" required className="h-10" />
                  </div>
                  <div className="space-y-2">
                    <Label>Relation *</Label>
                    <Input name="emergencyRelation" required className="h-10" />
                  </div>
                  <div className="space-y-2 sm:col-span-1 max-sm:col-span-3">
                    <Label>Phone *</Label>
                    <Input name="emergencyPhone" required minLength={5} className="h-10" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-base">Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea name="notes" placeholder="Optional notes…" rows={3} />
                </CardContent>
              </Card>

              <Button type="submit" className="w-full h-11 shadow-sm" disabled={submitting}>
                {submitting ? 'Creating account…' : 'Create account'}
              </Button>
            </form>
            <div className="mt-6 text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link href="/login" className="font-medium text-primary hover:text-primary/80 transition-colors">
                Sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
