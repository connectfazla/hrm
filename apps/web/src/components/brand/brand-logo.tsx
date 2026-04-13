'use client';

import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import logoDark from '@/assets/uppearance-logo-dark.png';

const sizeClass = {
  sm: 'h-6',
  md: 'h-7',
  lg: 'h-9',
  xl: 'h-12',
  hero: 'h-14 md:h-16',
} as const;

type BrandLogoProps = {
  className?: string;
  size?: keyof typeof sizeClass;
  href?: string | null;
};

/**
 * Single logo used across the app (no text fallback).
 * Uses a bundled image import so deployments cannot get stuck behind public asset caching.
 */
export function BrandLogo({ className, size = 'md', href = '/' }: BrandLogoProps) {
  const mark = (
    <Image
      src={logoDark}
      alt="Uppearance"
      priority={size === 'hero'}
      className={cn('w-auto select-none object-contain', sizeClass[size], className)}
    />
  );

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
