import { initializeApp, getApps } from 'firebase/app';
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
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyB2H02PIXKOLcFtnMK7vssKiEATOPOIHtg",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "flagfootballplays-a7abc.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "flagfootballplays-a7abc",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "flagfootballplays-a7abc.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "49967410641",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:49967410641:web:d3e625771dedca257584f0",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-PCMNNDJV99"
};

// Lazy initialization - only initialize Firebase on the client side when actually needed
let app: ReturnType<typeof initializeApp> | null = null;
let db: ReturnType<typeof getFirestore> | null = null;

function getDb() {
  // Only initialize on client side
  if (typeof window === 'undefined') {
    throw new Error('Firebase can only be used on the client side');
  }
  
  // Initialize if not already initialized
  if (!app) {
    try {
      // Check if Firebase app already exists (from hot reload or multiple calls)
      const existingApps = getApps();
      if (existingApps.length > 0) {
        app = existingApps[0];
      } else {
        app = initializeApp(firebaseConfig);
      }
    } catch (error) {
      // If initialization fails, try to get existing app
      const existingApps = getApps();
      if (existingApps.length > 0) {
        app = existingApps[0];
      } else {
        throw error;
      }
    }
  }
  
  if (!db) {
    db = getFirestore(app);
  }
  
  return db;
}

// Folder sharing interface
export interface SharedFolder {
  shareId: string;
  folderId: string;
  folderName: string;
  plays: SavedPlay[];
  createdAt: string;
  expiresAt?: string;
}

// Note: convertArraysToObjects removed - now using JSON.stringify/parse instead

// Helper function to convert objects back to arrays (kept for potential future use)
// eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
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
    // Get Firestore instance (lazy initialization)
    const firestoreDb = getDb();
    
    console.log('Creating shareable link for folder:', folderName, 'with', Array.isArray(plays) ? plays.length : 0, 'plays');
    console.log('Firebase config check - API Key present:', !!firebaseConfig.apiKey);
    console.log('Firebase config check - Project ID:', firebaseConfig.projectId);
    
    const shareId = `share_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    
    // Store plays directly as array (Firestore handles arrays natively)
    const sharedFolder = {
      shareId,
      folderId,
      folderName,
      plays: plays, // Store as array directly - same structure as localStorage
      createdAt: new Date().toISOString()
    };
    
    console.log('Attempting to save to Firestore with shareId:', shareId);
    
    // Store in Firestore
    await setDoc(doc(firestoreDb, 'sharedFolders', shareId), sharedFolder);
    
    console.log('Successfully saved to Firestore');
    
    // Use custom domain if provided, otherwise use current origin
    // Only access window on client side
    let baseUrl: string;
    if (typeof window !== 'undefined') {
      baseUrl = process.env.NEXT_PUBLIC_SHARE_DOMAIN || window.location.origin;
    } else {
      // Server-side fallback
      baseUrl = process.env.NEXT_PUBLIC_SHARE_DOMAIN || 'https://your-project.vercel.app';
    }
    
    // Ensure baseUrl has protocol
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      baseUrl = `https://${baseUrl}`;
    }
    
    const shareUrl = `${baseUrl}/shared/${shareId}`;
    console.log('Generated share URL:', shareUrl);
    
    // Return the shareable URL
    return shareUrl;
  } catch (error) {
    console.error('Error creating shareable link:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      code: (error as any)?.code,
      stack: error instanceof Error ? error.stack : undefined
    });
    // Re-throw with more context
    if (error instanceof Error) {
      throw new Error(`Firebase error: ${error.message}. Please check Firestore security rules and environment variables.`);
    }
    throw new Error('Failed to create share link. Check console for details.');
  }
}

// Get shared folder data by share ID
export async function getSharedFolder(shareId: string): Promise<SharedFolder | null> {
  try {
    // Get Firestore instance (lazy initialization)
    const firestoreDb = getDb();
    
    console.log('Fetching shared folder with shareId:', shareId);
    
    const docRef = doc(firestoreDb, 'sharedFolders', shareId);
    const docSnap = await getDoc(docRef);
    
    console.log('Document exists:', docSnap.exists());
    
    if (docSnap.exists()) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = docSnap.data() as any;
      
      // Get plays directly from Firestore (stored as array)
      let plays: SavedPlay[] = [];
      if (data.plays) {
        // Firestore returns arrays directly, but ensure it's actually an array
        plays = Array.isArray(data.plays) ? data.plays : [];
        console.log('Successfully fetched', plays.length, 'plays from Firestore');
      } else if (data.playsJson) {
        // Fallback: support old format with JSON string (for backwards compatibility)
        try {
          const parsed = JSON.parse(data.playsJson);
          plays = Array.isArray(parsed) ? parsed : [];
          console.log('Successfully parsed', plays.length, 'plays from JSON (legacy format)');
        } catch (parseError) {
          console.error('Error parsing playsJson:', parseError);
          plays = [];
        }
      }
      
      // Ensure plays is always an array (defensive check)
      if (!Array.isArray(plays)) {
        console.warn('Plays is not an array, defaulting to empty array');
        plays = [];
      }
      
      const convertedData: SharedFolder = {
        shareId: data.shareId || shareId,
        folderId: data.folderId || '',
        folderName: data.folderName || 'Shared Folder',
        plays: plays,
        createdAt: data.createdAt || new Date().toISOString(),
        expiresAt: data.expiresAt
      };
      
      console.log('Successfully fetched shared folder:', convertedData.folderName, 'with', plays.length, 'plays');
      return convertedData;
    }
    console.warn('Shared folder not found for shareId:', shareId);
    return null;
  } catch (error) {
    console.error('Error fetching shared folder:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      code: (error as any)?.code,
      stack: error instanceof Error ? error.stack : undefined
    });
    return null;
  }
}
