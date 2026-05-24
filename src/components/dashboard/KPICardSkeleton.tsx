// src/components/dashboard/KPICardSkeleton.tsx
import { Skeleton } from "@/components/common/Skeleton";

export function KPICardSkeleton() {
  return (
    <div className="bg-gray-950 border border-gray-800 rounded-3xl p-6">
      <div className="flex justify-between">
        <div className="space-y-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-3 w-40" />
        </div>
        <Skeleton className="h-14 w-14 rounded-2xl" />
      </div>
    </div>
  );
}