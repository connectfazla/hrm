'use client';

import * as React from 'react';
import { useAuth } from '@/components/auth-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
import { Clock, Coffee, LogIn, LogOut, Play, Square } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

export default function ClockPage() {
  const { state } = useAuth();
  const [clockOutOpen, setClockOutOpen] = React.useState(false);
  const [comment, setComment] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [time, setTime] = React.useState('');

  React.useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('en-AE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const action = async (endpoint: string, body?: Record<string, unknown>) => {
    setSubmitting(true);
    try {
      await apiFetch(`/attendance/${endpoint}`, { method: 'POST', json: body ?? {} });
      toast.success(`${endpoint.replace('-', ' ')} successful`);
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Clock</h1>
        <p className="text-muted-foreground">Track your work hours, take lunch, and end your day.</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Current Time</CardTitle>
              <CardDescription>Dubai, UAE (GST)</CardDescription>
            </div>
            <Badge variant="outline" className="text-lg font-mono tabular-nums px-4 py-1.5">
              {time || '--:--:--'}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="cursor-pointer transition-colors hover:border-primary/50" onClick={() => !submitting && action('clock-in')}>
          <CardContent className="flex flex-col items-center gap-3 pt-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
              <LogIn className="h-6 w-6" />
            </div>
            <div className="text-center">
              <div className="font-semibold">Start Work</div>
              <div className="text-xs text-muted-foreground">Clock in for the day</div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer transition-colors hover:border-primary/50" onClick={() => !submitting && action('lunch-start')}>
          <CardContent className="flex flex-col items-center gap-3 pt-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
              <Coffee className="h-6 w-6" />
            </div>
            <div className="text-center">
              <div className="font-semibold">Start Lunch</div>
              <div className="text-xs text-muted-foreground">Take a break</div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer transition-colors hover:border-primary/50" onClick={() => !submitting && action('lunch-end')}>
          <CardContent className="flex flex-col items-center gap-3 pt-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
              <Play className="h-6 w-6" />
            </div>
            <div className="text-center">
              <div className="font-semibold">End Lunch</div>
              <div className="text-xs text-muted-foreground">Resume work</div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer transition-colors hover:border-destructive/50" onClick={() => !submitting && setClockOutOpen(true)}>
          <CardContent className="flex flex-col items-center gap-3 pt-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
              <LogOut className="h-6 w-6" />
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
