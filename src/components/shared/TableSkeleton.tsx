import { Skeleton } from "@/components/ui/skeleton";

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

export function TableSkeleton({ rows = 5, columns = 5 }: TableSkeletonProps) {
  return (
    <div className="rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-4 px-4 py-2.5 border-b bg-muted/30">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-3 rounded" style={{ width: `${60 + (i * 17) % 60}px` }} />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3 border-b last:border-0">
          <Skeleton className="h-8 w-8 rounded-full shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-32 rounded" />
            <Skeleton className="h-2.5 w-24 rounded" />
          </div>
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-3 w-20 rounded hidden md:block" />
          <Skeleton className="h-3 w-14 rounded hidden lg:block" />
        </div>
      ))}
    </div>
  );
}
