'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Conversation, DirectMessage } from '@/lib/types';
import Navbar from '@/components/Navbar';
import { formatDistanceToNow } from 'date-fns';

export default function ConversationPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const conversationId = params.conversationId as string;

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [allConversations, setAllConversations] = useState<Conversation[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [lightboxURL, setLightboxURL] = useState('');
  const [convLoading, setConvLoading] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!loading && !user) router.replace('/auth');
  }, [user, loading, router]);

  // Load all conversations for sidebar
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', user.uid),
      orderBy('lastMessageAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Conversation));
      setAllConversations(data);
    });
    return () => unsub();
  }, [user]);

  // Load current conversation
  useEffect(() => {
    if (!conversationId) return;
    getDoc(doc(db, 'conversations', conversationId)).then((snap) => {
      if (snap.exists()) {
        setConversation({ id: snap.id, ...snap.data() } as Conversation);
      }
      setConvLoading(false);
    });
  }, [conversationId]);

  // Load messages
  useEffect(() => {
    if (!conversationId) return;
    const q = query(
      collection(db, 'conversations', conversationId, 'messages'),
      orderBy('createdAt', 'asc'),
      limit(100)
    );
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as DirectMessage));
      setMessages(data);
    });
    return () => unsub();
  }, [conversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleSend = useCallback(async () => {
    if (!user || !profile || (!text.trim() && !imageFile) || sending) return;
    setSending(true);

    try {
      let imageURL: string | undefined;
      if (imageFile) {
        const storageRef = ref(storage, `dm-images/${conversationId}/${Date.now()}_${user.uid}`);
        await uploadBytes(storageRef, imageFile);
        imageURL = await getDownloadURL(storageRef);
      }

      const msg: Omit<DirectMessage, 'id'> = {
        senderId: user.uid,
        senderUsername: profile.username,
        text: text.trim(),
        ...(imageURL ? { imageURL } : {}),
        createdAt: Date.now(),
      };

      await addDoc(collection(db, 'conversations', conversationId, 'messages'), msg);
      await updateDoc(doc(db, 'conversations', conversationId), {
        lastMessage: text.trim() || '📷 Photo',
        lastMessageAt: Date.now(),
      });

      setText('');
      clearImage();
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSending(false);
      textRef.current?.focus();
    }
  }, [user, profile, text, imageFile, conversationId, sending]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const otherUserId = conversation?.participants.find((p) => p !== user?.uid) ?? '';
  const otherUsername = conversation?.participantUsernames?.[otherUserId] ?? 'User';
  const otherPhoto = conversation?.participantPhotos?.[otherUserId] ?? '';

  if (loading || convLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-950">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-purple-500" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-zinc-950">
      <Navbar />
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar: conversations list */}
        <aside className="hidden md:flex w-72 bg-zinc-900 border-r border-zinc-800 flex-col shrink-0">
          <div className="p-4 border-b border-zinc-800">
            <h2 className="font-semibold text-white">Direct Messages</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {allConversations.map((conv) => {
              const otherId = conv.participants.find((p) => p !== user?.uid) ?? '';
              const otherName = conv.participantUsernames?.[otherId] ?? 'Unknown';
              const otherPic = conv.participantPhotos?.[otherId] ?? '';
              const isActive = conv.id === conversationId;
              return (
                <Link
                  key={conv.id}
                  href={`/messages/${conv.id}`}
                  className={`flex items-center gap-3 px-4 py-3 transition-colors border-b border-zinc-800/50 ${
                    isActive ? 'bg-purple-600/20' : 'hover:bg-zinc-800'
                  }`}
                >
                  <div className="w-9 h-9 rounded-full overflow-hidden bg-zinc-700 shrink-0">
                    {otherPic ? (
                      <img src={otherPic} alt={otherName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-400 text-sm font-medium">
                        {otherName[0]?.toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${isActive ? 'text-purple-300' : 'text-white'}`}>
                      {otherName}
                    </p>
                    <p className="text-xs text-zinc-500 truncate">{conv.lastMessage || 'No messages yet'}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </aside>

        {/* DM area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="h-14 bg-zinc-900 border-b border-zinc-800 flex items-center px-4 gap-3 shrink-0">
            <Link href="/messages" className="md:hidden text-zinc-400 hover:text-white p-1 mr-1">
              ←
            </Link>
            <Link href={`/profile/${otherUserId}`} className="flex items-center gap-3 group">
              <div className="w-8 h-8 rounded-full overflow-hidden bg-zinc-700">
                {otherPhoto ? (
                  <img src={otherPhoto} alt={otherUsername} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-400 text-sm font-medium">
                    {otherUsername[0]?.toUpperCase()}
                  </div>
                )}
              </div>
              <span className="font-semibold text-white group-hover:text-purple-300 transition-colors">
                {otherUsername}
              </span>
            </Link>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {messages.length === 0 && (
              <div className="text-center text-zinc-600 py-12 text-sm">
                <p className="text-3xl mb-2">👋</p>
                <p>Start a conversation with {otherUsername}</p>
              </div>
            )}
            {messages.map((msg) => {
              const isOwn = msg.senderId === user?.uid;
              const timeAgo = formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true });
              return (
                <div key={msg.id} className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                  {msg.text && (
                    <div
                      className={`px-4 py-2.5 rounded-2xl text-sm text-white max-w-[75%] break-words whitespace-pre-wrap ${
                        isOwn
                          ? 'bg-gradient-to-br from-purple-600 to-pink-600 rounded-br-sm'
                          : 'bg-zinc-800 rounded-bl-sm'
                      }`}
                    >
                      {msg.text}
                    </div>
                  )}
                  {msg.imageURL && (
                    <button onClick={() => setLightboxURL(msg.imageURL!)} className="mt-1">
                      <img
                        src={msg.imageURL}
                        alt="Shared"
                        className="max-w-xs max-h-56 rounded-xl object-cover hover:opacity-90 transition-opacity cursor-zoom-in"
                      />
                    </button>
                  )}
                  <span className="text-xs text-zinc-600 mt-1 px-1">{timeAgo}</span>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Image preview */}
          {imagePreview && (
            <div className="px-4 py-2 bg-zinc-800/50 border-t border-zinc-800 flex items-center gap-3">
              <img src={imagePreview} alt="Preview" className="h-14 w-14 object-cover rounded-lg" />
              <span className="flex-1 text-sm text-zinc-400 truncate">{imageFile?.name}</span>
              <button onClick={clearImage} className="text-red-400 hover:text-red-300 text-lg leading-none">✕</button>
            </div>
          )}

          {/* Input */}
          <div className="px-4 py-3 bg-zinc-900 border-t border-zinc-800 flex items-end gap-3">
            <button
              onClick={() => fileRef.current?.click()}
              className="p-2 text-zinc-500 hover:text-purple-400 transition-colors shrink-0 mb-0.5"
            >
              📎
            </button>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />

            <textarea
              ref={textRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder={`Message ${otherUsername}...`}
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition-colors resize-none text-sm"
              style={{ maxHeight: '120px' }}
              onInput={(e) => {
                const t = e.currentTarget;
                t.style.height = 'auto';
                t.style.height = Math.min(t.scrollHeight, 120) + 'px';
              }}
            />

            <button
              onClick={handleSend}
              disabled={sending || (!text.trim() && !imageFile)}
              className="p-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-colors shrink-0"
            >
              {sending ? (
                <span className="animate-spin block h-4 w-4 border-t-2 border-white rounded-full" />
              ) : (
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxURL && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setLightboxURL('')}
        >
          <button className="absolute top-4 right-4 text-white text-3xl" onClick={() => setLightboxURL('')}>✕</button>
          <img
            src={lightboxURL}
            alt="Full size"
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
