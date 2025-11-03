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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function convertArraysToObjects(data: any): any {
  if (Array.isArray(data)) {
    // Convert array to object with numeric keys
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const obj: { [key: string]: any } = {};
    data.forEach((item, index) => {
      obj[index.toString()] = convertArraysToObjects(item);
    });
    return obj;
  } else if (data && typeof data === 'object') {
    // Recursively process object properties
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function convertObjectsToArrays(data: any): any {
  // If data is already an array, return it
  if (Array.isArray(data)) {
    return data.map(item => convertObjectsToArrays(item));
  }
  
  // If data is null or undefined, return as-is
  if (data == null) {
    return data;
  }
  
  // If data is not an object, return as-is (primitives)
  if (typeof data !== 'object') {
    return data;
  }
  
  // Check if this looks like an array converted to object (has numeric keys 0, 1, 2, etc.)
  const keys = Object.keys(data);
  
  // Check if all keys are numeric (array-like)
  const isArrayLike = keys.length > 0 && keys.every((k, i) => {
    const numKey = parseInt(k, 10);
    return !isNaN(numKey) && numKey === i && k === i.toString();
  });
  
  if (isArrayLike) {
    // Convert back to array, sorting by numeric keys
    const sortedKeys = keys.sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
    return sortedKeys.map(k => convertObjectsToArrays(data[k]));
  } else {
    // Recursively process object properties
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: { [key: string]: any } = {};
    for (const key in data) {
      if (data.hasOwnProperty(key)) {
        result[key] = convertObjectsToArrays(data[key]);
      }
    }
    return result;
  }
}

// Create a shareable link for a folder
export async function createShareableLink(folderId: string, folderName: string, plays: SavedPlay[]): Promise<string> {
  try {
    const shareId = `share_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    
    // Store plays as JSON string (simpler and more reliable than converting arrays)
    const sharedFolder = {
      shareId,
      folderId,
      folderName,
      playsJson: JSON.stringify(plays), // Store as JSON string instead of trying to convert arrays
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
      const data = docSnap.data() as any;
      
      let plays: SavedPlay[] = [];
      
      // New format: plays stored as JSON string
      if (data.playsJson && typeof data.playsJson === 'string') {
        try {
          plays = JSON.parse(data.playsJson);
          if (!Array.isArray(plays)) {
            console.warn('Parsed playsJson is not an array');
            plays = [];
          }
        } catch (parseError) {
          console.error('Error parsing playsJson:', parseError);
          plays = [];
        }
      }
      // Legacy format: try to read from old plays field and convert
      else if (data.plays !== null && data.plays !== undefined) {
        if (Array.isArray(data.plays)) {
          plays = data.plays;
        } else {
          // Try to convert old format
          try {
            plays = convertObjectsToArrays(data.plays);
            if (!Array.isArray(plays)) {
              plays = [];
            }
          } catch (convError) {
            console.error('Error converting legacy plays format:', convError);
            plays = [];
          }
        }
      }
      
      // Final safety check
      if (!Array.isArray(plays)) {
        console.warn('Plays is not an array after all attempts, using empty array');
        plays = [];
      }
      
      const convertedData: SharedFolder = {
        shareId: data.shareId || shareId,
        folderId: data.folderId || '',
        folderName: data.folderName || '',
        plays: plays,
        createdAt: data.createdAt || new Date().toISOString(),
        expiresAt: data.expiresAt
      };
      
      return convertedData;
    }
    return null;
  } catch (error) {
    console.error('Error fetching shared folder:', error);
    return null;
  }
}
