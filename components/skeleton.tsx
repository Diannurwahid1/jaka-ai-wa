import { cn } from "@/lib/utils";

export function Skeleton({
  className
}: {
  className?: string;
}) {
  return <div className={cn("skeleton-block rounded-2xl", className)} aria-hidden="true" />;
}

export function SkeletonLines({
  rows = 3,
  className
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)} aria-hidden="true">
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton
          key={index}
          className={cn(
            "h-3.5",
            index === rows - 1 ? "w-2/3" : "w-full"
          )}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({
  className,
  rows = 3
}: {
  className?: string;
  rows?: number;
}) {
  return (
    <div className={cn("rounded-[28px] border border-slate-200/60 bg-white p-4 shadow-panel sm:rounded-[32px] sm:p-6", className)}>
      <Skeleton className="h-4 w-28" />
      <Skeleton className="mt-4 h-8 w-24" />
      <SkeletonLines rows={rows} className="mt-4" />
    </div>
  );
}
