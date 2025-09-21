import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  )
}

// Specialized skeleton components for different content types
function CardSkeleton() {
  return (
    <div className="rounded-2xl border bg-card p-6 space-y-4 animate-pulse">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-3/4 rounded" />
        <Skeleton className="h-8 w-16 rounded-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-full rounded" />
        <Skeleton className="h-4 w-2/3 rounded" />
      </div>
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-1/3 rounded" />
        <Skeleton className="h-6 w-20 rounded" />
      </div>
    </div>
  )
}

function CardGridSkeleton({ cards = 6 }: { cards?: number }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: cards }).map((_, i) => (
        <div key={i} className="w-full h-full flex flex-col bg-card border border-border shadow-sm aspect-[9/11] sm:aspect-[9/11] lg:aspect-[9/12] xl:aspect-[9/12] overflow-hidden animate-pulse rounded-lg">
          {/* Header matching CentralizedCard */}
          <div className="pb-3 px-4 pt-4 flex-shrink-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <Skeleton className="h-5 w-3/4 rounded" />
                <Skeleton className="h-3 w-1/2 rounded mt-1" />
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Skeleton className="h-5 w-12 rounded-full" />
              </div>
            </div>
          </div>
          
          {/* Content matching CentralizedCard */}
          <div className="flex-1 flex flex-col justify-between px-4 pb-4 min-h-0">
            <div className="flex-1 space-y-3 min-h-0">
              {/* Amount section */}
              <div className="flex items-center justify-between p-3 bg-primary/5 rounded border border-primary/20">
                <div className="space-y-1">
                  <Skeleton className="h-3 w-12 rounded" />
                  <Skeleton className="h-4 w-16 rounded" />
                </div>
              </div>
              
              {/* Date section */}
              <div className="flex items-center gap-2 bg-muted/20 px-3 py-2 rounded">
                <Skeleton className="h-3 w-3 rounded" />
                <Skeleton className="h-3 w-16 rounded" />
              </div>
              
              {/* Metadata */}
              <div className="flex flex-col items-center gap-2">
                <div className="flex flex-col items-center gap-1">
                  <Skeleton className="h-5 w-5 rounded-full" />
                  <Skeleton className="h-3 w-20 rounded" />
                </div>
              </div>
            </div>
            
            {/* Actions */}
            <div className="pt-3 border-t border-muted flex-shrink-0">
              <div className="flex justify-evenly gap-2">
                <Skeleton className="w-8 h-8 rounded-full" />
                <Skeleton className="w-8 h-8 rounded-full" />
                <Skeleton className="w-8 h-8 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-2xl border bg-card overflow-hidden animate-pulse">
      <div className="border-b bg-muted/50 p-4">
        <div className="flex space-x-4">
          <Skeleton className="h-4 w-24 rounded" />
          <Skeleton className="h-4 w-20 rounded" />
          <Skeleton className="h-4 w-28 rounded" />
          <Skeleton className="h-4 w-16 rounded" />
          <Skeleton className="h-4 w-20 rounded" />
          <Skeleton className="h-4 w-24 rounded" />
          <Skeleton className="h-4 w-16 rounded ml-auto" />
        </div>
      </div>
      <div className="p-4 space-y-4">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center space-x-4 py-2 border-b border-muted/30 last:border-0">
            <Skeleton className="h-4 w-24 rounded" />
            <Skeleton className="h-4 w-20 rounded" />
            <Skeleton className="h-4 w-28 rounded" />
            <Skeleton className="h-4 w-16 rounded" />
            <Skeleton className="h-4 w-20 rounded" />
            <Skeleton className="h-4 w-24 rounded" />
            <div className="flex gap-1 ml-auto">
              <Skeleton className="h-6 w-6 rounded" />
              <Skeleton className="h-6 w-6 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function StatsSkeleton() {
  return (
    <div className="flex gap-1 sm:gap-3 md:gap-4 w-full">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex-1 h-[80px] sm:h-[150px] flex flex-col items-center justify-center bg-card border-2 border-primary/30 rounded-full shadow-sm animate-pulse">
          <div className="flex flex-col items-center justify-center space-y-0 p-1 sm:pb-1 md:pb-1 sm:px-2 md:px-3 sm:pt-1 md:pt-2">
            <div className="hidden sm:block p-1 md:p-2 rounded-full bg-primary/10 mb-1 md:mb-1">
              <Skeleton className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 rounded-full" />
            </div>
            <Skeleton className="h-2 sm:h-3 md:h-4 w-12 sm:w-16 md:w-20 rounded" />
          </div>
          <div className="flex items-center justify-center pt-0 pb-1 sm:pb-1 md:pb-2 px-1 sm:px-2 md:px-3">
            <Skeleton className="h-3 sm:h-4 md:h-6 w-6 sm:w-8 md:w-12 rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}

function PageSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-32 rounded-full" />
      </div>
      
      {/* Stats Grid */}
      <StatsSkeleton />
      
      {/* Search Filter */}
      <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
        <Skeleton className="h-10 flex-1 rounded-2xl" />
        <Skeleton className="h-10 w-32 rounded-2xl" />
      </div>
      
      {/* Content Grid */}
      <CardGridSkeleton />
    </div>
  )
}

function PageTableSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-32 rounded-full" />
      </div>
      
      {/* Stats Grid */}
      <StatsSkeleton />
      
      {/* Search Filter */}
      <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
        <Skeleton className="h-10 flex-1 rounded-2xl" />
        <Skeleton className="h-10 w-32 rounded-2xl" />
      </div>
      
      {/* Table Content */}
      <TableSkeleton rows={8} />
    </div>
  )
}

function PageTableSkeletonWithStats() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
        </div>
        <Skeleton className="h-10 w-32 rounded-full" />
      </div>
      
      {/* Stats Grid */}
      <StatsSkeleton />
      
      {/* Search Filter */}
      <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
        <Skeleton className="h-10 flex-1 rounded-2xl" />
        <Skeleton className="h-10 w-32 rounded-2xl" />
      </div>
      
      {/* Table Content */}
      <TableSkeleton rows={8} />
    </div>
  )
}

export { Skeleton, CardSkeleton, CardGridSkeleton, TableSkeleton, StatsSkeleton, PageSkeleton, PageTableSkeleton, PageTableSkeletonWithStats }