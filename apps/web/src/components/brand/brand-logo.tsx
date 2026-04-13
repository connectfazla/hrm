'use client';

import Link from 'next/link';
import { useId } from 'react';
import { cn } from '@/lib/utils';

const sizeClass = {
  sm: 'h-7 w-7',
  md: 'h-8 w-8',
  lg: 'h-10 w-10',
  xl: 'h-16 w-16',
  hero: 'h-16 w-16 md:h-24 md:w-24',
} as const;

type BrandLogoProps = {
  className?: string;
  size?: keyof typeof sizeClass;
  href?: string | null;
};

/** Inline mark (no remote fetch) — always matches deploy; gradient id is unique per instance. */
function BrandLogoMark({ className }: { className?: string }) {
  const raw = useId();
  const gid = `blg-${raw.replace(/:/g, '')}`;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden
      className={cn('shrink-0 object-contain', className)}
      width={48}
      height={48}
    >
      <defs>
        <linearGradient id={gid} x1="8" y1="6" x2="40" y2="42" gradientUnits="userSpaceOnUse">
          <stop stopColor="#73168C" />
          <stop offset="1" stopColor="#281259" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="12" fill={`url(#${gid})`} />
      <path
        fill="#fff"
        fillOpacity="0.95"
        d="M14 16h4v10c0 3.3 2.5 6 5.8 6h.4c3.3 0 5.8-2.7 5.8-6V16h4v10c0 5.5-4.3 10-9.8 10h-.4c-5.5 0-9.8-4.5-9.8-10V16Z"
      />
      <path fill="#fff" fillOpacity="0.35" d="M22 14h4v6h-4v-6Z" />
    </svg>
  );
}

/**
 * Product mark only (no wordmark). SVG is inlined so updates are not blocked by cached `/brand-logo.svg`.
 */
export function BrandLogo({ className, size = 'md', href = '/' }: BrandLogoProps) {
  const mark = <BrandLogoMark className={cn(sizeClass[size], className)} />;

  if (href === null) {
    return mark;
  }

  return (
    <Link
      href={href}
      className={cn(
        'inline-flex shrink-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      )}
      aria-label="Home"
    >
      {mark}
    </Link>
  );
}
