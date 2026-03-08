'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function ChatIndex() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) router.replace('/auth');
      else if (!profile) router.replace('/profile/setup');
      else router.replace('/chat/lobby');
    }
  }, [user, profile, loading, router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-zinc-950">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500" />
    </div>
  );
}
