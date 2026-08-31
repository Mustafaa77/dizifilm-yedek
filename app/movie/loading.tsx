import { MovieGridSkeleton } from '@/components/SkeletonLoader';

export default function Loading() {
    return (
        <div className="container mx-auto px-4 py-8">
            <div className="h-10 w-48 bg-muted rounded-full animate-pulse mb-8"></div>
            <MovieGridSkeleton count={15} />
        </div>
    );
}
