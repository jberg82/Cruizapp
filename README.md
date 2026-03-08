# CruizApp — Dating & Chat MVP

A real-time dating/social app built with **Next.js 14**, **TypeScript**, **Tailwind CSS**, and **Firebase**.

## Features

- **Auth** — Email/password registration and login
- **User Profiles** — Username, age, gender (male/female/trans), HIV status (negative/positive/undetectable), about me, profile photo
- **Chat Rooms** — Real-time group chat with photo sharing. Default rooms: Lobby, 4RN, Friends, T4T. Click any user's avatar to view their profile.
- **Direct Messaging** — Private 1-on-1 conversations with photo sharing
- **Admin Panel** — Add/remove chat rooms, manage users (admin toggle, ban, delete)
- **Banned users** — Banned users cannot send messages and see a suspension screen

---

## Setup

### 1. Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/) and create a new project
2. Enable **Authentication** → Sign-in method → **Email/Password**
3. Enable **Firestore Database** (start in production mode)
4. Enable **Storage**
5. Go to **Project Settings** → **Your apps** → Add a **Web app** → copy the config values

### 2. Environment Variables

```bash
cp .env.local.example .env.local
```

Fill in your Firebase config values in `.env.local`.

### 3. Deploy Firebase Rules

```bash
npm install -g firebase-tools
firebase login
firebase init   # select Firestore + Storage, use existing project
firebase deploy --only firestore:rules,firestore:indexes,storage
```

### 4. Make Yourself an Admin

After creating your account in the app, go to **Firebase Console → Firestore → users collection**, find your user document, and set `isAdmin: true`.

---

## Local Development

```bash
npm install
npm run dev
```

App runs at [http://localhost:3000](http://localhost:3000)

---

## VPS Deployment

### Build

```bash
npm install
npm run build
```

### Run with PM2

```bash
npm install -g pm2
pm2 start ecosystem.config.js
pm2 save
pm2 startup   # follow the instructions to enable autostart
```

### Nginx Reverse Proxy (recommended)

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Then set up SSL with Certbot:
```bash
sudo certbot --nginx -d yourdomain.com
```

---

## Data Model (Firestore)

```
users/{uid}
  username, age, gender, hivStatus, aboutMe, photoURL, isAdmin, isBanned, ...

rooms/{roomId}
  name, description, order, createdAt, createdBy

rooms/{roomId}/messages/{messageId}
  senderId, senderUsername, senderPhotoURL, text, imageURL?, createdAt

conversations/{conversationId}   (id = [uid1, uid2].sort().join('_'))
  participants[], participantUsernames{}, participantPhotos{}, lastMessage, lastMessageAt

conversations/{conversationId}/messages/{messageId}
  senderId, senderUsername, text, imageURL?, createdAt
```

## Storage Structure

```
profile-photos/{uid}          — profile picture (5 MB max)
chat-images/{roomId}/{file}   — room photo shares (10 MB max)
dm-images/{convId}/{file}     — DM photo shares (10 MB max)
```
