import { collection, getDocs, query } from 'firebase/firestore';
import { db } from './firebase';

export interface SiteType {
    uid: string;
    slug: string;
    title: string;
    type: string;
}

export async function fetchAllSiteTypes(): Promise<SiteType[]> {
    const snapshot = await getDocs(collection(db, 'site_type'));
    return snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as SiteType));
}