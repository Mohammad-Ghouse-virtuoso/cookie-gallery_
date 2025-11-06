// Skeleton component for loading states
import { cn } from '@/lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-gray-200', className)}
      {...props}
    />
  );
}

// Cookie Card Skeleton
export function CookieCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl shadow-xl p-5 flex flex-col items-center text-center border border-gray-100">
      <Skeleton className="w-40 h-40 sm:w-48 sm:h-48 rounded-xl mb-4" />
      <Skeleton className="h-6 w-32 mb-2" />
      <Skeleton className="h-5 w-20 mb-3" />
      <div className="flex items-center justify-center space-x-2 mb-2">
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-6 w-8" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
      <Skeleton className="h-4 w-24 mt-2" />
    </div>
  );
}
