'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
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

export default function OwnProfilePage() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [username, setUsername] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'trans'>('male');
  const [hivStatus, setHivStatus] = useState<'negative' | 'positive' | 'undetectable'>('negative');
  const [aboutMe, setAboutMe] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [previewURL, setPreviewURL] = useState('');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-950">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-purple-500" />
      </div>
    );
  }

  if (!user || !profile) {
    router.replace('/auth');
    return null;
  }

  const startEditing = () => {
    setUsername(profile.username);
    setAge(String(profile.age));
    setGender(profile.gender);
    setHivStatus(profile.hivStatus);
    setAboutMe(profile.aboutMe);
    setPreviewURL(profile.photoURL);
    setPhotoFile(null);
    setError('');
    setSuccess('');
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
    setPreviewURL('');
    setPhotoFile(null);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      setPreviewURL(URL.createObjectURL(file));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      let finalPhotoURL = profile.photoURL;
      if (photoFile) {
        const storageRef = ref(storage, `profile-photos/${user.uid}`);
        await uploadBytes(storageRef, photoFile);
        finalPhotoURL = await getDownloadURL(storageRef);
      }

      await updateDoc(doc(db, 'users', user.uid), {
        username: username.trim(),
        age: parseInt(age),
        gender,
        hivStatus,
        aboutMe: aboutMe.trim(),
        photoURL: finalPhotoURL,
        updatedAt: Date.now(),
      });

      await refreshProfile();
      setSuccess('Profile updated!');
      setEditing(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const displayPhoto = editing ? previewURL : profile.photoURL;

  return (
    <div className="flex flex-col h-screen bg-zinc-950">
      <Navbar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-10">
          {success && !editing && (
            <div className="mb-4 bg-green-900/20 border border-green-800 rounded-xl px-4 py-3 text-green-400 text-sm">
              {success}
            </div>
          )}

          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
            {/* Cover / photo area */}
            <div className="h-32 bg-gradient-to-r from-purple-900/50 to-pink-900/50" />

            <div className="px-6 pb-6">
              {/* Avatar */}
              <div className="-mt-14 mb-4 flex items-end justify-between">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-zinc-900 bg-zinc-700">
                    {displayPhoto ? (
                      <img src={displayPhoto} alt={profile.username} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl text-zinc-400 font-bold">
                        {profile.username[0]?.toUpperCase()}
                      </div>
                    )}
                  </div>
                  {editing && (
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="absolute bottom-0 right-0 w-7 h-7 bg-purple-600 hover:bg-purple-500 rounded-full flex items-center justify-center text-xs transition-colors"
                      title="Change photo"
                    >
                      📷
                    </button>
                  )}
                  <input ref={fileRef} type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                </div>

                {!editing && (
                  <button
                    onClick={startEditing}
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-sm text-white rounded-xl border border-zinc-700 transition-colors"
                  >
                    Edit Profile
                  </button>
                )}
              </div>

              {/* View mode */}
              {!editing && (
                <div className="space-y-4">
                  <div>
                    <h1 className="text-2xl font-bold text-white">{profile.username}</h1>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Badge>{profile.age} yrs</Badge>
                      <Badge>{GENDER_LABELS[profile.gender]}</Badge>
                      <Badge color="pink">HIV: {HIV_LABELS[profile.hivStatus]}</Badge>
                    </div>
                  </div>

                  {profile.aboutMe && (
                    <div>
                      <p className="text-xs text-zinc-500 uppercase font-semibold tracking-wider mb-1">About Me</p>
                      <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap">{profile.aboutMe}</p>
                    </div>
                  )}

                  <div className="text-xs text-zinc-600 border-t border-zinc-800 pt-4">
                    Member since {new Date(profile.createdAt).toLocaleDateString()}
                    {profile.isAdmin && <span className="ml-2 text-purple-400 font-semibold">· Admin</span>}
                  </div>
                </div>
              )}

              {/* Edit mode */}
              {editing && (
                <form onSubmit={handleSave} className="space-y-4">
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1.5">Username</label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-purple-500"
                      maxLength={30}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-zinc-400 mb-1.5">Age</label>
                      <input
                        type="number"
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-purple-500"
                        min="18" max="99" required
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-zinc-400 mb-1.5">Gender</label>
                      <select
                        value={gender}
                        onChange={(e) => setGender(e.target.value as 'male' | 'female' | 'trans')}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-purple-500"
                      >
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="trans">Trans</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-zinc-400 mb-1.5">HIV Status</label>
                    <select
                      value={hivStatus}
                      onChange={(e) => setHivStatus(e.target.value as 'negative' | 'positive' | 'undetectable')}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-purple-500"
                    >
                      <option value="negative">Negative</option>
                      <option value="positive">Positive</option>
                      <option value="undetectable">Undetectable</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm text-zinc-400 mb-1.5">About Me</label>
                    <textarea
                      value={aboutMe}
                      onChange={(e) => setAboutMe(e.target.value)}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-purple-500 resize-none"
                      rows={4}
                      maxLength={500}
                    />
                    <p className="text-xs text-zinc-600 mt-1 text-right">{aboutMe.length}/500</p>
                  </div>

                  {error && (
                    <div className="bg-red-900/20 border border-red-800 rounded-xl px-4 py-3 text-red-400 text-sm">
                      {error}
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold py-2.5 rounded-xl transition-all disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                      type="button"
                      onClick={cancelEditing}
                      className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl border border-zinc-700 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
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
