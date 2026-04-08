'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
import { ArrowLeft, Save } from 'lucide-react';

export default function NewEmployeePage() {
  const router = useRouter();
  const [submitting, setSubmitting] = React.useState(false);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const get = (k: string) => fd.get(k)?.toString() ?? '';

    const payload = {
      fullName: get('fullName'),
      jobTitle: get('jobTitle'),
      department: get('department'),
      dateOfBirth: get('dateOfBirth'),
      nationality: get('nationality'),
      personalEmail: get('personalEmail') || null,
      workEmail: get('workEmail'),
      phone: get('phone'),
      emiratesIdNumber: get('emiratesIdNumber'),
      emiratesIdExpiryDate: get('emiratesIdExpiryDate'),
      passportNumber: get('passportNumber'),
      passportExpiryDate: get('passportExpiryDate'),
      dateJoined: get('dateJoined'),
      employmentType: get('employmentType'),
      notes: get('notes') || null,
      initialPassword: get('initialPassword'),
      baseSalary: Number(get('baseSalary')),
      allowances: Number(get('allowances')),
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

    setSubmitting(true);
    try {
      await apiFetch('/employees', { method: 'POST', json: payload });
      toast.success('Employee created');
      router.push('/app/admin/employees');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Add Employee</h1>
          <p className="text-muted-foreground">Create a new employee record.</p>
        </div>
      </div>

      <form onSubmit={submit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Personal Information</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label>Full Name *</Label><Input name="fullName" required /></div>
            <div className="space-y-2"><Label>Date of Birth *</Label><Input name="dateOfBirth" type="date" required /></div>
            <div className="space-y-2"><Label>Nationality *</Label><Input name="nationality" required /></div>
            <div className="space-y-2"><Label>Phone *</Label><Input name="phone" required /></div>
            <div className="space-y-2"><Label>Personal Email</Label><Input name="personalEmail" type="email" /></div>
            <div className="space-y-2"><Label>Work Email *</Label><Input name="workEmail" type="email" required /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">ID Documents</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label>Emirates ID Number *</Label><Input name="emiratesIdNumber" required /></div>
            <div className="space-y-2"><Label>Emirates ID Expiry *</Label><Input name="emiratesIdExpiryDate" type="date" required /></div>
            <div className="space-y-2"><Label>Passport Number *</Label><Input name="passportNumber" required /></div>
            <div className="space-y-2"><Label>Passport Expiry *</Label><Input name="passportExpiryDate" type="date" required /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Employment</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label>Job Title *</Label><Input name="jobTitle" required /></div>
            <div className="space-y-2"><Label>Department *</Label><Input name="department" required /></div>
            <div className="space-y-2"><Label>Date Joined *</Label><Input name="dateJoined" type="date" required /></div>
            <div className="space-y-2">
              <Label>Employment Type *</Label>
              <select name="employmentType" required className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                <option value="FULL_TIME">Full Time</option>
                <option value="PART_TIME">Part Time</option>
                <option value="CONTRACT">Contract</option>
              </select>
            </div>
            <div className="space-y-2"><Label>Initial Password *</Label><Input name="initialPassword" type="password" required minLength={8} /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Compensation (AED)</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label>Base Salary *</Label><Input name="baseSalary" type="number" step="0.01" required /></div>
            <div className="space-y-2"><Label>Allowances *</Label><Input name="allowances" type="number" step="0.01" required /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Bank Account</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label>Bank Name *</Label><Input name="bankName" required /></div>
            <div className="space-y-2"><Label>Account Holder *</Label><Input name="accountHolderName" required /></div>
            <div className="space-y-2"><Label>IBAN</Label><Input name="iban" /></div>
            <div className="space-y-2"><Label>Account Number</Label><Input name="accountNumber" /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Emergency Contact</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2"><Label>Name *</Label><Input name="emergencyName" required /></div>
            <div className="space-y-2"><Label>Relation *</Label><Input name="emergencyRelation" required /></div>
            <div className="space-y-2"><Label>Phone *</Label><Input name="emergencyPhone" required /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Notes</CardTitle></CardHeader>
          <CardContent>
            <Textarea name="notes" placeholder="HR notes (visible to admins only)…" />
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={submitting}>
            <Save className="mr-2 h-4 w-4" />{submitting ? 'Creating…' : 'Create Employee'}
          </Button>
          <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
        </div>
      </form>
    </div>
  );
}
