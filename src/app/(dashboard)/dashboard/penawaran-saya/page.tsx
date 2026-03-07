'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

/**
 * Redirect /dashboard/penawaran-saya -> /dashboard/my-projects?tab=penawaran-saya
 * Content has been merged into Proyek Saya page.
 */
export default function PenawaranSayaPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/my-projects?tab=penawaran-saya');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[300px]">
      <Loader2 className="h-8 w-8 animate-spin text-[#fd904c]" />
    </div>
  );
}
