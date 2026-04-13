'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { login } from '@/lib/auth';
import { useAuth } from '@/components/auth-provider';
import Image from 'next/image';
import { BrandLogo } from '@/components/brand/brand-logo';
import loginVisualization from '@/assets/login-visualization.png';

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
    <div className="min-h-screen bg-[#f0f2fb] p-4 md:p-8">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-6xl overflow-hidden rounded-2xl border bg-white shadow-[0_20px_80px_rgba(30,41,59,0.12)] md:min-h-[680px]">
        {/* Left: login form */}
        <section className="flex w-full flex-col justify-center px-6 py-10 sm:px-10 lg:w-1/2">
          <div className="mb-6">
            <BrandLogo size="lg" href="/" />
          </div>

          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Welcome back!</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to manage your team, attendance, and payroll.
          </p>

          <form className="mt-8 space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email address"
                autoComplete="email"
                className="h-11"
                {...form.register('email')}
              />
              {form.formState.errors.email && (
                <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter password"
                autoComplete="current-password"
                className="h-11"
                {...form.register('password')}
              />
              {form.formState.errors.password && (
                <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
              )}
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-muted-foreground">
                <input type="checkbox" className="h-4 w-4 rounded border-input accent-primary" />
                Remember me
              </label>
              <Link
                className="text-primary hover:text-primary/80 transition-colors"
                href="/forgot-password"
              >
                Forgot your password?
              </Link>
            </div>

            <Button
              type="submit"
              className="h-11 w-full text-base"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? 'Signing in…' : 'Log In'}
            </Button>
          </form>

          <div className="mt-7 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link
              href="/register"
              className="font-medium text-primary hover:text-primary/80 transition-colors"
            >
              Register here
            </Link>
          </div>
        </section>

        {/* Right: image only */}
        <section className="relative hidden w-1/2 overflow-hidden lg:block">
          <Image
            src={loginVisualization}
            alt=""
            priority
            className="h-full w-full object-cover"
          />
        </section>
      </div>
    </div>
  );
}
