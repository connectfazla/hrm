'use client';

import * as React from 'react';
import { useAuth } from '@/components/auth-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
import { Clock, Coffee, LogIn, LogOut, Play } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

type WorldClock = {
  label: string;
  flag: string;
  tz: string;
};

const WORLD_CLOCKS: WorldClock[] = [
  { label: 'Dubai, UAE', flag: '🇦🇪', tz: 'Asia/Dubai' },
  { label: 'Dhaka, BD',  flag: '🇧🇩', tz: 'Asia/Dhaka' },
  { label: 'Cairo, EG',  flag: '🇪🇬', tz: 'Africa/Cairo' },
];

function useNow() {
  const [now, setNow] = React.useState(() => new Date());
  React.useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function formatDuration(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
}

function useWorldClocks() {
  const [times, setTimes] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    const tick = () => {
      const now = new Date();
      const next: Record<string, string> = {};
      for (const c of WORLD_CLOCKS) {
        next[c.tz] = now.toLocaleTimeString('en-US', {
          timeZone: c.tz,
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        });
      }
      setTimes(next);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return times;
}

function useDate() {
  const [date, setDate] = React.useState('');
  React.useEffect(() => {
    setDate(
      new Date().toLocaleDateString('en-AE', {
        timeZone: 'Asia/Dubai',
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    );
    const id = setInterval(() => {
      setDate(
        new Date().toLocaleDateString('en-AE', {
          timeZone: 'Asia/Dubai',
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      );
    }, 60000);
    return () => clearInterval(id);
  }, []);
  return date;
}

export default function ClockPage() {
  const { state, logout } = useAuth();
  const worldTimes = useWorldClocks();
  const now = useNow();
  const todayDate = useDate();
  const [clockOutOpen, setClockOutOpen] = React.useState(false);
  const [comment, setComment] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [activeSession, setActiveSession] = React.useState<{ clockInAt: string; onLunch: boolean; lunchStartAt: string | null } | null>(null);
  const [checkingSession, setCheckingSession] = React.useState(true);

  const employeeId = state.status === 'authenticated' ? state.user.employeeId : null;

  const refreshActiveSession = React.useCallback(async () => {
    if (!employeeId) return;
    try {
      const r = await apiFetch<{
        sessions: Array<{
          id: string;
          clockInAt: string;
          clockOutAt: string | null;
          lunches: Array<{ startAt: string; endAt: string | null }>;
        }>;
      }>(`/attendance/${employeeId}/sessions?limit=1`);

      const s = r.sessions?.[0];
      if (s && !s.clockOutAt) {
        const activeLunch = s.lunches?.find((l) => !l.endAt) ?? null;
        setActiveSession({
          clockInAt: s.clockInAt,
          onLunch: Boolean(activeLunch),
          lunchStartAt: activeLunch?.startAt ?? null,
        });
      } else {
        setActiveSession(null);
      }
    } catch {
      // ignore
    }
  }, [employeeId]);

  React.useEffect(() => {
    if (!employeeId) {
      setCheckingSession(false);
      return;
    }
    refreshActiveSession().finally(() => setCheckingSession(false));
  }, [employeeId, refreshActiveSession]);

  const action = async (endpoint: string, body?: Record<string, unknown>) => {
    setSubmitting(true);
    try {
      const res = await apiFetch<any>(`/attendance/${endpoint}`, { method: 'POST', json: body ?? {} });
      toast.success(`${endpoint.replace(/-/g, ' ')} successful`);

      if (endpoint === 'clock-in') {
        const clockInAt = typeof res?.session?.clockInAt === 'string' ? res.session.clockInAt : new Date().toISOString();
        setActiveSession({ clockInAt, onLunch: false, lunchStartAt: null });
      } else if (endpoint === 'lunch-start') {
        const startAt = typeof res?.lunch?.startAt === 'string' ? res.lunch.startAt : new Date().toISOString();
        setActiveSession((prev) => (prev ? { ...prev, onLunch: true, lunchStartAt: startAt } : null));
      } else if (endpoint === 'lunch-end') {
        setActiveSession((prev) => (prev ? { ...prev, onLunch: false, lunchStartAt: null } : null));
      } else if (endpoint === 'clock-out') {
        setActiveSession(null);
      }
    } catch (e) {
      const msg = (e as Error).message ?? 'Request failed';
      toast.error(msg);
      // If the server says you're already clocked in (or lunch already started),
      // refresh local session state so buttons become usable immediately.
      if (/already clocked in/i.test(msg) || /lunch already started/i.test(msg) || /no active work session/i.test(msg)) {
        await refreshActiveSession();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleClockOut = async () => {
    if (comment.trim().length < 5) {
      toast.error('Please enter at least 5 characters about what you worked on.');
      return;
    }
    await action('clock-out', { comment });
    setClockOutOpen(false);
    setComment('');
  };

  if (state.status !== 'authenticated') return null;

  if (!employeeId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clock</h1>
          <p className="text-muted-foreground">Track your work hours, take lunch, and end your day.</p>
        </div>
        <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20">
          <CardContent className="flex flex-col items-center gap-3 py-10">
            <Clock className="h-10 w-10 text-amber-500 opacity-60" />
            <p className="text-sm font-medium text-amber-700 dark:text-amber-300">Your account is not linked to an employee profile.</p>
            <p className="text-xs text-amber-600 dark:text-amber-400">Please log out and log back in to refresh your session.</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={() => void logout()}>Sign out &amp; retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (checkingSession) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const uaeTime = worldTimes['Asia/Dubai'] ?? '--:--:--';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Clock</h1>
        <p className="text-muted-foreground">Track your work hours, take lunch, and end your day.</p>
      </div>

      {/* World Clocks */}
      <div className="grid gap-4 sm:grid-cols-3">
        {WORLD_CLOCKS.map((c) => (
          <Card key={c.tz} className={c.tz === 'Asia/Dubai' ? 'border-primary/40 bg-primary/5' : ''}>
            <CardContent className="flex items-center justify-between pt-5 pb-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{c.flag}</span>
                <div>
                  <p className="text-sm font-medium">{c.label}</p>
                  <p className="text-xs text-muted-foreground">{c.tz === 'Asia/Dubai' ? todayDate : ''}</p>
                </div>
              </div>
              <Badge variant={c.tz === 'Asia/Dubai' ? 'default' : 'outline'} className="text-base font-mono tabular-nums px-3 py-1.5">
                {worldTimes[c.tz] ?? '--:--:--'}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Session Status */}
      {activeSession && (
        <Card className="border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20">
          <CardContent className="flex items-center gap-4 pt-5 pb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
              <Clock className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                {activeSession.onLunch ? 'On Lunch Break' : 'Working'}
              </p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400">
                Clocked in at {new Date(activeSession.clockInAt).toLocaleTimeString('en-AE', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Dubai' })}
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                <Badge variant="outline" className="border-emerald-300/70 bg-white/40 font-mono tabular-nums text-emerald-700 dark:border-emerald-800/70 dark:bg-emerald-950/10 dark:text-emerald-200">
                  Elapsed {formatDuration(now.getTime() - new Date(activeSession.clockInAt).getTime())}
                </Badge>
                {activeSession.onLunch && activeSession.lunchStartAt && (
                  <Badge variant="outline" className="border-amber-300/70 bg-white/40 font-mono tabular-nums text-amber-700 dark:border-amber-800/70 dark:bg-amber-950/10 dark:text-amber-200">
                    Lunch {formatDuration(now.getTime() - new Date(activeSession.lunchStartAt).getTime())}
                  </Badge>
                )}
              </div>
            </div>
            <Badge variant={activeSession.onLunch ? 'warning' : 'success'}>
              {activeSession.onLunch ? 'Lunch' : 'Active'}
            </Badge>
          </CardContent>
        </Card>
      )}

      {/* Action Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${!activeSession ? 'hover:border-emerald-300 ring-1 ring-emerald-200/50' : 'opacity-60'}`}
          onClick={() => !submitting && !activeSession && action('clock-in')}
        >
          <CardContent className="flex flex-col items-center gap-3 pt-6 pb-5">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
              <LogIn className="h-7 w-7" />
            </div>
            <div className="text-center">
              <div className="font-semibold">Start Work</div>
              <div className="text-xs text-muted-foreground">Clock in for the day</div>
            </div>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${activeSession && !activeSession.onLunch ? 'hover:border-amber-300' : 'opacity-60'}`}
          onClick={() => !submitting && activeSession && !activeSession.onLunch && action('lunch-start')}
        >
          <CardContent className="flex flex-col items-center gap-3 pt-6 pb-5">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
              <Coffee className="h-7 w-7" />
            </div>
            <div className="text-center">
              <div className="font-semibold">Start Lunch</div>
              <div className="text-xs text-muted-foreground">Take a break</div>
            </div>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${activeSession?.onLunch ? 'hover:border-blue-300' : 'opacity-60'}`}
          onClick={() => !submitting && activeSession?.onLunch && action('lunch-end')}
        >
          <CardContent className="flex flex-col items-center gap-3 pt-6 pb-5">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
              <Play className="h-7 w-7" />
            </div>
            <div className="text-center">
              <div className="font-semibold">End Lunch</div>
              <div className="text-xs text-muted-foreground">Resume work</div>
            </div>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${activeSession ? 'hover:border-red-300' : 'opacity-60'}`}
          onClick={() => !submitting && activeSession && setClockOutOpen(true)}
        >
          <CardContent className="flex flex-col items-center gap-3 pt-6 pb-5">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
              <LogOut className="h-7 w-7" />
            </div>
            <div className="text-center">
              <div className="font-semibold">End Work</div>
              <div className="text-xs text-muted-foreground">Clock out for the day</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={clockOutOpen} onOpenChange={setClockOutOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>End your work day</DialogTitle>
            <DialogDescription>What did you work on today?</DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Describe what you accomplished today…"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setClockOutOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleClockOut} disabled={submitting}>
              {submitting ? 'Clocking out…' : 'Clock out'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
