import { db } from './firebase';
import {
    collection, doc, setDoc, updateDoc,
    onSnapshot, deleteDoc, serverTimestamp,
    addDoc, query, orderBy, limit, getDoc, getDocs
} from 'firebase/firestore';

export interface WatchPartyRoom {
    id: string;
    hostId: string;
    movieId: string; // Can be IMDB ID or custom string
    mediaType: 'movie' | 'tv'; // to know where to fetch data from
    title: string;
    status: 'waiting' | 'playing' | 'paused';
    currentTime: number; // in seconds
    updatedAt: any;
    createdAt: any;
    customVideoUrl?: string;
    participants: Record<string, { username: string; avatarUrl?: string; role: 'host' | 'guest'; joinedAt: any }>;
}

export interface WatchPartyMessage {
    id?: string;
    userId: string;
    username: string;
    text: string;
    createdAt: any;
}

// 1. Create a new watch party
export async function createWatchParty(
    hostId: string,
    hostUsername: string,
    hostAvatar: string | undefined,
    movieId: string,
    mediaType: 'movie' | 'tv',
    title: string
): Promise<string> {
    const roomsRef = collection(db, 'watchparties');

    // Create a randomly generated room document
    const roomDoc = doc(roomsRef);

    const newRoom: Omit<WatchPartyRoom, 'id'> = {
        hostId,
        movieId,
        mediaType,
        title,
        status: 'waiting',
        currentTime: 0,
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        participants: {
            [hostId]: {
                username: hostUsername || 'Kullanıcı',
                avatarUrl: hostAvatar || '',
                role: 'host',
                joinedAt: serverTimestamp()
            }
        }
    };

    await setDoc(roomDoc, newRoom);
    return roomDoc.id;
}

// 2. Join a watch party
export async function joinWatchParty(
    roomId: string,
    userId: string,
    username: string,
    avatarUrl?: string
): Promise<boolean> {
    const roomRef = doc(db, 'watchparties', roomId);
    const snap = await getDoc(roomRef);

    if (!snap.exists()) return false;

    const data = snap.data() as WatchPartyRoom;
    const isHost = data.hostId === userId;

    // Add participant if not already in the object
    await updateDoc(roomRef, {
        [`participants.${userId}`]: {
            username: username || 'Misafir',
            avatarUrl: avatarUrl || '',
            role: isHost ? 'host' : 'guest',
            joinedAt: serverTimestamp()
        },
        updatedAt: serverTimestamp()
    });

    return true;
}

// 3. Leave a watch party
export async function leaveWatchParty(roomId: string, userId: string): Promise<void> {
    const roomRef = doc(db, 'watchparties', roomId);
    try {
        const snap = await getDoc(roomRef);
        if (!snap.exists()) return;

        // We can't easily `delete` a map field via updateDoc simply if we don't use FieldValue.delete()
        // but importing FieldValue from firestore gives us `deleteField`
        const { deleteField } = await import('firebase/firestore');
        await updateDoc(roomRef, {
            [`participants.${userId}`]: deleteField()
        });
    } catch (e) {
        console.error('Hata (leaveWatchParty):', e);
    }
}

// 4. Update sync state (Only for Host typically)
export async function syncWatchParty(
    roomId: string,
    status: 'playing' | 'paused' | 'waiting',
    currentTime: number
): Promise<void> {
    const roomRef = doc(db, 'watchparties', roomId);
    await updateDoc(roomRef, {
        status,
        currentTime,
        updatedAt: serverTimestamp()
    });
}

// 5. Send message
export async function sendWatchPartyMessage(
    roomId: string,
    userId: string,
    username: string,
    text: string
): Promise<void> {
    if (!text.trim()) return;
    const messagesRef = collection(db, `watchparties/${roomId}/messages`);
    await addDoc(messagesRef, {
        userId,
        username,
        text,
        createdAt: serverTimestamp()
    });
}

// 6. Update custom video URL (Host only)
export async function updateWatchPartyVideo(roomId: string, url: string): Promise<void> {
    const roomRef = doc(db, 'watchparties', roomId);
    await updateDoc(roomRef, {
        customVideoUrl: url,
        currentTime: 0,
        status: 'paused',
        updatedAt: serverTimestamp()
    });
}

// 7. Listen to room updates
export function listenToWatchParty(roomId: string, callback: (room: WatchPartyRoom | null) => void) {
    const roomRef = doc(db, 'watchparties', roomId);
    return onSnapshot(roomRef, (docSnap) => {
        if (docSnap.exists()) {
            callback({ id: docSnap.id, ...docSnap.data() } as WatchPartyRoom);
        } else {
            callback(null);
        }
    });
}

// 8. Listen to room messages
export function listenToWatchPartyMessages(roomId: string, callback: (msgs: WatchPartyMessage[]) => void) {
    const messagesRef = collection(db, `watchparties/${roomId}/messages`);
    const q = query(messagesRef, orderBy('createdAt', 'desc'), limit(50));

    return onSnapshot(q, (snapshot) => {
        const msgs = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as WatchPartyMessage[];
        // Reverse because we want oldest first in the chat UI, but queried desc to get the 50 most recent
        callback(msgs.reverse());
    });
}
