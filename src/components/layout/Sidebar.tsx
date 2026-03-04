'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/providers/AuthProvider';
import {
  Home,
  FolderKanban,
  Package,
  Users,
  Wallet,
  MessageSquare,
  Settings,
  FileText,
  Briefcase,
  Building2,
  Wrench,
  Truck,
  Shield,
  BarChart3,
  Bell,
  LogOut,
  ChevronDown,
  ChevronRight,
  Layers,
  UserCircle,
  CreditCard,
  ClipboardList,
  Star,
  MapPin,
  Search,
} from 'lucide-react';
import { useState } from 'react';
import Image from 'next/image';

interface NavItem {
  title: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
  children?: NavItem[];
}

const roleNavigation: Record<string, NavItem[]> = {
  CLIENT: [
    { title: 'Dashboard', href: '/dashboard', icon: <Home className="h-5 w-5" /> },
    { title: 'Proyek Saya', href: '/dashboard/projects', icon: <FolderKanban className="h-5 w-5" /> },
    { title: 'Material', href: '/dashboard/materials', icon: <Package className="h-5 w-5" /> },
    { title: 'Pembayaran', href: '/dashboard/payments', icon: <Wallet className="h-5 w-5" /> },
    { title: 'Direktori', href: '/directory/vendors', icon: <Search className="h-5 w-5" />, children: [
      { title: 'Cari Vendor', href: '/directory/vendors', icon: <Building2 className="h-4 w-4" /> },
      { title: 'Cari Tukang', href: '/directory/tukangs', icon: <Wrench className="h-4 w-4" /> },
      { title: 'Cari Supplier', href: '/directory/suppliers', icon: <Truck className="h-4 w-4" /> },
    ]},
    { title: 'Ulasan', href: '/dashboard/reviews', icon: <Star className="h-5 w-5" /> },
    { title: 'Pesan', href: '/dashboard/messages', icon: <MessageSquare className="h-5 w-5" /> },
    { title: 'Pengaturan', href: '/dashboard/settings', icon: <Settings className="h-5 w-5" /> },
  ],
  VENDOR: [
    { title: 'Dashboard', href: '/dashboard', icon: <Home className="h-5 w-5" /> },
    { title: 'Proyek Tersedia', href: '/dashboard/projects', icon: <FolderKanban className="h-5 w-5" /> },
    { title: 'Proyek Saya', href: '/dashboard/my-projects', icon: <Briefcase className="h-5 w-5" /> },
    { title: 'Material', href: '/dashboard/materials', icon: <Package className="h-5 w-5" /> },
    { title: 'RAB/BOQ', href: '/dashboard/boq', icon: <FileText className="h-5 w-5" /> },
    { title: 'Tim Kerja', href: '/dashboard/team', icon: <Users className="h-5 w-5" /> },
    { title: 'Pembayaran', href: '/dashboard/payments', icon: <Wallet className="h-5 w-5" /> },
    { title: 'Direktori Tukang', href: '/directory/tukangs', icon: <Wrench className="h-5 w-5" /> },
    { title: 'Ulasan', href: '/dashboard/reviews', icon: <Star className="h-5 w-5" /> },
    { title: 'Pesan', href: '/dashboard/messages', icon: <MessageSquare className="h-5 w-5" /> },
    { title: 'Pengaturan', href: '/dashboard/settings', icon: <Settings className="h-5 w-5" /> },
  ],
  TUKANG: [
    { title: 'Dashboard', href: '/dashboard', icon: <Home className="h-5 w-5" /> },
    { title: 'Cari Pekerjaan', href: '/dashboard/jobs', icon: <Briefcase className="h-5 w-5" /> },
    { title: 'Proyek Saya', href: '/dashboard/my-projects', icon: <FolderKanban className="h-5 w-5" /> },
    { title: 'Portofolio', href: '/dashboard/portfolio', icon: <Layers className="h-5 w-5" /> },
    { title: 'Langganan', href: '/dashboard/subscription', icon: <CreditCard className="h-5 w-5" /> },
    { title: 'Pembayaran', href: '/dashboard/payments', icon: <Wallet className="h-5 w-5" /> },
    { title: 'Direktori Vendor', href: '/directory/vendors', icon: <Building2 className="h-5 w-5" /> },
    { title: 'Ulasan', href: '/dashboard/reviews', icon: <Star className="h-5 w-5" /> },
    { title: 'Pesan', href: '/dashboard/messages', icon: <MessageSquare className="h-5 w-5" /> },
    { title: 'Pengaturan', href: '/dashboard/settings', icon: <Settings className="h-5 w-5" /> },
  ],
  SUPPLIER: [
    { title: 'Dashboard', href: '/dashboard', icon: <Home className="h-5 w-5" /> },
    { title: 'Permintaan Material', href: '/dashboard/requests', icon: <Package className="h-5 w-5" /> },
    { title: 'Penawaran Saya', href: '/dashboard/offers', icon: <ClipboardList className="h-5 w-5" /> },
    { title: 'Direktori Vendor', href: '/directory/vendors', icon: <Building2 className="h-5 w-5" /> },
    { title: 'Direktori Tukang', href: '/directory/tukangs', icon: <Wrench className="h-5 w-5" /> },
    { title: 'Langganan', href: '/dashboard/subscription', icon: <CreditCard className="h-5 w-5" /> },
    { title: 'Pembayaran', href: '/dashboard/payments', icon: <Wallet className="h-5 w-5" /> },
    { title: 'Ulasan', href: '/dashboard/reviews', icon: <Star className="h-5 w-5" /> },
    { title: 'Pesan', href: '/dashboard/messages', icon: <MessageSquare className="h-5 w-5" /> },
    { title: 'Pengaturan', href: '/dashboard/settings', icon: <Settings className="h-5 w-5" /> },
  ],
  ADMIN: [
    { title: 'Dashboard', href: '/dashboard', icon: <Home className="h-5 w-5" /> },
    { title: 'Verifikasi', href: '/dashboard/verification', icon: <Shield className="h-5 w-5" /> },
    { title: 'Manajemen User', href: '/dashboard/users', icon: <Users className="h-5 w-5" /> },
    { title: 'Semua Proyek', href: '/dashboard/projects', icon: <FolderKanban className="h-5 w-5" /> },
    { title: 'Material', href: '/dashboard/materials', icon: <Package className="h-5 w-5" /> },
    { title: 'Pembayaran', href: '/dashboard/payments', icon: <CreditCard className="h-5 w-5" /> },
    { title: 'Langganan', href: '/dashboard/subscriptions', icon: <CreditCard className="h-5 w-5" /> },
    { title: 'Kategori', href: '/dashboard/categories', icon: <Layers className="h-5 w-5" /> },
    { title: 'Kategori Material', href: '/dashboard/material-categories', icon: <Package className="h-5 w-5" /> },
    { title: 'Lokasi', href: '/dashboard/locations', icon: <MapPin className="h-5 w-5" /> },
    { title: 'Laporan', href: '/dashboard/reports', icon: <BarChart3 className="h-5 w-5" /> },
    { title: 'Pengaturan', href: '/dashboard/settings', icon: <Settings className="h-5 w-5" /> },
  ],
};

