import { popularTVIds } from '@/lib/tmdb';

export async function generateStaticParams() {
  return popularTVIds.map((id) => ({
    id: id.toString(),
  }));
}

export default function TVLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
