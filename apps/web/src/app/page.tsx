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
      <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-xs font-bold text-primary-foreground">U</span>
            </div>
            <span className="font-semibold tracking-tight">Uppearance</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/register">Get started</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,hsl(var(--muted))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--muted))_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)]" />
          <div className="mx-auto max-w-6xl px-4 py-24 md:px-6 md:py-32 lg:py-40">
            <div className="mx-auto max-w-3xl text-center">
              <div className="mb-4 inline-flex items-center rounded-full border border-border/60 bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground">
                Built for UAE teams
              </div>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
                HR management that{" "}
                <span className="bg-gradient-to-r from-chart-1 to-chart-2 bg-clip-text text-transparent">
                  just works
                </span>
              </h1>
              <p className="mt-6 text-lg text-muted-foreground md:text-xl">
                Attendance, leave, payroll, and documents — all in one clean workspace.
                Designed for small teams in the UAE, compliant with Labour Law.
              </p>
              <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Button size="lg" asChild>
                  <Link href="/register">
                    Start for free <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <Link href="/login">Sign in to your account</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-border/40 bg-muted/30">
          <div className="mx-auto max-w-6xl px-4 py-20 md:px-6 md:py-28">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Everything your team needs
              </h2>
              <p className="mt-3 text-muted-foreground">
                From clock-in to payslip — manage your entire HR workflow without the complexity.
              </p>
            </div>
            <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((f) => (
                <div
                  key={f.title}
                  className="group rounded-xl border border-border/60 bg-card p-6 transition-colors hover:border-border hover:shadow-sm"
                >
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/5 text-primary group-hover:bg-primary/10">
                    <f.icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {f.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/40">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6 md:px-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="h-5 w-5 rounded bg-primary flex items-center justify-center">
              <span className="text-[10px] font-bold text-primary-foreground">U</span>
            </div>
            Uppearance HRMS
          </div>
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Uppearance. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
