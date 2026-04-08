import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <div className="w-full max-w-3xl rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-start justify-between gap-6">
          <div className="space-y-2">
            <div className="text-sm font-medium text-zinc-500">Upappearance</div>
            <h1 className="text-2xl font-semibold tracking-tight">HRMS</h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Attendance, leave, documents and payroll — built for a small team.
            </p>
          </div>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Sign in <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
            <div className="text-sm font-medium">Time tracking</div>
            <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Clock in/out, lunch breaks, late rules.</div>
          </div>
          <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
            <div className="text-sm font-medium">Leave</div>
            <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Request, approve, balances and deductions.</div>
          </div>
          <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
            <div className="text-sm font-medium">Documents</div>
            <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Encrypted vault + expiry alerts.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
