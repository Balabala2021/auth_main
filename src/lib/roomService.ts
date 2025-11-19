import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebase';

export interface RoomType {
  uid: string;
  slug: string;
  title: string;
  type: string;
}

/**
 * Fetches room types from the room_type table, filtered by type (e.g., 'room' or 'site').
 * @param type 'room' | 'site'
 */
export async function fetchRoomTypesByType(type: 'room' | 'site'): Promise<RoomType[]> {
  const q = query(collection(db, 'room_type'), where('type', '==', type));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as RoomType));
}

/**
 * Fetches all room types (no filter).
 */
export async function fetchAllRoomTypes(): Promise<RoomType[]> {
  const snapshot = await getDocs(collection(db, 'room_type'));
  return snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as RoomType));
}
