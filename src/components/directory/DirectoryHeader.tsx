'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/providers/AuthProvider';

export function DirectoryHeader() {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/logo.png" alt="Adogalo" width={40} height={40} className="h-10 w-auto" />
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
              <Link href="/dashboard" className="flex items-center gap-2 rounded-lg hover:bg-muted/80 px-2 py-1.5 -mx-2 transition-colors">
                <Avatar className="h-8 w-8 ring-2 ring-[#fd904c]/30">
                  <AvatarImage src={user.avatar ?? undefined} />
                  <AvatarFallback className="bg-gradient-to-r from-[#fd904c] to-[#e57835] text-white text-sm">
                    {user.name?.charAt(0).toUpperCase() ?? 'U'}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden sm:inline font-medium text-sm max-w-[120px] truncate">{user.name}</span>
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
