import { CardSkeleton, Skeleton } from "@/components/ui/Bits";

export default function Loading() {
  return (
    <div className="space-y-7" aria-busy="true" aria-label="Carregando">
      <div className="space-y-2.5">
        <Skeleton className="h-2.5 w-28" />
        <Skeleton className="h-7 w-72 max-w-full" />
        <Skeleton className="h-3 w-96 max-w-full" />
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="panel space-y-3 p-3.5">
            <Skeleton className="h-7 w-7 rounded-[7px]" />
            <Skeleton className="h-6 w-12" />
            <Skeleton className="h-2.5 w-full" />
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-12">
        <div className="space-y-3 xl:col-span-8">
          <Skeleton className="h-2.5 w-32" />
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }, (_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        </div>
        <div className="space-y-3 xl:col-span-4">
          <Skeleton className="h-2.5 w-24" />
          <div className="panel divided overflow-hidden">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="flex items-center gap-3 p-3.5">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-2.5 w-2/3" />
                  <Skeleton className="h-2 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
