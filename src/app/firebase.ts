import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyB2H02PIXKOLcFtnMK7vssKiEATOPOIHtg",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "flagfootballplays-a7abc.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "flagfootballplays-a7abc",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "flagfootballplays-a7abc.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "49967410641",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:49967410641:web:d3e625771dedca257584f0",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-PCMNNDJV99"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Folder sharing interface
export interface SharedFolder {
  shareId: string;
  folderId: string;
  folderName: string;
  plays: any[];
  createdAt: string;
  expiresAt?: string;
}

// Create a shareable link for a folder
export async function createShareableLink(folderId: string, folderName: string, plays: any[]): Promise<string> {
  const shareId = `share_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  
  const sharedFolder: SharedFolder = {
    shareId,
    folderId,
    folderName,
    plays,
    createdAt: new Date().toISOString()
  };
  
  // Store in Firestore
  await setDoc(doc(db, 'sharedFolders', shareId), sharedFolder);
  
  // Use custom domain if provided, otherwise use current origin
  const baseUrl = process.env.NEXT_PUBLIC_SHARE_DOMAIN || window.location.origin;
  
  // Return the shareable URL
  return `${baseUrl}/shared/${shareId}`;
}

// Get shared folder data by share ID
export async function getSharedFolder(shareId: string): Promise<SharedFolder | null> {
  try {
    const docRef = doc(db, 'sharedFolders', shareId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data() as SharedFolder;
    }
    return null;
  } catch (error) {
    console.error('Error fetching shared folder:', error);
    return null;
  }
}
