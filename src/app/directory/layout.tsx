import { DirectoryHeader } from '@/components/directory/DirectoryHeader';

export default function DirectoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <DirectoryHeader />
      <main className="flex-1">{children}</main>
    </div>
  );
}
