import { popularMovieIds } from '@/lib/tmdb';

export async function generateStaticParams() {
  return popularMovieIds.map((id) => ({
    id: id.toString(),
  }));
}

export default function MovieLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
