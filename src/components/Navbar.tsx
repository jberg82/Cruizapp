'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

export default function Navbar() {
  const { profile } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const handleSignOut = async () => {
    await signOut(auth);
    router.replace('/auth');
  };

  const isActive = (path: string) =>
    pathname === path || pathname.startsWith(path + '/');

  return (
    <nav className="h-14 bg-zinc-900 border-b border-zinc-800 flex items-center px-4 gap-4 shrink-0">
      <Link href="/chat" className="text-xl font-bold gradient-text shrink-0">
        CruizApp
      </Link>

      <div className="flex-1 flex items-center gap-1">
        <NavLink href="/chat" active={isActive('/chat')}>
          💬 Chat
        </NavLink>
        <NavLink href="/messages" active={isActive('/messages')}>
          ✉️ Messages
        </NavLink>
        <NavLink href="/profile" active={pathname === '/profile'}>
          👤 Profile
        </NavLink>
        {profile?.isAdmin && (
          <NavLink href="/admin" active={isActive('/admin')}>
            🛡️ Admin
          </NavLink>
        )}
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {profile && (
          <Link href="/profile" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-full overflow-hidden bg-zinc-700 ring-2 ring-transparent group-hover:ring-purple-500 transition-all">
              {profile.photoURL ? (
                <img
                  src={profile.photoURL}
                  alt={profile.username}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm text-zinc-400">
                  {profile.username[0]?.toUpperCase()}
                </div>
              )}
            </div>
            <span className="text-sm text-zinc-300 group-hover:text-white transition-colors hidden sm:block">
              {profile.username}
            </span>
          </Link>
        )}
        <button
          onClick={handleSignOut}
          className="text-xs text-zinc-500 hover:text-red-400 transition-colors px-2 py-1 rounded-lg hover:bg-red-900/20"
        >
          Sign Out
        </button>
      </div>
    </nav>
  );
}

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
        active
          ? 'bg-purple-600/20 text-purple-300'
          : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
      }`}
    >
      {children}
    </Link>
  );
}