const roleLabels: Record<string, string> = {
  CLIENT: 'Klien',
  VENDOR: 'Vendor',
  TUKANG: 'Tukang',
  SUPPLIER: 'Supplier',
  ADMIN: 'Administrator',
};

const roleColors: Record<string, string> = {
  CLIENT: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  VENDOR: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  TUKANG: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  SUPPLIER: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  ADMIN: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const navigation = user?.role ? roleNavigation[user.role] : [];

  const toggleExpand = (title: string) => {
    setExpandedItems((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title]
    );
  };

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-full w-72 glass-sidebar transition-transform duration-300 ease-in-out',
          'lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-3 px-6 py-5 border-b border-border/50">
            <Image
              src="/logo.svg"
              alt="Adogalo"
              width={40}
              height={40}
              className="h-10 w-auto"
            />
            <span className="text-xl font-bold bg-gradient-to-r from-[#fd904c] to-[#e57835] bg-clip-text text-transparent">
              Adogalo
            </span>
          </div>

          {/* User Info */}
          {user && (
            <div className="px-4 py-4 border-b border-border/50">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#fd904c] to-[#e57835] flex items-center justify-center text-white font-semibold">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{user.name}</p>
                  <span className={cn('text-xs px-2 py-0.5 rounded-full', roleColors[user.role])}>
                    {roleLabels[user.role]}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4 px-3">
            <ul className="space-y-1">
              {navigation.map((item) => (
                <li key={item.href}>
                  {item.children ? (
                    <>
                      <button
                        onClick={() => toggleExpand(item.title)}
                        className={cn(
                          'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                          'hover:bg-[#fd904c]/10 hover:text-[#fd904c]',
                          isActive(item.href) && 'bg-[#fd904c]/10 text-[#fd904c]'
                        )}
                      >
                        {item.icon}
                        <span className="flex-1 text-left">{item.title}</span>
                        {expandedItems.includes(item.title) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>
                      {expandedItems.includes(item.title) && (
                        <ul className="ml-6 mt-1 space-y-1">
                          {item.children.map((child) => (
                            <li key={child.href}>
                              <Link
                                href={child.href}
                                onClick={onClose}
                                className={cn(
                                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all',
                                  'hover:bg-[#fd904c]/10 hover:text-[#fd904c]',
                                  isActive(child.href)
                                    ? 'bg-[#fd904c]/10 text-[#fd904c] font-medium'
                                    : 'text-muted-foreground'
                                )}
                              >
                                {child.icon}
                                <span>{child.title}</span>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </>
                  ) : (
                    <Link
                      href={item.href}
                      onClick={onClose}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                        'hover:bg-[#fd904c]/10 hover:text-[#fd904c]',
                        isActive(item.href)
                          ? 'bg-[#fd904c]/10 text-[#fd904c]'
                          : 'text-muted-foreground'
                      )}
                    >
                      {item.icon}
                      <span className="flex-1">{item.title}</span>
                      {item.badge && (
                        <span className="bg-[#fd904c] text-white text-xs px-2 py-0.5 rounded-full">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </nav>

          {/* Logout */}
          <div className="p-4 border-t border-border/50">
            <button
              onClick={logout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 transition-all"
            >
              <LogOut className="h-5 w-5" />
              <span>Keluar</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
