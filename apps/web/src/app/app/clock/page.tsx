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
          second: '2-digit',
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
  const { state } = useAuth();
  const worldTimes = useWorldClocks();
  const todayDate = useDate();
  const [clockOutOpen, setClockOutOpen] = React.useState(false);
  const [comment, setComment] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [activeSession, setActiveSession] = React.useState<{ clockInAt: string; onLunch: boolean } | null>(null);
  const [checkingSession, setCheckingSession] = React.useState(true);

  const employeeId = state.status === 'authenticated' ? state.user.employeeId : null;

  React.useEffect(() => {
    if (!employeeId) {
      setCheckingSession(false);
      return;
    }
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString().slice(0, 10);
    apiFetch<{ sessions: Array<{ id: string; clockInAt: string; clockOutAt: string | null; lunches: Array<{ endAt: string | null }> }> }>(
      `/attendance/${employeeId}/sessions?from=${todayStart}&to=${now.toISOString().slice(0, 10)}&limit=1`
    )
      .then((r) => {
        const s = r.sessions?.[0];
        if (s && !s.clockOutAt) {
          const onLunch = s.lunches?.some(l => !l.endAt) ?? false;
          setActiveSession({ clockInAt: s.clockInAt, onLunch });
        }
      })
      .catch(() => {})
      .finally(() => setCheckingSession(false));
  }, [employeeId]);

  const action = async (endpoint: string, body?: Record<string, unknown>) => {
    setSubmitting(true);
    try {
      await apiFetch(`/attendance/${endpoint}`, { method: 'POST', json: body ?? {} });
      toast.success(`${endpoint.replace(/-/g, ' ')} successful`);

      if (endpoint === 'clock-in') {
        setActiveSession({ clockInAt: new Date().toISOString(), onLunch: false });
      } else if (endpoint === 'lunch-start') {
        setActiveSession(prev => prev ? { ...prev, onLunch: true } : null);
      } else if (endpoint === 'lunch-end') {
        setActiveSession(prev => prev ? { ...prev, onLunch: false } : null);
      } else if (endpoint === 'clock-out') {
        setActiveSession(null);
      }
    } catch (e) {
      toast.error((e as Error).message);
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
