'use client';

import { Toaster } from 'sonner';

export function AppToaster() {
  return (
    <Toaster
      richColors
      position="top-right"
      toastOptions={{
        classNames: {
          toast: 'border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950',
          title: 'text-zinc-900 dark:text-zinc-50',
          description: 'text-zinc-600 dark:text-zinc-400',
        },
      }}
    />
  );
}

