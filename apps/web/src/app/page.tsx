import Link from "next/link";
import {
  ArrowRight,
  Clock,
  CalendarDays,
  Shield,
  FileText,
  Banknote,
  Bell,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: Clock,
    title: "Time Tracking",
    description: "Clock in/out with automatic late detection, lunch breaks, and detailed timesheets.",
  },
  {
    icon: CalendarDays,
    title: "Leave Management",
    description: "UAE Labour Law compliant leave types with accrual, requests, and balance tracking.",
  },
  {
    icon: Banknote,
    title: "Payroll & Salary",
    description: "Monthly payroll runs, payslip generation, salary history, and CSV exports.",
  },
  {
    icon: FileText,
    title: "Document Vault",
    description: "Encrypted storage for employee documents with expiry tracking and alerts.",
  },
  {
    icon: Shield,
    title: "Compliance",
    description: "Built for UAE regulations — probation tracking, WPS-ready data, and audit logs.",
  },
  {
    icon: Bell,
    title: "Smart Alerts",
    description: "Automatic notifications for expiring documents, pending requests, and policy deadlines.",
  },
];

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-primary flex items-center justify-center shadow-sm">
              <span className="text-sm font-bold text-primary-foreground">U</span>
            </div>
            <span className="font-semibold tracking-tight text-lg">Uppearance</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
            <Button size="sm" className="shadow-sm" asChild>
              <Link href="/register">Get started</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,hsl(var(--primary)/0.04)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--primary)/0.04)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)]" />
          <div className="absolute left-1/2 top-0 -z-10 h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-primary/5 blur-3xl" />
          <div className="mx-auto max-w-6xl px-4 py-24 md:px-6 md:py-32 lg:py-44">
            <div className="mx-auto max-w-3xl text-center">
              <div className="mb-6 inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary">
                Built for UAE teams
              </div>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
                HR management that{" "}
                <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  just works
                </span>
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl leading-relaxed">
                Attendance, leave, payroll, and documents — all in one clean workspace.
                Designed for small teams in the UAE, compliant with Labour Law.
              </p>
              <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Button size="lg" className="h-12 px-8 text-base shadow-md" asChild>
                  <Link href="/register">
                    Start for free <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button variant="outline" size="lg" className="h-12 px-8 text-base" asChild>
                  <Link href="/login">Sign in to your account</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-border/40 bg-muted/20">
          <div className="mx-auto max-w-6xl px-4 py-24 md:px-6 md:py-32">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Everything your team needs
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                From clock-in to payslip — manage your entire HR workflow without the complexity.
              </p>
            </div>
            <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((f, i) => (
                <div
                  key={f.title}
                  className="group rounded-2xl border border-border/50 bg-card p-7 transition-all duration-200 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/8 text-primary transition-colors group-hover:bg-primary/12">
                    <f.icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-semibold">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {f.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/40 bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-8 md:px-6">
          <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
            <div className="h-6 w-6 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-[10px] font-bold text-primary-foreground">U</span>
            </div>
            <span className="font-medium">Uppearance HRMS</span>
          </div>
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Uppearance. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
