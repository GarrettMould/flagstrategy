import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';

interface SavedPlay {
  id: string;
  name: string;
  players: Array<{
    id: string;
    x: number;
    y: number;
    color: string;
    type: 'offense' | 'defense';
  }>;
  routes: Array<{
    id: string;
    points: Array<{ x: number; y: number }>;
    style: 'solid' | 'dashed';
    lineBreakType: 'rigid' | 'smooth' | 'none' | 'smooth-none';
  }>;
  textBoxes?: Array<{
    id: string;
    x: number;
    y: number;
    text: string;
    fontSize: number;
    color: string;
  }>;
  circles?: Array<{
    id: string;
    x: number;
    y: number;
    radius: number;
    color: string;
  }>;
}

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
  plays: SavedPlay[];
  createdAt: string;
  expiresAt?: string;
}

// Helper function to convert arrays to objects (Firestore doesn't support nested arrays)
function convertArraysToObjects(data: any): any {
  if (Array.isArray(data)) {
    // Convert array to object with numeric keys
    const obj: { [key: string]: any } = {};
    data.forEach((item, index) => {
      obj[index.toString()] = convertArraysToObjects(item);
    });
    return obj;
  } else if (data && typeof data === 'object') {
    // Recursively process object properties
    const result: { [key: string]: any } = {};
    for (const key in data) {
      if (data.hasOwnProperty(key)) {
        result[key] = convertArraysToObjects(data[key]);
      }
    }
    return result;
  }
  return data;
}

// Helper function to convert objects back to arrays
function convertObjectsToArrays(data: any): any {
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    // Check if this looks like an array converted to object (has numeric keys 0, 1, 2, etc.)
    const keys = Object.keys(data);
    const isArrayLike = keys.length > 0 && keys.every((k, i) => k === i.toString());
    
    if (isArrayLike) {
      // Convert back to array
      return keys.map(k => convertObjectsToArrays(data[k]));
    } else {
      // Recursively process object properties
      const result: { [key: string]: any } = {};
      for (const key in data) {
        if (data.hasOwnProperty(key)) {
          result[key] = convertObjectsToArrays(data[key]);
        }
      }
      return result;
    }
  }
  return data;
}

// Create a shareable link for a folder
export async function createShareableLink(folderId: string, folderName: string, plays: SavedPlay[]): Promise<string> {
  try {
    const shareId = `share_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    
    // Convert nested arrays to objects for Firestore compatibility
    const playsForFirestore = convertArraysToObjects(plays);
    
    const sharedFolder = {
      shareId,
      folderId,
      folderName,
      plays: playsForFirestore,
      createdAt: new Date().toISOString()
    };
    
    // Store in Firestore
    await setDoc(doc(db, 'sharedFolders', shareId), sharedFolder);
    
    // Use custom domain if provided, otherwise use current origin
    const baseUrl = process.env.NEXT_PUBLIC_SHARE_DOMAIN || window.location.origin;
    
    // Return the shareable URL
    return `${baseUrl}/shared/${shareId}`;
  } catch (error) {
    console.error('Error creating shareable link:', error);
    // Re-throw with more context
    if (error instanceof Error) {
      throw new Error(`Firebase error: ${error.message}. Please check Firestore security rules.`);
    }
    throw new Error('Failed to create share link. Check console for details.');
  }
}

// Get shared folder data by share ID
export async function getSharedFolder(shareId: string): Promise<SharedFolder | null> {
  try {
    const docRef = doc(db, 'sharedFolders', shareId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      // Convert objects back to arrays
      const convertedData = {
        ...data,
        plays: convertObjectsToArrays(data.plays)
      };
      return convertedData as SharedFolder;
    }
    return null;
  } catch (error) {
    console.error('Error fetching shared folder:', error);
    return null;
  }
}
