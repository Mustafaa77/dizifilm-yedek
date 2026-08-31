import { MovieGridSkeleton } from '@/components/SkeletonLoader';

export default function Loading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-4 md:space-y-6">
        <div className="h-8 w-48 bg-muted rounded animate-pulse mb-6"></div>
        <MovieGridSkeleton count={10} />
      </div>
    </div>
  );
}
