'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { login } from '@/lib/auth';
import { useAuth } from '@/components/auth-provider';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const { setUser } = useAuth();
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { email: '', password: '' } });

  const onSubmit = async (values: FormValues) => {
    try {
      const res = await login(values.email, values.password);
      setUser(res.user);
      toast.success('Welcome back');
      router.push(res.user.role === 'ADMIN' ? '/app/admin' : '/app');
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,hsl(var(--primary)/0.03)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--primary)/0.03)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
      <div className="absolute left-1/2 top-1/3 -z-10 h-[500px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/5 blur-3xl" />
      <div className="w-full max-w-sm animate-fade-up">
        <div className="mb-10 text-center">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center shadow-md shadow-primary/20">
              <span className="text-base font-bold text-primary-foreground">U</span>
            </div>
            <span className="text-xl font-semibold tracking-tight">Uppearance</span>
          </Link>
        </div>
        <Card className="shadow-xl shadow-black/5 border-border/50">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl">Welcome back</CardTitle>
            <CardDescription className="text-base">Sign in with your work email</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="you@company.com" autoComplete="email" className="h-10" {...form.register('email')} />
                {form.formState.errors.email && (
                  <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link className="text-xs text-primary hover:text-primary/80 transition-colors" href="/forgot-password">
                    Forgot password?
                  </Link>
                </div>
                <Input id="password" type="password" autoComplete="current-password" className="h-10" {...form.register('password')} />
                {form.formState.errors.password && (
                  <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
                )}
              </div>
              <Button type="submit" className="w-full h-10 shadow-sm" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Signing in…' : 'Sign in'}
              </Button>
            </form>
            <div className="mt-6 text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{' '}
              <Link href="/register" className="font-medium text-primary hover:text-primary/80 transition-colors">
                Get started
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
