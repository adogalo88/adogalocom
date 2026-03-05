'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/providers/AuthProvider';
import { LayoutDashboard, FolderPlus, Package } from 'lucide-react';

export function DirectoryHeader() {
  const { user } = useAuth();
  const role = user?.role;
  const showBuatProyek = role === 'VENDOR' || role === 'CLIENT';
  const showPermintaanMaterial = role === 'VENDOR' || role === 'CLIENT';
  const isSupplier = role === 'SUPPLIER';

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
            {!isSupplier && (
              <Link href="/directory/suppliers">
                <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
                  Supplier
                </Button>
              </Link>
            )}
            {user && (
              <>
                {showBuatProyek && (
                  <Link href="/dashboard/projects/create">
                    <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground ml-2">
                      <FolderPlus className="h-4 w-4" />
                      Buat Proyek
                    </Button>
                  </Link>
                )}
                {showPermintaanMaterial && (
                  <Link href="/dashboard/materials/create">
                    <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
                      <Package className="h-4 w-4" />
                      Permintaan Material
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                        Beta
                      </span>
                    </Button>
                  </Link>
                )}
              </>
            )}
          </nav>

          <div className="flex items-center gap-2">
            {user ? (
              <Link href="/dashboard">
                <Button size="sm" className="gap-2 bg-gradient-to-r from-[#fd904c] to-[#e57835] hover:opacity-90">
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </Button>
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
