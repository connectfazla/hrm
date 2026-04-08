'use client';

import { useAuth } from '@/components/auth-provider';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';

export default function ClockPage() {
  const { state } = useAuth();

  const clockIn = async () => {
    try {
      await apiFetch('/attendance/clock-in', { method: 'POST' });
      toast.success('Clocked in');
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const lunchStart = async () => {
    try {
      await apiFetch('/attendance/lunch-start', { method: 'POST' });
      toast.success('Lunch started');
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const lunchEnd = async () => {
    try {
      await apiFetch('/attendance/lunch-end', { method: 'POST' });
      toast.success('Lunch ended');
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const clockOut = async () => {
    const comment = window.prompt('What did you work on today?');
    if (!comment || comment.trim().length < 5) return;
    try {
      await apiFetch('/attendance/clock-out', { method: 'POST', json: { comment } });
      toast.success('Clocked out');
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  if (state.status !== 'authenticated') return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Clock</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Start work, take lunch, and end your day.</p>
      </div>

      <Card>
        <CardHeader>
          <div className="text-sm font-medium">Actions</div>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button onClick={clockIn}>Start Work</Button>
          <Button variant="secondary" onClick={lunchStart}>
            Start Lunch
          </Button>
          <Button variant="secondary" onClick={lunchEnd}>
            End Lunch
          </Button>
          <Button variant="danger" onClick={clockOut}>
            End Work
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="text-sm font-medium">Tip</div>
        </CardHeader>
        <CardContent className="text-sm text-zinc-600 dark:text-zinc-400">
          Your clock-in time is compared against the company start time (default 9:00 AM) and grace period.
        </CardContent>
      </Card>
    </div>
  );
}

