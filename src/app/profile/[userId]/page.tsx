'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { UserProfile, Conversation } from '@/lib/types';
import Navbar from '@/components/Navbar';

const HIV_LABELS: Record<string, string> = {
  negative: 'Negative',
  positive: 'Positive',
  undetectable: 'Undetectable',
};

const GENDER_LABELS: Record<string, string> = {
  male: 'Male',
  female: 'Female',
  trans: 'Trans',
};

export default function ViewProfilePage() {
  const { user, profile: myProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const userId = params.userId as string;

  const [viewedProfile, setViewedProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [startingChat, setStartingChat] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/auth');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!userId) return;
    // If viewing own profile, redirect
    if (user && userId === user.uid) {
      router.replace('/profile');
      return;
    }
    getDoc(doc(db, 'users', userId)).then((snap) => {
      if (snap.exists()) {
        setViewedProfile(snap.data() as UserProfile);
      }
      setLoadingProfile(false);
    });
  }, [userId, user, router]);

  const handleMessage = async () => {
    if (!user || !myProfile || !viewedProfile) return;
    setStartingChat(true);

    try {
      const conversationId = [user.uid, userId].sort().join('_');
      const convRef = doc(db, 'conversations', conversationId);
      const convSnap = await getDoc(convRef);

      if (!convSnap.exists()) {
        const conversation: Omit<Conversation, 'id'> = {
          participants: [user.uid, userId],
          participantUsernames: {
            [user.uid]: myProfile.username,
            [userId]: viewedProfile.username,
          },
          participantPhotos: {
            [user.uid]: myProfile.photoURL,
            [userId]: viewedProfile.photoURL,
          },
          lastMessage: '',
          lastMessageAt: Date.now(),
        };
        await setDoc(convRef, conversation);
      }

      router.push(`/messages/${conversationId}`);
    } catch (err) {
      console.error('Failed to start conversation:', err);
    } finally {
      setStartingChat(false);
    }
  };

  if (authLoading || loadingProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-950">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-purple-500" />
      </div>
    );
  }

  if (!viewedProfile) {
    return (
      <div className="flex flex-col h-screen bg-zinc-950">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center text-zinc-400">
            <p className="text-5xl mb-4">👻</p>
            <p className="text-xl font-semibold text-white mb-2">User not found</p>
            <p className="text-sm">This profile doesn&apos;t exist or was deleted.</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-zinc-950">
      <Navbar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-10">
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
            {/* Cover */}
            <div className="h-32 bg-gradient-to-r from-purple-900/50 to-pink-900/50" />

            <div className="px-6 pb-6">
              {/* Avatar + actions */}
              <div className="-mt-14 mb-4 flex items-end justify-between">
                <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-zinc-900 bg-zinc-700">
                  {viewedProfile.photoURL ? (
                    <img
                      src={viewedProfile.photoURL}
                      alt={viewedProfile.username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl text-zinc-400 font-bold">
                      {viewedProfile.username[0]?.toUpperCase()}
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleMessage}
                    disabled={startingChat}
                    className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-50"
                  >
                    {startingChat ? 'Opening...' : '✉️ Message'}
                  </button>
                </div>
              </div>

              {/* Profile info */}
              <div className="space-y-4">
                <div>
                  <h1 className="text-2xl font-bold text-white">{viewedProfile.username}</h1>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Badge>{viewedProfile.age} yrs</Badge>
                    <Badge>{GENDER_LABELS[viewedProfile.gender]}</Badge>
                    <Badge color="pink">HIV: {HIV_LABELS[viewedProfile.hivStatus]}</Badge>
                    {viewedProfile.isAdmin && <Badge color="purple">Admin</Badge>}
                  </div>
                </div>

                {viewedProfile.aboutMe && (
                  <div>
                    <p className="text-xs text-zinc-500 uppercase font-semibold tracking-wider mb-1">About Me</p>
                    <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap">
                      {viewedProfile.aboutMe}
                    </p>
                  </div>
                )}

                <div className="text-xs text-zinc-600 border-t border-zinc-800 pt-4">
                  Member since {new Date(viewedProfile.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function Badge({ children, color = 'zinc' }: { children: React.ReactNode; color?: string }) {
  const colors: Record<string, string> = {
    zinc: 'bg-zinc-800 text-zinc-300 border-zinc-700',
    pink: 'bg-pink-900/30 text-pink-300 border-pink-800',
    purple: 'bg-purple-900/30 text-purple-300 border-purple-800',
  };
  return (
    <span className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${colors[color] || colors.zinc}`}>
      {children}
    </span>
  );
}
