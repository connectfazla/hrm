import Link from 'next/link';
import { cn } from '@/lib/utils';

const sizeClass = {
  sm: 'h-7 w-7',
  md: 'h-8 w-8',
  lg: 'h-10 w-10',
  xl: 'h-16 w-16',
} as const;

type BrandLogoProps = {
  className?: string;
  size?: keyof typeof sizeClass;
  href?: string | null;
};

/**
 * Product mark only (no wordmark). Replace `public/brand-logo.svg` with your asset;
 * keep the same filename or update the `src` below.
 */
export function BrandLogo({ className, size = 'md', href = '/' }: BrandLogoProps) {
  const img = (
    <img
      src="/brand-logo.svg"
      alt=""
      aria-hidden
      className={cn('shrink-0 object-contain', sizeClass[size], className)}
      width={48}
      height={48}
    />
  );

  if (href === null) {
    return img;
  }

  return (
    <Link href={href} className={cn('inline-flex shrink-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2')} aria-label="Home">
      {img}
    </Link>
  );
}
