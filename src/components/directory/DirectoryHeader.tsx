'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/providers/AuthProvider';

export function DirectoryHeader() {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/logo.svg" alt="Adogalo" width={40} height={40} className="h-10 w-auto" />
            <span className="text-xl font-bold bg-gradient-to-r from-[#fd904c] to-[#e57835] bg-clip-text text-transparent">
              Adogalo
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            <Link href="/directory/vendors">
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
                Vendor
              </Button>
            </Link>
            <Link href="/directory/tukangs">
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
                Tukang
              </Button>
            </Link>
            <Link href="/directory/suppliers">
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
                Supplier
              </Button>
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            {user ? (
              <Link href="/dashboard">
                <Button size="sm" variant="outline">Dashboard</Button>
              </Link>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm">Masuk</Button>
                </Link>
                <Link href="/register">
                  <Button size="sm" className="bg-gradient-to-r from-[#fd904c] to-[#e57835] hover:opacity-90">
                    Daftar
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
