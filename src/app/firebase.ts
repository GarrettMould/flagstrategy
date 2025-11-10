import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, User, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

export interface SavedPlay {
  id: string;
  name: string;
  folderId?: string;
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
  playerRouteAssociations?: [string, string[]][] | { [playerId: string]: string[] }; // Array format (legacy) or object format (Firestore)
  playNotes?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Firebase configuration
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyB2H02PIXKOLcFtnMK7vssKiEATOpOIHtg",
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
let auth: ReturnType<typeof getAuth> | null = null;

function getApp() {
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
  
  return app;
}

function getDb() {
  const firebaseApp = getApp();
  
  if (!db) {
    db = getFirestore(firebaseApp);
  }
  
  return db;
}

function getAuthInstance() {
  const firebaseApp = getApp();
  
  if (!auth) {
    auth = getAuth(firebaseApp);
  }
  
  return auth;
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

// User data interface
export interface UserData {
  savedPlays: SavedPlay[];
  folders: Array<{
    id: string;
    name: string;
    createdAt: string;
  }>;
  updatedAt: string;
}

// Authentication functions
export async function signUp(email: string, password: string): Promise<User> {
  try {
    const authInstance = getAuthInstance();
    const userCredential = await createUserWithEmailAndPassword(authInstance, email, password);
    
    // Create initial user data document in Firestore
    const userData: UserData = {
      savedPlays: [],
      folders: [],
      updatedAt: new Date().toISOString()
    };
    
    const firestoreDb = getDb();
    await setDoc(doc(firestoreDb, 'users', userCredential.user.uid), userData);
    
    return userCredential.user;
  } catch (error) {
    console.error('Error signing up:', error);
    throw error;
  }
}

export async function logIn(email: string, password: string): Promise<User> {
  try {
    const authInstance = getAuthInstance();
    const userCredential = await signInWithEmailAndPassword(authInstance, email, password);
    return userCredential.user;
  } catch (error) {
    console.error('Error logging in:', error);
    throw error;
  }
}

export async function signInWithGoogle(): Promise<User> {
  try {
    const authInstance = getAuthInstance();
    const provider = new GoogleAuthProvider();
    const userCredential = await signInWithPopup(authInstance, provider);
    
    // Check if this is a new user and create user data document if needed
    const firestoreDb = getDb();
    const userDocRef = doc(firestoreDb, 'users', userCredential.user.uid);
    const userDocSnap = await getDoc(userDocRef);
    
    if (!userDocSnap.exists()) {
      // New user - create initial user data document
      const userData: UserData = {
        savedPlays: [],
        folders: [],
        updatedAt: new Date().toISOString()
      };
      await setDoc(userDocRef, userData);
    }
    
    return userCredential.user;
  } catch (error) {
    console.error('Error signing in with Google:', error);
    throw error;
  }
}

export async function logOut(): Promise<void> {
  try {
    const authInstance = getAuthInstance();
    await signOut(authInstance);
  } catch (error) {
    console.error('Error logging out:', error);
    throw error;
  }
}

export function onAuthStateChange(callback: (user: User | null) => void) {
  const authInstance = getAuthInstance();
  return onAuthStateChanged(authInstance, callback);
}

// Get current user
export function getCurrentUser(): User | null {
  const authInstance = getAuthInstance();
  return authInstance.currentUser;
}

// Helper function to sanitize data for Firestore (convert nested arrays to objects)
// Only converts arrays that are directly arrays of arrays (not arrays of objects with array properties)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function sanitizeForFirestore(data: any): any {
  if (data === null || data === undefined) {
    return data;
  }
  
  // Handle arrays
  if (Array.isArray(data)) {
    // Check if this is an array of arrays (nested array) - where items are directly arrays
    // This is different from an array of objects that contain arrays
    const isArrayOfArrays = data.length > 0 && data.every(item => Array.isArray(item) && (item.length === 0 || typeof item[0] !== 'object' || item[0] === null));
    
    if (isArrayOfArrays) {
      // Convert array of arrays to object with numeric keys
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const obj: { [key: string]: any } = {};
      data.forEach((item, index) => {
        obj[index.toString()] = sanitizeForFirestore(item);
      });
      return obj;
    } else {
      // Regular array (of objects, primitives, etc.) - recursively sanitize items
      return data.map(item => sanitizeForFirestore(item));
    }
  }
  
  // Handle objects
  if (typeof data === 'object') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: { [key: string]: any } = {};
    for (const key in data) {
      if (data.hasOwnProperty(key)) {
        result[key] = sanitizeForFirestore(data[key]);
      }
    }
    return result;
  }
  
