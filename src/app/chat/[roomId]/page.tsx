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
  getDocs,
  doc,
  getDoc,
  setDoc,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { signOut } from 'firebase/auth';
import { db, storage, auth } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { ChatRoom, ChatMessage } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';

const DEFAULT_ROOMS: Omit<ChatRoom, 'createdBy'>[] = [
  { id: 'lobby', name: 'Lobby', description: 'General chat for everyone', order: 0, createdAt: 0 },
  { id: '4rn', name: '4RN', description: 'For right now', order: 1, createdAt: 0 },
  { id: 'friends', name: 'Friends', description: 'Hang out with friends', order: 2, createdAt: 0 },
  { id: 't4t', name: 'T4T', description: 'Trans for trans', order: 3, createdAt: 0 },
];

async function ensureDefaultRooms() {
  for (const room of DEFAULT_ROOMS) {
    const roomRef = doc(db, 'rooms', room.id);
    const snap = await getDoc(roomRef);
    if (!snap.exists()) {
      await setDoc(roomRef, { ...room, createdBy: 'system' });
    }
  }
}

export default function ChatRoomPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const roomId = params.roomId as string;

  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [currentRoom, setCurrentRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [lightboxURL, setLightboxURL] = useState('');
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!loading) {
      if (!user) router.replace('/auth');
      else if (!profile) router.replace('/profile/setup');
      else if (profile.isBanned) router.replace('/banned');
    }
  }, [user, profile, loading, router]);

  // Initialize default rooms and load all rooms
  useEffect(() => {
    if (!user) return;
    ensureDefaultRooms().then(() => {
      const q = query(collection(db, 'rooms'), orderBy('order', 'asc'));
      const unsub = onSnapshot(q, (snap) => {
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ChatRoom));
        setRooms(data);
        const current = data.find((r) => r.id === roomId) ?? null;
        setCurrentRoom(current);
        setRoomsLoading(false);
      });
      return unsub;
    });
  }, [user, roomId]);

  // Load messages for current room
  useEffect(() => {
    if (!user || !roomId) return;
    const q = query(
      collection(db, 'rooms', roomId, 'messages'),
      orderBy('createdAt', 'asc'),
      limit(100)
    );
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ChatMessage));
      setMessages(data);
    });
    return () => unsub();
  }, [user, roomId]);

  // Auto-scroll to bottom on new messages
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
        const storageRef = ref(storage, `chat-images/${roomId}/${Date.now()}_${user.uid}`);
        await uploadBytes(storageRef, imageFile);
        imageURL = await getDownloadURL(storageRef);
      }

      const msg: Omit<ChatMessage, 'id'> = {
        roomId,
        senderId: user.uid,
        senderUsername: profile.username,
        senderPhotoURL: profile.photoURL,
        text: text.trim(),
        ...(imageURL ? { imageURL } : {}),
        createdAt: Date.now(),
      };

      await addDoc(collection(db, 'rooms', roomId, 'messages'), msg);
      setText('');
      clearImage();
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSending(false);
      textRef.current?.focus();
    }
  }, [user, profile, text, imageFile, roomId, sending]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    router.replace('/auth');
  };

  if (loading || roomsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-950">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-purple-500" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-zinc-950 overflow-hidden">
      {/* Sidebar overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-30 w-60 bg-zinc-900 border-r border-zinc-800
          flex flex-col shrink-0 transition-transform duration-200
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* App Logo */}
        <div className="h-14 flex items-center px-4 border-b border-zinc-800 shrink-0">
          <span className="text-xl font-bold gradient-text">CruizApp</span>
        </div>

        {/* Rooms */}
        <div className="flex-1 overflow-y-auto py-2">
          <p className="px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">
            Chat Rooms
          </p>
          {rooms.map((room) => (
            <Link
              key={room.id}
              href={`/chat/${room.id}`}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-2 px-4 py-2 text-sm transition-colors ${
                room.id === roomId
                  ? 'bg-purple-600/20 text-purple-300 font-medium'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              <span className="text-base">#</span>
              <span>{room.name}</span>
            </Link>
          ))}
        </div>

        {/* Bottom nav */}
        <div className="border-t border-zinc-800 py-2 space-y-0.5">
          <Link
            href="/messages"
            className="flex items-center gap-2 px-4 py-2 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <span>✉️</span> Messages
          </Link>
          <Link
            href="/profile"
            className="flex items-center gap-2 px-4 py-2 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <span>👤</span> My Profile
          </Link>
          {profile?.isAdmin && (
            <Link
              href="/admin"
              className="flex items-center gap-2 px-4 py-2 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <span>🛡️</span> Admin
            </Link>
          )}
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-zinc-500 hover:text-red-400 hover:bg-red-900/10 transition-colors"
          >
            <span>🚪</span> Sign Out
          </button>
        </div>
      </aside>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat header */}
        <div className="h-14 bg-zinc-900 border-b border-zinc-800 flex items-center px-4 gap-3 shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-zinc-400 hover:text-white p-1"
          >
            ☰
          </button>
          {currentRoom ? (
            <>
              <span className="text-zinc-500 text-lg">#</span>
              <span className="font-semibold text-white">{currentRoom.name}</span>
              {currentRoom.description && (
                <span className="text-zinc-500 text-sm hidden sm:block">
                  — {currentRoom.description}
                </span>
              )}
            </>
          ) : (
            <span className="text-zinc-400">Room not found</span>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-zinc-600 py-8 text-sm">
              No messages yet. Say hello! 👋
            </div>
          )}
          {messages.map((msg) => (
            <MessageItem
              key={msg.id}
              msg={msg}
              isOwn={msg.senderId === user?.uid}
              onImageClick={setLightboxURL}
            />
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Image preview bar */}
        {imagePreview && (
          <div className="px-4 py-2 bg-zinc-800/50 border-t border-zinc-800 flex items-center gap-3">
            <img src={imagePreview} alt="Preview" className="h-16 w-16 object-cover rounded-lg" />
            <div className="flex-1 text-sm text-zinc-400">{imageFile?.name}</div>
            <button onClick={clearImage} className="text-red-400 hover:text-red-300 text-lg leading-none">
              ✕
            </button>
          </div>
        )}

        {/* Message input */}
        <div className="px-4 py-3 bg-zinc-900 border-t border-zinc-800 flex items-end gap-3">
          <button
            onClick={() => fileRef.current?.click()}
            className="p-2 text-zinc-500 hover:text-purple-400 transition-colors shrink-0 mb-0.5"
            title="Attach image"
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
            placeholder={currentRoom ? `Message #${currentRoom.name}` : 'Send a message...'}
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
            title="Send message"
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

      {/* Image lightbox */}
      {lightboxURL && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setLightboxURL('')}
        >
          <button
            className="absolute top-4 right-4 text-white text-3xl hover:text-gray-300"
            onClick={() => setLightboxURL('')}
          >
            ✕
          </button>
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

function MessageItem({
  msg,
  isOwn,
  onImageClick,
}: {
  msg: ChatMessage;
  isOwn: boolean;
  onImageClick: (url: string) => void;
}) {
  const timeAgo = formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true });

  return (
    <div className={`flex gap-3 group ${isOwn ? 'flex-row-reverse' : ''}`}>
      {/* Avatar — clickable → profile */}
      <Link href={`/profile/${msg.senderId}`} className="shrink-0">
        <div className="w-9 h-9 rounded-full overflow-hidden bg-zinc-700 ring-2 ring-transparent hover:ring-purple-500 transition-all">
          {msg.senderPhotoURL ? (
            <img
              src={msg.senderPhotoURL}
              alt={msg.senderUsername}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-sm text-zinc-400 font-medium">
              {msg.senderUsername[0]?.toUpperCase()}
            </div>
          )}
        </div>
      </Link>

      {/* Bubble */}
      <div className={`max-w-[75%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        <div className={`flex items-baseline gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
          <Link
            href={`/profile/${msg.senderId}`}
            className={`text-xs font-semibold hover:underline ${isOwn ? 'text-purple-400' : 'text-pink-400'}`}
          >
            {msg.senderUsername}
          </Link>
          <span className="text-xs text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity">
            {timeAgo}
          </span>
        </div>

        {msg.text && (
          <div
            className={`px-3 py-2 rounded-2xl text-sm text-white whitespace-pre-wrap break-words ${
              isOwn
                ? 'bg-purple-600/80 rounded-tr-sm'
                : 'bg-zinc-800 rounded-tl-sm'
            }`}
          >
            {msg.text}
          </div>
        )}

        {msg.imageURL && (
          <button onClick={() => onImageClick(msg.imageURL!)} className="mt-1">
            <img
              src={msg.imageURL}
              alt="Shared image"
              className="max-w-xs max-h-64 rounded-xl object-cover hover:opacity-90 transition-opacity cursor-zoom-in"
            />
          </button>
        )}
      </div>
    </div>
  );
}
