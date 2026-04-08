'use client';

import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { resetPassword } from '@/lib/auth';

const schema = z.object({
  newPassword: z.string().min(8),
});
type FormValues = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get('token') ?? '';

  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { newPassword: '' } });

  const onSubmit = async (values: FormValues) => {
    try {
      await resetPassword(token, values.newPassword);
      toast.success('Password updated');
      router.push('/login');
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <h1 className="text-xl font-semibold">Choose a new password</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            This link expires quickly. If it fails, request a new reset email.
          </p>
        </CardHeader>
        <CardContent>
          {!token ? (
            <div className="space-y-3">
              <p className="text-sm text-red-600">Missing reset token.</p>
              <Link className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50" href="/forgot-password">
                Request a new reset link
              </Link>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
              <div className="space-y-2">
                <Label htmlFor="newPassword">New password</Label>
                <Input id="newPassword" type="password" autoComplete="new-password" {...form.register('newPassword')} />
                {form.formState.errors.newPassword && (
                  <p className="text-sm text-red-600">{form.formState.errors.newPassword.message}</p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Updating…' : 'Update password'}
              </Button>
              <div className="text-center text-sm text-zinc-600 dark:text-zinc-400">
                <Link className="hover:text-zinc-900 dark:hover:text-zinc-50" href="/login">
                  Back to sign in
                </Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

