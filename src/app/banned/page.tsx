'use client';

import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export default function BannedPage() {
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut(auth);
    router.replace('/auth');
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-zinc-950 px-4">
      <div className="text-center max-w-sm">
        <p className="text-6xl mb-4">🚫</p>
        <h1 className="text-2xl font-bold text-white mb-2">Account Suspended</h1>
        <p className="text-zinc-400 text-sm mb-6">
          Your account has been suspended. If you believe this is a mistake, please contact support.
        </p>
        <button
          onClick={handleSignOut}
          className="px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-sm transition-colors"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
