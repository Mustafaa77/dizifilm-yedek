import { MovieGridSkeleton } from '@/components/SkeletonLoader';

export default function Loading() {
    return (
        <div className="container mx-auto px-4 py-8">
            <div className="h-8 w-64 bg-muted rounded-full animate-pulse mb-8"></div>
            <MovieGridSkeleton count={10} />
        </div>
    );
}
