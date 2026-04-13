'use client';

import React from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Building2,
  Calendar,
  ChevronRight,
  Clock,
  FileText,
  Menu,
  Shield,
  Users,
  X,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BrandLogo } from '@/components/brand/brand-logo';
import { AnimatedGroup } from '@/components/ui/animated-group';
import { cn } from '@/lib/utils';

const transitionVariants: any = {
  item: {
    hidden: {
      opacity: 0,
      filter: 'blur(12px)',
      y: 12,
    },
    visible: {
      opacity: 1,
      filter: 'blur(0px)',
      y: 0,
      transition: {
        type: 'spring',
        bounce: 0.3,
        duration: 1.5,
      },
    },
  },
};

const features = [
  { label: 'Attendance', icon: Clock },
  { label: 'Leave Management', icon: Calendar },
  { label: 'Payroll', icon: Wallet },
  { label: 'Documents', icon: FileText },
  { label: 'Team Management', icon: Users },
  { label: 'UAE Compliant', icon: Shield },
];

export function HeroSection() {
  return (
    <>
      <HeroHeader />
      <main className="overflow-hidden">
        <div
          aria-hidden
          className="z-[2] pointer-events-none absolute inset-0 isolate hidden opacity-50 contain-strict lg:block"
        >
          <div className="absolute left-0 top-0 h-[80rem] w-[35rem] -translate-y-[350px] -rotate-45 rounded-full bg-[radial-gradient(68.54%_68.72%_at_55.02%_31.46%,hsla(288,73%,32%,.1)_0,hsla(288,73%,32%,.03)_50%,hsla(288,73%,32%,0)_80%)]" />
          <div className="absolute left-0 top-0 h-[80rem] w-56 -rotate-45 rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,hsla(288,73%,32%,.08)_0,hsla(259,66%,21%,.04)_80%,transparent_100%)] [translate:5%_-50%]" />
          <div className="absolute left-0 top-0 h-[80rem] w-56 -translate-y-[350px] -rotate-45 bg-[radial-gradient(50%_50%_at_50%_50%,hsla(259,66%,21%,.06)_0,hsla(259,66%,21%,.02)_80%,transparent_100%)]" />
        </div>
        <section>
          <div className="relative pt-24 md:pt-36">
            <AnimatedGroup
              variants={{
                container: {
                  visible: {
                    transition: {
                      delayChildren: 1,
                    },
                  },
                },
                item: {
                  hidden: {
                    opacity: 0,
                    y: 20,
                  },
                  visible: {
                    opacity: 1,
                    y: 0,
                    transition: {
                      type: 'spring',
                      bounce: 0.3,
                      duration: 2,
                    },
                  },
                },
              }}
              className="absolute inset-0 -z-20"
            >
              <div className="absolute inset-x-0 top-56 -z-20 hidden lg:top-32 dark:block">
                <div className="mx-auto h-[600px] max-w-5xl rounded-full bg-gradient-to-br from-brand-accent/25 via-brand-accent/8 to-transparent blur-3xl" />
              </div>
            </AnimatedGroup>
            <div
              aria-hidden
              className="absolute inset-0 -z-10 size-full [background:radial-gradient(125%_125%_at_50%_100%,transparent_0%,var(--background)_75%)]"
            />
            <div className="mx-auto max-w-7xl px-6">
              <div className="text-center sm:mx-auto lg:mr-auto lg:mt-0">
                <AnimatedGroup variants={transitionVariants}>
                  <div className="mx-auto flex justify-center">
                    <BrandLogo href="/" size="hero" />
                  </div>

                  <Link
                    href="/register"
                    className="hover:bg-background group mx-auto mt-8 flex w-fit items-center gap-4 rounded-full border bg-muted p-1 pl-4 shadow-md shadow-black/5 transition-all duration-300"
                  >
                    <span className="text-foreground text-sm">Built for UAE Labour Law compliance</span>
                    <span className="block h-4 w-0.5 border-l bg-zinc-300" />
                    <div className="bg-background group-hover:bg-muted size-6 overflow-hidden rounded-full duration-500">
                      <div className="flex w-12 -translate-x-1/2 duration-500 ease-in-out group-hover:translate-x-0">
                        <span className="flex size-6">
                          <ArrowRight className="m-auto size-3" />
                        </span>
                        <span className="flex size-6">
                          <ArrowRight className="m-auto size-3" />
                        </span>
                      </div>
                    </div>
                  </Link>

                  <h1 className="mx-auto mt-8 max-w-4xl text-balance text-5xl font-bold tracking-tight md:text-7xl lg:mt-16 xl:text-[5.25rem]">
                    HR Management Made{' '}
                    <span className="bg-gradient-to-r from-[#73168C] to-[#281259] bg-clip-text text-transparent">
                      Effortless
                    </span>
                  </h1>
                  <p className="mx-auto mt-8 max-w-2xl text-balance text-lg text-muted-foreground">
                    Attendance, leave, payroll, and documents — all in one beautifully simple platform
                    designed for small teams in the UAE.
                  </p>
                </AnimatedGroup>

                <AnimatedGroup
                  variants={{
                    container: {
                      visible: {
                        transition: {
                          staggerChildren: 0.05,
                          delayChildren: 0.75,
                        },
                      },
                    },
                    ...transitionVariants,
                  }}
                  className="mt-12 flex flex-col items-center justify-center gap-2 md:flex-row"
                >
                  <div key={1}>
                    <Button asChild size="lg" className="rounded-xl px-6 text-base shadow-lg shadow-[#000114]/25">
                      <Link href="/register">
                        <span className="text-nowrap">Get Started Free</span>
                        <ArrowRight className="ml-1 size-4" />
                      </Link>
                    </Button>
                  </div>
                  <Button key={2} asChild size="lg" variant="outline" className="rounded-xl px-6 text-base">
                    <Link href="/login">
                      <span className="text-nowrap">Sign In</span>
                    </Link>
                  </Button>
                </AnimatedGroup>
              </div>
            </div>

            <AnimatedGroup
              variants={{
                container: {
                  visible: {
                    transition: {
                      staggerChildren: 0.05,
                      delayChildren: 0.75,
                    },
                  },
                },
                ...transitionVariants,
              }}
            >
              <div className="relative -mr-56 mt-8 overflow-hidden px-2 sm:mr-0 sm:mt-12 md:mt-20">
                <div aria-hidden className="bg-gradient-to-b to-background absolute inset-0 z-10 from-transparent from-35%" />
                <div className="relative mx-auto max-w-6xl overflow-hidden rounded-2xl border bg-background p-4 shadow-lg shadow-zinc-950/15 ring-1 ring-background">
                  <div className="aspect-[15/8] relative rounded-2xl border bg-gradient-to-br from-brand-accent/10 via-background to-brand-accent-deep/10 flex items-center justify-center">
                    <div className="grid max-w-3xl grid-cols-2 gap-4 p-8 sm:grid-cols-3">
                      {[
                        { icon: Clock, title: 'Time Tracking', desc: 'Clock in/out with one tap' },
                        { icon: Calendar, title: 'Leave Requests', desc: 'Apply & approve instantly' },
                        { icon: Wallet, title: 'Payroll', desc: 'WPS-ready payslips' },
                        { icon: FileText, title: 'Documents', desc: 'Encrypted file vault' },
                        { icon: Users, title: 'Team Directory', desc: 'Complete employee profiles' },
                        { icon: Building2, title: 'Admin Dashboard', desc: 'Real-time HR insights' },
                      ].map((item) => (
                        <div
                          key={item.title}
                          className="flex flex-col items-center gap-2 rounded-xl border bg-background/80 p-4 text-center shadow-sm backdrop-blur"
                        >
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-accent/12">
                            <item.icon className="size-5 text-brand-accent-deep" />
                          </div>
                          <span className="text-sm font-medium">{item.title}</span>
                          <span className="text-xs text-muted-foreground">{item.desc}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </AnimatedGroup>
          </div>
        </section>
        <section className="bg-background pb-16 pt-16 md:pb-32">
          <div className="group relative m-auto max-w-5xl px-6">
            <div className="absolute inset-0 z-10 flex scale-95 items-center justify-center opacity-0 duration-500 group-hover:scale-100 group-hover:opacity-100">
              <Link href="/register" className="block text-sm duration-150 hover:opacity-75">
                <span>Start managing your team</span>
                <ChevronRight className="ml-1 inline-block size-3" />
              </Link>
            </div>
            <div className="group-hover:blur-xs mx-auto mt-12 grid max-w-2xl grid-cols-2 gap-x-8 gap-y-6 transition-all duration-500 group-hover:opacity-50 sm:grid-cols-3 sm:gap-x-16 sm:gap-y-10">
              {features.map((item) => (
                <div key={item.label} className="flex items-center justify-center gap-2 text-muted-foreground">
                  <item.icon className="size-5" />
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

const menuItems = [
  { name: 'Features', href: '#features' },
  { name: 'Pricing', href: '#pricing' },
  { name: 'About', href: '#about' },
];

const HeroHeader = () => {
  const [menuState, setMenuState] = React.useState(false);
  const [isScrolled, setIsScrolled] = React.useState(false);

  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header>
      <nav data-state={menuState && 'active'} className="group fixed z-20 w-full px-2">
        <div
          className={cn(
            'mx-auto mt-2 max-w-6xl px-6 transition-all duration-300 lg:px-12',
            isScrolled && 'bg-background/50 max-w-4xl rounded-2xl border backdrop-blur-lg lg:px-5',
          )}
        >
          <div className="relative flex flex-wrap items-center justify-between gap-6 py-3 lg:gap-0 lg:py-4">
            <div className="flex w-full justify-between lg:w-auto">
              <BrandLogo size="md" href="/" />

              <button
                onClick={() => setMenuState(!menuState)}
                aria-label={menuState ? 'Close Menu' : 'Open Menu'}
                className="relative z-20 -m-2.5 -mr-4 block cursor-pointer p-2.5 lg:hidden"
              >
                <Menu className="group-data-[state=active]:scale-0 group-data-[state=active]:rotate-180 group-data-[state=active]:opacity-0 m-auto size-6 duration-200" />
                <X className="group-data-[state=active]:rotate-0 group-data-[state=active]:scale-100 group-data-[state=active]:opacity-100 absolute inset-0 m-auto size-6 -rotate-180 scale-0 opacity-0 duration-200" />
              </button>
            </div>

            <div className="absolute inset-0 m-auto hidden size-fit lg:block">
              <ul className="flex gap-8 text-sm">
                {menuItems.map((item, index) => (
                  <li key={index}>
                    <Link href={item.href} className="text-muted-foreground hover:text-foreground block duration-150">
                      <span>{item.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-background group-data-[state=active]:block lg:group-data-[state=active]:flex mb-6 hidden w-full flex-wrap items-center justify-end space-y-8 rounded-3xl border p-6 shadow-2xl shadow-zinc-300/20 md:flex-nowrap lg:m-0 lg:flex lg:w-fit lg:gap-6 lg:space-y-0 lg:border-transparent lg:bg-transparent lg:p-0 lg:shadow-none">
              <div className="lg:hidden">
                <ul className="space-y-6 text-base">
                  {menuItems.map((item, index) => (
                    <li key={index}>
                      <Link href={item.href} className="text-muted-foreground hover:text-foreground block duration-150">
                        <span>{item.name}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex w-full flex-col space-y-3 sm:flex-row sm:gap-3 sm:space-y-0 md:w-fit">
                <Button asChild variant="outline" size="sm" className={cn(isScrolled && 'lg:hidden')}>
                  <Link href="/login">
                    <span>Login</span>
                  </Link>
                </Button>
                <Button asChild size="sm" className={cn(isScrolled && 'lg:hidden')}>
                  <Link href="/register">
                    <span>Sign Up</span>
                  </Link>
                </Button>
                <Button asChild size="sm" className={cn(isScrolled ? 'lg:inline-flex' : 'hidden')}>
                  <Link href="/register">
                    <span>Get Started</span>
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
};
