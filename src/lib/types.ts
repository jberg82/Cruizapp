export interface UserProfile {
  uid: string;
  email: string;
  username: string;
  age: number;
  gender: 'male' | 'female' | 'trans';
  hivStatus: 'negative' | 'positive' | 'undetectable';
  aboutMe: string;
  photoURL: string;
  isAdmin: boolean;
  isBanned: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface ChatRoom {
  id: string;
  name: string;
  description: string;
  order: number;
  createdAt: number;
  createdBy: string;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderUsername: string;
  senderPhotoURL: string;
  text: string;
  imageURL?: string;
  createdAt: number;
}

export interface Conversation {
  id: string;
  participants: string[];
  participantUsernames: Record<string, string>;
  participantPhotos: Record<string, string>;
  lastMessage: string;
  lastMessageAt: number;
}

export interface DirectMessage {
  id: string;
  senderId: string;
  senderUsername: string;
  text: string;
  imageURL?: string;
  createdAt: number;
}
