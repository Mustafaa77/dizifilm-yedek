export async function generateStaticParams() {
  return [{ roomId: 'demo' }];
}

export default function WatchPartyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
