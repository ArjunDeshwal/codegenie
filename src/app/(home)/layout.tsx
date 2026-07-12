import { Navbar } from '@/modules/home/ui/components/navbar';

export default function HomeLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-background">
      <Navbar />
      <div className="relative flex flex-1 flex-col">{children}</div>
    </main>
  );
}
