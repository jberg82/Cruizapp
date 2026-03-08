'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { doc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { UserProfile } from '@/lib/types';

export default function ProfileSetup() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [username, setUsername] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'trans'>('male');
  const [hivStatus, setHivStatus] = useState<'negative' | 'positive' | 'undetectable'>('negative');
  const [aboutMe, setAboutMe] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [previewURL, setPreviewURL] = useState('');

  useEffect(() => {
    if (!loading) {
      if (!user) router.replace('/auth');
      else if (profile) router.replace('/chat');
    }
  }, [user, profile, loading, router]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      setPreviewURL(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError('');
    setSaving(true);

    try {
      let finalPhotoURL = '';
      if (photoFile) {
        const storageRef = ref(storage, `profile-photos/${user.uid}`);
        await uploadBytes(storageRef, photoFile);
        finalPhotoURL = await getDownloadURL(storageRef);
      }

      const newProfile: UserProfile = {
        uid: user.uid,
        email: user.email || '',
        username: username.trim(),
        age: parseInt(age),
        gender,
        hivStatus,
        aboutMe: aboutMe.trim(),
        photoURL: finalPhotoURL,
        isAdmin: false,
        isBanned: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await setDoc(doc(db, 'users', user.uid), newProfile);
      await refreshProfile();
      router.replace('/chat');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save profile');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-950">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-purple-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 py-10 px-4">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold gradient-text">Set Up Your Profile</h1>
          <p className="text-zinc-400 mt-2">Let the community know who you are</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 space-y-5">
          {/* Photo upload */}
          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-28 h-28 rounded-full bg-zinc-800 border-2 border-dashed border-zinc-600 hover:border-purple-500 overflow-hidden transition-colors flex items-center justify-center"
            >
              {previewURL ? (
                <img src={previewURL} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center text-zinc-500 text-xs gap-1">
                  <span className="text-3xl">📷</span>
                  <span>Add Photo</span>
                </div>
              )}
            </button>
            <input ref={fileRef} type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
            {previewURL && (
              <button type="button" onClick={() => fileRef.current?.click()} className="text-xs text-purple-400 hover:text-purple-300">
                Change photo
              </button>
            )}
          </div>

          {/* Username */}
          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">Username *</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition-colors"
              placeholder="CoolUsername"
              maxLength={30}
              required
            />
          </div>

          {/* Age */}
          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">Age *</label>
            <input
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition-colors"
              placeholder="25"
              min="18"
              max="99"
              required
            />
          </div>

          {/* Gender */}
          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">Gender *</label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value as 'male' | 'female' | 'trans')}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-purple-500 transition-colors"
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="trans">Trans</option>
            </select>
          </div>

          {/* HIV Status */}
          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">HIV Status *</label>
            <select
              value={hivStatus}
              onChange={(e) => setHivStatus(e.target.value as 'negative' | 'positive' | 'undetectable')}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-purple-500 transition-colors"
            >
              <option value="negative">Negative</option>
              <option value="positive">Positive</option>
              <option value="undetectable">Undetectable</option>
            </select>
          </div>

          {/* About Me */}
          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">About Me</label>
            <textarea
              value={aboutMe}
              onChange={(e) => setAboutMe(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition-colors resize-none"
              placeholder="Tell others about yourself..."
              rows={3}
              maxLength={500}
            />
            <p className="text-xs text-zinc-600 mt-1 text-right">{aboutMe.length}/500</p>
          </div>

          {error && (
            <div className="bg-red-900/20 border border-red-800 rounded-xl px-4 py-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-white" />
                Saving...
              </span>
            ) : (
              'Save & Enter App'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