  // Primitives - return as-is
  return data;
}

// Save user data to Firestore (cloud-first)
export async function saveUserData(userId: string, data: UserData): Promise<void> {
  try {
    console.log('=== saveUserData START ===');
    console.log('User ID:', userId);
    console.log('Data to save:', {
      savedPlaysCount: data.savedPlays?.length || 0,
      foldersCount: data.folders?.length || 0,
      savedPlays: data.savedPlays?.map(p => ({ id: p.id, name: p.name, folderId: p.folderId })) || [],
      folders: data.folders || []
    });
    
    // Check for nested arrays in playerRouteAssociations
    if (data.savedPlays) {
      data.savedPlays.forEach((play, index) => {
        if (play.playerRouteAssociations && Array.isArray(play.playerRouteAssociations)) {
          console.log(`Play ${index} (${play.name}) has array format playerRouteAssociations:`, play.playerRouteAssociations);
          // Convert array format to object format
          play.playerRouteAssociations = Object.fromEntries(play.playerRouteAssociations as [string, string[]][]);
          console.log(`Converted to object format:`, play.playerRouteAssociations);
        }
      });
    }
    
    console.log('Full data object:', JSON.stringify(data, null, 2));
    
    const firestoreDb = getDb();
    const userDataWithTimestamp = {
      ...data,
      updatedAt: new Date().toISOString()
    };
    
    // Sanitize data to ensure no nested arrays
    const sanitizedData = sanitizeForFirestore(userDataWithTimestamp);
    console.log('Sanitized data:', JSON.stringify(sanitizedData, null, 2));
    
    console.log('Saving to Firestore path: users/', userId);
    
    await setDoc(doc(firestoreDb, 'users', userId), sanitizedData, { merge: true });
    
    console.log('Successfully saved to Firestore');
    console.log('=== saveUserData END ===');
  } catch (error) {
    console.error('=== Error in saveUserData ===');
    console.error('Error:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      code: (error as any)?.code,
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}

// Load user data from Firestore
export async function loadUserData(userId: string): Promise<UserData | null> {
  try {
    console.log('=== loadUserData START ===');
    console.log('User ID:', userId);
    
    const firestoreDb = getDb();
    const docRef = doc(firestoreDb, 'users', userId);
    console.log('Loading from Firestore path: users/', userId);
    
    const docSnap = await getDoc(docRef);
    console.log('Document exists:', docSnap.exists());
    
    if (docSnap.exists()) {
      const rawData = docSnap.data();
      console.log('Raw data from Firestore:', rawData);
      console.log('Raw data keys:', Object.keys(rawData));
      console.log('Raw savedPlays type:', typeof rawData.savedPlays, 'isArray:', Array.isArray(rawData.savedPlays));
      console.log('Raw savedPlays value:', rawData.savedPlays);
      console.log('Raw folders type:', typeof rawData.folders, 'isArray:', Array.isArray(rawData.folders));
      console.log('Raw folders value:', rawData.folders);
      
      const data = rawData as UserData;
      const result = {
        savedPlays: Array.isArray(data.savedPlays) ? data.savedPlays : [],
        folders: Array.isArray(data.folders) ? data.folders : [],
        updatedAt: data.updatedAt || new Date().toISOString()
      };
      
      console.log('Processed result:', {
        savedPlaysCount: result.savedPlays.length,
        foldersCount: result.folders.length,
        savedPlays: result.savedPlays.map(p => ({ id: p.id, name: p.name, folderId: p.folderId })),
        folders: result.folders
      });
      console.log('=== loadUserData END (found) ===');
      return result;
    }
    
    // If user document doesn't exist, create it
    console.log('Document does not exist, creating initial data');
    const initialData: UserData = {
      savedPlays: [],
      folders: [],
      updatedAt: new Date().toISOString()
    };
    await setDoc(docRef, initialData);
    console.log('Created initial user document');
    console.log('=== loadUserData END (created) ===');
    return initialData;
  } catch (error) {
    console.error('=== Error in loadUserData ===');
    console.error('Error:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      code: (error as any)?.code,
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  }
}
