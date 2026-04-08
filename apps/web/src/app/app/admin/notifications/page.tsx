'use client';

import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
import { Bell, AlertTriangle, CalendarDays, DollarSign, MessageSquare } from 'lucide-react';

type Notification = { id: string; type: string; title: string; body: string; readAt: string | null; createdAt: string };

function typeConfig(type: string) {
  switch (type) {
    case 'LEAVE_APPROVAL_PENDING': return { variant: 'warning' as const, icon: CalendarDays, label: 'Leave Pending' };
    case 'DOCUMENT_EXPIRY_WARNING': return { variant: 'destructive' as const, icon: AlertTriangle, label: 'Doc Expiry' };
    case 'LEAVE_DECISION': return { variant: 'secondary' as const, icon: CalendarDays, label: 'Leave Decision' };
    case 'SALARY_CHANGED': return { variant: 'success' as const, icon: DollarSign, label: 'Salary' };
    default: return { variant: 'secondary' as const, icon: MessageSquare, label: 'Message' };
  }
}

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    apiFetch<{ notifications: Notification[] }>('/notifications')
      .then((res) => setNotifications(res.notifications))
      .catch(() => toast.error('Failed to load notifications'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
        <p className="text-muted-foreground">System alerts and pending actions.</p>
      </div>

      {notifications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Bell className="mb-3 h-8 w-8 opacity-40" />
            <p className="text-sm">No notifications yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => {
            const cfg = typeConfig(n.type);
            const Icon = cfg.icon;
            return (
              <Card key={n.id} className={n.readAt ? 'opacity-60' : ''}>
                <CardContent className="flex items-start gap-4 py-4">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{n.title}</span>
                      <Badge variant={cfg.variant}>{cfg.label}</Badge>
                    </div>
                    <p className="whitespace-pre-line text-sm text-muted-foreground">{n.body}</p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">{new Date(n.createdAt).toLocaleDateString('en-AE')}</span>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
