'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  collection,
  query,
  orderBy,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { ChatRoom, UserProfile } from '@/lib/types';
import Navbar from '@/components/Navbar';

type Tab = 'rooms' | 'users';

export default function AdminPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<Tab>('rooms');

  // Rooms state
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDesc, setNewRoomDesc] = useState('');
  const [addingRoom, setAddingRoom] = useState(false);
  const [roomError, setRoomError] = useState('');

  // Users state
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [userSearch, setUserSearch] = useState('');

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace('/auth');
      } else if (profile && !profile.isAdmin) {
        router.replace('/chat');
      }
    }
  }, [user, profile, loading, router]);

  // Load rooms
  useEffect(() => {
    if (!profile?.isAdmin) return;
    const q = query(collection(db, 'rooms'), orderBy('order', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setRooms(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ChatRoom)));
      setRoomsLoading(false);
    });
    return () => unsub();
  }, [profile?.isAdmin]);

  // Load users
  useEffect(() => {
    if (!profile?.isAdmin || activeTab !== 'users') return;
    setUsersLoading(true);
    getDocs(query(collection(db, 'users'), orderBy('createdAt', 'desc'))).then((snap) => {
      setUsers(snap.docs.map((d) => ({ ...d.data() } as UserProfile)));
      setUsersLoading(false);
    });
  }, [profile?.isAdmin, activeTab]);

  const handleAddRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;
    setAddingRoom(true);
    setRoomError('');

    try {
      const maxOrder = rooms.reduce((max, r) => Math.max(max, r.order), -1);
      const roomId = newRoomName.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      await addDoc(collection(db, 'rooms'), {
        id: roomId,
        name: newRoomName.trim(),
        description: newRoomDesc.trim(),
        order: maxOrder + 1,
        createdAt: Date.now(),
        createdBy: user!.uid,
      });
      setNewRoomName('');
      setNewRoomDesc('');
    } catch (err: unknown) {
      setRoomError(err instanceof Error ? err.message : 'Failed to add room');
    } finally {
      setAddingRoom(false);
    }
  };

  const handleDeleteRoom = async (roomId: string) => {
    if (!confirm('Delete this room? All messages will be lost.')) return;
    await deleteDoc(doc(db, 'rooms', roomId));
  };

  const handleToggleAdmin = async (targetUser: UserProfile) => {
    await updateDoc(doc(db, 'users', targetUser.uid), {
      isAdmin: !targetUser.isAdmin,
    });
    setUsers((prev) =>
      prev.map((u) => (u.uid === targetUser.uid ? { ...u, isAdmin: !u.isAdmin } : u))
    );
  };

  const handleToggleBan = async (targetUser: UserProfile) => {
    const action = targetUser.isBanned ? 'Unban' : 'Ban';
    if (!confirm(`${action} ${targetUser.username}?`)) return;
    await updateDoc(doc(db, 'users', targetUser.uid), {
      isBanned: !targetUser.isBanned,
    });
    setUsers((prev) =>
      prev.map((u) => (u.uid === targetUser.uid ? { ...u, isBanned: !u.isBanned } : u))
    );
  };

  const handleDeleteUser = async (targetUser: UserProfile) => {
    if (!confirm(`Permanently delete ${targetUser.username}'s account data?`)) return;
    await deleteDoc(doc(db, 'users', targetUser.uid));
    setUsers((prev) => prev.filter((u) => u.uid !== targetUser.uid));
  };

  const filteredUsers = users.filter(
    (u) =>
      u.username?.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email?.toLowerCase().includes(userSearch.toLowerCase())
  );

  if (loading || !profile) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-950">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-purple-500" />
      </div>
    );
  }

  if (!profile.isAdmin) return null;

  return (
    <div className="flex flex-col h-screen bg-zinc-950">
      <Navbar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-2xl">🛡️</span>
            <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
          </div>

          {/* Tabs */}
          <div className="flex bg-zinc-800 rounded-xl p-1 mb-6 w-fit">
            <button
              onClick={() => setActiveTab('rooms')}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'rooms' ? 'bg-purple-600 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Chat Rooms
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'users' ? 'bg-purple-600 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Users
            </button>
          </div>

          {/* ROOMS TAB */}
          {activeTab === 'rooms' && (
            <div className="space-y-6">
              {/* Add room form */}
              <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-5">
                <h2 className="font-semibold text-white mb-4">Add New Room</h2>
                <form onSubmit={handleAddRoom} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={newRoomName}
                      onChange={(e) => setNewRoomName(e.target.value)}
                      placeholder="Room name (e.g. Bears)"
                      className="bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 text-sm"
                      required
                    />
                    <input
                      type="text"
                      value={newRoomDesc}
                      onChange={(e) => setNewRoomDesc(e.target.value)}
                      placeholder="Description (optional)"
                      className="bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 text-sm"
                    />
                  </div>
                  {roomError && (
                    <p className="text-red-400 text-sm">{roomError}</p>
                  )}
                  <button
                    type="submit"
                    disabled={addingRoom}
                    className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
                  >
                    {addingRoom ? 'Adding...' : '+ Add Room'}
                  </button>
                </form>
              </div>

              {/* Rooms list */}
              <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
                <div className="p-4 border-b border-zinc-800">
                  <h2 className="font-semibold text-white">Active Rooms ({rooms.length})</h2>
                </div>
                {roomsLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-purple-500" />
                  </div>
                ) : (
                  <div className="divide-y divide-zinc-800">
                    {rooms.map((room) => (
                      <div key={room.id} className="flex items-center justify-between px-5 py-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-zinc-500">#</span>
                            <span className="font-medium text-white">{room.name}</span>
                          </div>
                          {room.description && (
                            <p className="text-xs text-zinc-500 mt-0.5 ml-4">{room.description}</p>
                          )}
                        </div>
                        <button
                          onClick={() => handleDeleteRoom(room.id)}
                          className="text-xs text-red-500 hover:text-red-400 px-3 py-1 rounded-lg hover:bg-red-900/20 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* USERS TAB */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search users by name or email..."
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 text-sm"
              />

              <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
                <div className="p-4 border-b border-zinc-800">
                  <h2 className="font-semibold text-white">
                    Users ({filteredUsers.length}{userSearch ? ' filtered' : ''})
                  </h2>
                </div>
                {usersLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-purple-500" />
                  </div>
                ) : (
                  <div className="divide-y divide-zinc-800">
                    {filteredUsers.map((u) => (
                      <div key={u.uid} className="flex items-center gap-4 px-5 py-3">
                        {/* Avatar */}
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-700 shrink-0">
                          {u.photoURL ? (
                            <img src={u.photoURL} alt={u.username} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-zinc-400 font-medium">
                              {u.username?.[0]?.toUpperCase()}
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-white">{u.username}</span>
                            {u.isAdmin && (
                              <span className="text-xs bg-purple-900/40 text-purple-300 px-2 py-0.5 rounded-md border border-purple-800">
                                Admin
                              </span>
                            )}
                            {u.isBanned && (
                              <span className="text-xs bg-red-900/40 text-red-300 px-2 py-0.5 rounded-md border border-red-800">
                                Banned
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-zinc-500">{u.email}</p>
                        </div>

                        {/* Actions */}
                        {u.uid !== user?.uid && (
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => handleToggleAdmin(u)}
                              className="text-xs px-3 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors border border-zinc-700"
                            >
                              {u.isAdmin ? 'Remove Admin' : 'Make Admin'}
                            </button>
                            <button
                              onClick={() => handleToggleBan(u)}
                              className={`text-xs px-3 py-1 rounded-lg transition-colors ${
                                u.isBanned
                                  ? 'bg-green-900/30 hover:bg-green-900/50 text-green-400 border border-green-800'
                                  : 'bg-yellow-900/30 hover:bg-yellow-900/50 text-yellow-400 border border-yellow-800'
                              }`}
                            >
                              {u.isBanned ? 'Unban' : 'Ban'}
                            </button>
                            <button
                              onClick={() => handleDeleteUser(u)}
                              className="text-xs px-3 py-1 rounded-lg bg-red-900/30 hover:bg-red-900/50 text-red-400 border border-red-800 transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                        {u.uid === user?.uid && (
                          <span className="text-xs text-zinc-600 italic">You</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
