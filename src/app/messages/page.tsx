'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Conversation } from '@/lib/types';
import Navbar from '@/components/Navbar';
import { formatDistanceToNow } from 'date-fns';

export default function MessagesPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [convsLoading, setConvsLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.replace('/auth');
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', user.uid),
      orderBy('lastMessageAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Conversation));
      setConversations(data);
      setConvsLoading(false);
    });
    return () => unsub();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-950">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-purple-500" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-zinc-950">
      <Navbar />
      <main className="flex-1 flex overflow-hidden">
        {/* Conversation list */}
        <aside className="w-full max-w-sm bg-zinc-900 border-r border-zinc-800 flex flex-col">
          <div className="p-4 border-b border-zinc-800">
            <h2 className="font-semibold text-white text-lg">Direct Messages</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {convsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-purple-500" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-12 px-4 text-zinc-500 text-sm">
                <p className="text-3xl mb-2">💬</p>
                <p>No conversations yet.</p>
                <p className="mt-1">Click on a user profile in chat to start messaging.</p>
              </div>
            ) : (
              conversations.map((conv) => {
                const otherUserId = conv.participants.find((p) => p !== user?.uid) ?? '';
                const otherUsername = conv.participantUsernames?.[otherUserId] ?? 'Unknown';
                const otherPhoto = conv.participantPhotos?.[otherUserId] ?? '';
                return (
                  <Link
                    key={conv.id}
                    href={`/messages/${conv.id}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-800 transition-colors border-b border-zinc-800/50"
                  >
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-700 shrink-0">
                      {otherPhoto ? (
                        <img src={otherPhoto} alt={otherUsername} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-400 font-medium">
                          {otherUsername[0]?.toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-white text-sm">{otherUsername}</span>
                        {conv.lastMessageAt > 0 && (
                          <span className="text-xs text-zinc-500">
                            {formatDistanceToNow(new Date(conv.lastMessageAt), { addSuffix: true })}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500 truncate mt-0.5">{conv.lastMessage || 'No messages yet'}</p>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </aside>

        {/* Empty right panel */}
        <div className="flex-1 hidden md:flex items-center justify-center text-zinc-600">
          <div className="text-center">
            <p className="text-4xl mb-3">✉️</p>
            <p className="text-lg font-medium text-zinc-400">Select a conversation</p>
            <p className="text-sm mt-1">or start one from a user&apos;s profile</p>
          </div>
        </div>
      </main>
    </div>
  );
}
