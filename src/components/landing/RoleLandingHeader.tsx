'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/providers/AuthProvider';

interface RoleLandingHeaderProps {
  title: string;
  /** Optional subtitle shown next to logo */
  subtitle?: string;
}

export function RoleLandingHeader({ title, subtitle }: RoleLandingHeaderProps) {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/logo.png" alt="Adogalo" width={36} height={36} className="h-9 w-auto" />
            <div>
              <span className="text-lg font-bold bg-gradient-to-r from-[#fd904c] to-[#e57835] bg-clip-text text-transparent">
                Adogalo
              </span>
              {subtitle && (
                <span className="ml-2 text-sm text-muted-foreground hidden sm:inline">· {subtitle}</span>
              )}
            </div>
          </Link>

          <div className="flex items-center gap-3">
            {user ? (
              <>
                <Link href="/dashboard">
                  <Button variant="outline" size="sm" className="rounded-full">
                    Dashboard
                  </Button>
                </Link>
                <Link href="/dashboard" className="flex items-center gap-2 rounded-lg hover:bg-muted/80 p-2 -m-2 transition-colors">
                  <Avatar className="h-8 w-8 ring-2 ring-[#fd904c]/30">
                    <AvatarImage src={user.avatar ?? undefined} />
                    <AvatarFallback className="bg-gradient-to-r from-[#fd904c] to-[#e57835] text-white text-sm">
                      {user.name?.charAt(0).toUpperCase() ?? 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline font-medium text-sm max-w-[100px] truncate">{user.name}</span>
                </Link>
              </>
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
