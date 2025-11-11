'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import { loadUserData, saveUserData, UserData, SavedPlay, createShareableLink, signUp, logIn, signInWithGoogle } from '../firebase';

interface Player {
  id: string;
  x: number;
  y: number;
  color: string;
  type: 'offense' | 'defense';
}

interface Route {
  id: string;
  points: { x: number; y: number }[];
  style: 'solid' | 'dashed';
  lineBreakType: 'rigid' | 'smooth' | 'none' | 'smooth-none';
  color: string;
}

interface Folder {
  id: string;
  name: string;
  createdAt: string;
  parentFolderId?: string | null;
}

interface TextBox {
  id: string;
  x: number;
  y: number;
  text: string;
  fontSize: number;
  color: string;
}

interface Circle {
  id: string;
  x: number;
  y: number;
  radius: number;
  color: string;
}

interface Football {
  id: string;
  x: number;
  y: number;
  size: number;
}

const colors = [
  { name: 'blue', color: 'bg-blue-500', label: '' },
  { name: 'red', color: 'bg-red-500', label: '' },
  { name: 'green', color: 'bg-green-500', label: '' },
  { name: 'yellow', color: 'bg-yellow-500', label: '' },
  { name: 'qb', color: 'bg-black', label: 'QB' },
];

function UserMenu() {
  const { user, logout } = useAuth();
  const [showMenu, setShowMenu] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      setShowMenu(false);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  if (!user) {
    return (
      <Link
        href="/login"
        className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium shadow-sm"
      >
        Sign In
      </Link>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        <span className="hidden sm:inline">{user.email}</span>
      </button>
      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-20">
            <div className="px-4 py-2 text-sm text-gray-700 border-b">
              {user.email}
            </div>
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              Sign Out
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function MyPlays() {
  const { user, loading: authLoading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      if (logout) {
        await logout();
      }
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };
  const [savedPlays, setSavedPlays] = useState<SavedPlay[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null); // Current folder being viewed
  const [folderPath, setFolderPath] = useState<Folder[]>([]); // Breadcrumb path
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set()); // For sidebar tree
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set()); // Multi-select
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid'); // Grid or list view
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [menuOpenForPlay, setMenuOpenForPlay] = useState<string | null>(null);
  const [showAddToFolderModal, setShowAddToFolderModal] = useState<boolean>(false);
  const [playToAddToFolder, setPlayToAddToFolder] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [playToDelete, setPlayToDelete] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState<string>('');
  const [folderMenuOpen, setFolderMenuOpen] = useState<string | null>(null);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState<string>('');
  const [notesTooltipPlayId, setNotesTooltipPlayId] = useState<string | null>(null);
  const [showCreateFolderModal, setShowCreateFolderModal] = useState<boolean>(false);
  const [newFolderInput, setNewFolderInput] = useState<string>('');
  const [folderCardMenuOpen, setFolderCardMenuOpen] = useState<string | null>(null);
  const [showDeleteFolderModal, setShowDeleteFolderModal] = useState<boolean>(false);
  const [folderToDelete, setFolderToDelete] = useState<string | null>(null);
  const [showRenameFolderModal, setShowRenameFolderModal] = useState<boolean>(false);
  const [folderToRename, setFolderToRename] = useState<{ id: string; name: string } | null>(null);
  const [renameFolderInput, setRenameFolderInput] = useState<string>('');
  const [showShareModal, setShowShareModal] = useState<boolean>(false);
  const [shareUrl, setShareUrl] = useState<string>('');
  const [shareError, setShareError] = useState<string | null>(null);

  // Load user data from Firestore when user logs in
  useEffect(() => {
    const loadData = async () => {
      if (user && !authLoading) {
        // Load from both Firebase and localStorage, then merge
        try {
          const userData = await loadUserData(user.uid);
          const localPlays = JSON.parse(localStorage.getItem('savedPlays') || '[]');
          const localFolders = JSON.parse(localStorage.getItem('playFolders') || '[]');
          
          // Merge plays: combine Firebase and localStorage plays, with local taking precedence for duplicates
          let mergedPlays = localPlays;
          if (userData && userData.savedPlays && userData.savedPlays.length > 0) {
            const localPlayIds = new Set(localPlays.map((p: SavedPlay) => p.id));
            const firebasePlaysToAdd = userData.savedPlays.filter((p: SavedPlay) => !localPlayIds.has(p.id));
            mergedPlays = [...firebasePlaysToAdd, ...localPlays];
          }
          
          // Merge folders: combine Firebase and localStorage folders, with local taking precedence for duplicates
          let mergedFolders = localFolders;
          if (userData && userData.folders && userData.folders.length > 0) {
            const localFolderIds = new Set(localFolders.map((f: Folder) => f.id));
            const firebaseFoldersToAdd = userData.folders.filter((f: Folder) => !localFolderIds.has(f.id));
            mergedFolders = [...firebaseFoldersToAdd, ...localFolders];
          }
          
          // Update state with merged data
          setSavedPlays(mergedPlays);
          setFolders(mergedFolders);
          
          // Update localStorage with merged data
          localStorage.setItem('savedPlays', JSON.stringify(mergedPlays));
          localStorage.setItem('playFolders', JSON.stringify(mergedFolders));
          
          // If merged data differs from Firebase, sync back to Firebase
          if (userData && (
            JSON.stringify(mergedPlays) !== JSON.stringify(userData.savedPlays || []) ||
            JSON.stringify(mergedFolders) !== JSON.stringify(userData.folders || [])
          )) {
            try {
              const userDataToSave: UserData = {
                savedPlays: mergedPlays,
                folders: mergedFolders,
                updatedAt: new Date().toISOString()
              };
              await saveUserData(user.uid, userDataToSave);
              console.log('Synced merged data back to Firebase');
            } catch (syncError) {
              console.error('Error syncing merged data to Firebase:', syncError);
            }
          }
        } catch (error) {
          console.error('Error loading user data from Firebase:', error);
          // Fall back to localStorage on error
    const plays = JSON.parse(localStorage.getItem('savedPlays') || '[]');
          const savedFolders = JSON.parse(localStorage.getItem('playFolders') || '[]');
    setSavedPlays(plays);
          setFolders(savedFolders);
        }
      } else if (!user && !authLoading) {
        // Not logged in - load from localStorage only
        const plays = JSON.parse(localStorage.getItem('savedPlays') || '[]');
    const savedFolders = JSON.parse(localStorage.getItem('playFolders') || '[]');
        setSavedPlays(plays);
    setFolders(savedFolders);
      }
    
    // Check for folder query parameter
    const urlParams = new URLSearchParams(window.location.search);
    const folderId = urlParams.get('folder');
    if (folderId) {
      // Delay navigation until folders are loaded
      setTimeout(() => navigateToFolder(folderId), 0);
    } else {
      // Delay navigation until folders are loaded
      setTimeout(() => navigateToFolder(null), 0);
    }
    };
    
    loadData();
  }, [user, authLoading]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (menuOpenForPlay && !target.closest('[data-menu-container]')) {
        setMenuOpenForPlay(null);
      }
      if (folderMenuOpen && !target.closest('[data-folder-menu]')) {
        setFolderMenuOpen(null);
      }
      if (folderCardMenuOpen && !target.closest('[data-folder-card-menu]')) {
        setFolderCardMenuOpen(null);
      }
    };

    if (menuOpenForPlay || folderMenuOpen || folderCardMenuOpen) {
      // Use click instead of mousedown to allow onClick handlers to fire first
      document.addEventListener('click', handleClickOutside);
      return () => {
        document.removeEventListener('click', handleClickOutside);
      };
    }
  }, [menuOpenForPlay, folderMenuOpen, folderCardMenuOpen]);

  // Helper functions for folder navigation
  const getFoldersInCurrentFolder = (parentId: string | null): (Folder | { id: string; name: string; createdAt: string; parentFolderId: null; isAllPlays: boolean })[] => {
    // Handle both null and undefined for backward compatibility
    if (parentId === null) {
      // At root level, include "All Plays" as the first folder
      const allPlaysFolder = {
        id: '__all_plays__',
        name: 'All Plays',
        createdAt: new Date(0).toISOString(),
        parentFolderId: null as null,
        isAllPlays: true
      };
      return [allPlaysFolder, ...folders.filter(f => !f.parentFolderId || f.parentFolderId === null)];
    }
    if (parentId === '__all_plays__') {
      // "All Plays" folder doesn't contain other folders, only plays
      return [];
    }
    return folders.filter(f => f.parentFolderId === parentId);
  };

  const getPlaysInCurrentFolder = (folderId: string | null): SavedPlay[] => {
    // Handle both null and undefined for backward compatibility
    if (folderId === null) {
      // Root level - no plays shown (only folders)
      return [];
    }
    if (folderId === '__all_plays__') {
      // "All Plays" folder shows all plays
      return savedPlays;
    }
    return savedPlays.filter(play => play.folderId === folderId);
  };

  const navigateToFolder = (folderId: string | null) => {
    setCurrentFolderId(folderId);
    setSelectedItems(new Set()); // Clear selection when navigating
    
    // Build breadcrumb path
    if (folderId === null) {
      setFolderPath([]);
    } else if (folderId === '__all_plays__') {
      // "All Plays" is a special folder, no breadcrumb path
      setFolderPath([]);
    } else {
      const path: Folder[] = [];
      let currentId: string | null = folderId;
      
      while (currentId) {
        const folder = folders.find(f => f.id === currentId);
        if (folder) {
          path.unshift(folder);
          currentId = folder.parentFolderId || null;
        } else {
          break;
        }
      }
      setFolderPath(path);
    }
  };

  const navigateToBreadcrumb = (index: number) => {
    if (index === -1) {
      navigateToFolder(null);
    } else {
      const folder = folderPath[index];
      navigateToFolder(folder.id);
    }
  };

  const toggleFolderExpansion = (folderId: string) => {
    // Don't allow expansion of "All Plays"
    if (folderId === '__all_plays__') return;
    
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  // Get folder tree structure for sidebar
  const getFolderTree = (parentId: string | null, level: number = 0): Array<(Folder | { id: string; name: string; createdAt: string; parentFolderId: null; isAllPlays: boolean }) & { level: number }> => {
    // Handle both null and undefined for backward compatibility
    let children: (Folder | { id: string; name: string; createdAt: string; parentFolderId: null; isAllPlays: boolean })[];
    if (parentId === null) {
      // At root level, include "All Plays" as the first folder
      const allPlaysFolder = {
        id: '__all_plays__',
        name: 'All Plays',
        createdAt: new Date(0).toISOString(),
        parentFolderId: null as null,
        isAllPlays: true
      };
      children = [allPlaysFolder, ...folders.filter(f => !f.parentFolderId || f.parentFolderId === null)];
    } else {
      children = folders.filter(f => f.parentFolderId === parentId);
    }
    
    const result: Array<(Folder | { id: string; name: string; createdAt: string; parentFolderId: null; isAllPlays: boolean }) & { level: number }> = [];
    
    children.forEach(folder => {
      result.push({ ...folder, level });
      // Only expand regular folders, not "All Plays"
      if (!('isAllPlays' in folder) && expandedFolders.has(folder.id)) {
        result.push(...getFolderTree(folder.id, level + 1));
      }
    });
    
    return result;
  };

  const filteredPlays = getPlaysInCurrentFolder(currentFolderId);
  const foldersInCurrentFolder = getFoldersInCurrentFolder(currentFolderId);

  // Function to get a distinct color for each folder
  const getFolderColor = (index: number): string => {
    const colors = [
      'bg-blue-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-red-500',
      'bg-orange-500',
      'bg-yellow-500',
      'bg-green-500',
      'bg-teal-500',
      'bg-cyan-500',
      'bg-indigo-500',
    ];
    return colors[index % colors.length];
  };

  // Get play count for a folder (including nested folders)
  const getPlayCount = (folderId: string | null | string): number => {
    if (folderId === null || folderId === '__all_plays__') {
      // "All Plays" shows all plays
      return savedPlays.length;
    }
    // Count plays directly in this folder
    return savedPlays.filter(play => play.folderId === folderId).length;
  };

  // Get folder count (subfolders) for a folder
  const getFolderCount = (folderId: string | null | string): number => {
    if (folderId === '__all_plays__') {
      // "All Plays" shows count of root folders
      return folders.filter(f => !f.parentFolderId || f.parentFolderId === null).length;
    }
    return folders.filter(f => f.parentFolderId === folderId).length;
  };

  const createNewPlay = () => {
    // Navigate to blank canvas
    window.location.href = '/builder';
  };

  const createNewFolder = async () => {
    if (!newFolderInput.trim()) return;
    
    const newFolder: Folder = {
      id: Date.now().toString(),
      name: newFolderInput.trim(),
      createdAt: new Date().toISOString(),
      parentFolderId: currentFolderId || undefined
    };
    
    const updatedFolders = [...folders, newFolder];
    setFolders(updatedFolders);
    localStorage.setItem('playFolders', JSON.stringify(updatedFolders));
    setNewFolderInput('');
    setShowCreateFolderModal(false);
    
    // Sync to Firebase if user is logged in
    if (user) {
      try {
        const existingData = await loadUserData(user.uid);
        const userData: UserData = {
          savedPlays: existingData?.savedPlays || savedPlays,
          folders: updatedFolders,
          updatedAt: new Date().toISOString()
        };
        await saveUserData(user.uid, userData);
      } catch (error) {
        console.error('Error syncing folder creation to Firebase:', error);
      }
    }
    
    // Expand parent folder in sidebar if it exists
    if (currentFolderId) {
      setExpandedFolders(prev => new Set(prev).add(currentFolderId!));
    }
  };

  const editPlay = (playId: string) => {
    const play = savedPlays.find(p => p.id === playId);
    if (!play) return;
    
    // Store the play data in localStorage for the builder page to load
    localStorage.setItem('editingPlay', JSON.stringify(play));
    // Navigate to the builder page
    window.location.href = '/builder';
  };

  const openAddToFolderModal = (playId: string) => {
    setPlayToAddToFolder(playId);
    setShowAddToFolderModal(true);
    setMenuOpenForPlay(null);
  };

  const addPlayToFolder = async (playId: string, folderId: string | null) => {
    const updatedPlays = savedPlays.map(play => 
      play.id === playId ? { ...play, folderId: folderId || undefined } : play
    );
    setSavedPlays(updatedPlays);
    localStorage.setItem('savedPlays', JSON.stringify(updatedPlays));
    
    // Sync to Firebase if user is logged in
    if (user) {
      try {
        // Load existing data from Firebase to merge properly
        const existingData = await loadUserData(user.uid);
        let mergedPlays = updatedPlays;
        
        if (existingData && existingData.savedPlays.length > 0) {
          // Merge plays: keep existing plays that aren't in local, update/keep local plays
          const existingPlayIds = new Set(existingData.savedPlays.map((p: SavedPlay) => p.id));
          const localPlayIds = new Set(updatedPlays.map((p: SavedPlay) => p.id));
          
          // Keep existing plays that aren't in local array
          const playsToKeep = existingData.savedPlays.filter((p: SavedPlay) => !localPlayIds.has(p.id));
          
          // Merge: combine kept plays with local plays
          mergedPlays = [...playsToKeep, ...updatedPlays];
        }
        
        const userData: UserData = {
          savedPlays: mergedPlays,
          folders: folders,
          updatedAt: new Date().toISOString()
        };
        
        await saveUserData(user.uid, userData);
        console.log('Play folder assignment synced to Firebase successfully');
      } catch (error) {
        console.error('Error syncing play folder assignment to Firebase:', error);
        // Don't block the UI - update to localStorage already happened
      }
    }
    
    setShowAddToFolderModal(false);
    setPlayToAddToFolder(null);
  };

  const openDeleteModal = (playId: string) => {
    setPlayToDelete(playId);
    setShowDeleteModal(true);
    setMenuOpenForPlay(null);
  };

  const confirmDelete = async () => {
    if (!playToDelete) return;
    
    const updatedPlays = savedPlays.filter(play => play.id !== playToDelete);
    setSavedPlays(updatedPlays);
    localStorage.setItem('savedPlays', JSON.stringify(updatedPlays));
    
    // Close modal immediately
    setShowDeleteModal(false);
    setPlayToDelete(null);
    
    // Sync to Firebase - await to ensure deletion is saved before any reload
    if (user) {
        try {
        // Load existing data from Firebase to get folders
          const existingData = await loadUserData(user.uid);
        
        // Save the updated plays directly to Firebase (no merging - deleted play should be removed)
          const userData: UserData = {
          savedPlays: updatedPlays, // Use the filtered plays directly
          folders: existingData?.folders || folders,
            updatedAt: new Date().toISOString()
          };
          
          await saveUserData(user.uid, userData);
          console.log('Play deleted from Firebase successfully');
        } catch (error) {
          console.error('Error syncing play deletion to Firebase:', error);
        // Keep local deletion but warn user - they may need to delete again
        alert('Play deleted locally but failed to sync to cloud. The play may reappear after refresh. Please try again.');
        }
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setPlayToDelete(null);
  };

  // Share folder
  const handleShareFolder = async (folderId: string, folderName: string) => {
    try {
      let playsToShare: SavedPlay[];
      
      if (folderId === '__all_plays__') {
        // Share all plays
        playsToShare = savedPlays;
        folderName = 'All Plays';
      } else {
        // Share plays in specific folder
        playsToShare = savedPlays.filter(play => play.folderId === folderId);
      }
      
      if (playsToShare.length === 0) {
        setShareError('This folder is empty. Add some plays before sharing.');
        setShowShareModal(true);
        setFolderCardMenuOpen(null);
        return;
      }
      
      const url = await createShareableLink(folderId, folderName, playsToShare);
      setShareUrl(url);
      setShareError(null);
      setShowShareModal(true);
      setFolderCardMenuOpen(null);
      
      // Copy to clipboard
      navigator.clipboard.writeText(url);
    } catch (error) {
      console.error('Error creating share link:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setShareError(`Failed to create share link.\n\nError: ${errorMessage}\n\nCheck:\n1. Firestore security rules are set\n2. Browser console for details`);
      setShareUrl('');
      setShowShareModal(true);
      setFolderCardMenuOpen(null);
    }
  };

  // Edit folder name - opens modal
  const handleEditFolderName = (folderId: string, currentName: string) => {
    setFolderToRename({ id: folderId, name: currentName });
    setRenameFolderInput(currentName);
    setShowRenameFolderModal(true);
    setFolderCardMenuOpen(null);
  };

  const saveFolderName = async () => {
    if (!folderToRename || !renameFolderInput.trim()) return;
    
    const updatedFolders = folders.map(f => 
      f.id === folderToRename.id ? { ...f, name: renameFolderInput.trim() } : f
    );
    setFolders(updatedFolders);
    localStorage.setItem('playFolders', JSON.stringify(updatedFolders));
    
    // Sync to Firebase if user is logged in
    if (user) {
      try {
        const existingData = await loadUserData(user.uid);
        const userData: UserData = {
          savedPlays: existingData?.savedPlays || savedPlays,
          folders: updatedFolders,
          updatedAt: new Date().toISOString()
        };
        await saveUserData(user.uid, userData);
      } catch (error) {
        console.error('Error syncing folder name change to Firebase:', error);
      }
    }
    
    setShowRenameFolderModal(false);
    setFolderToRename(null);
    setRenameFolderInput('');
  };

  // Delete folder
  const confirmDeleteFolder = async () => {
    if (!folderToDelete) return;
    
    const folderId = folderToDelete;
    
    // Remove folder from folders list
    const updatedFolders = folders.filter(f => f.id !== folderId);
    setFolders(updatedFolders);
    
    // Unassign plays from deleted folder
    const updatedPlays = savedPlays.map(play => 
      play.folderId === folderId ? { ...play, folderId: undefined } : play
    );
    setSavedPlays(updatedPlays);
    localStorage.setItem('playFolders', JSON.stringify(updatedFolders));
    localStorage.setItem('savedPlays', JSON.stringify(updatedPlays));
    
    // Sync to Firebase if user is logged in
    if (user) {
      try {
        const existingData = await loadUserData(user.uid);
        let mergedPlays = updatedPlays;
        
        if (existingData && existingData.savedPlays.length > 0) {
          const existingPlayIds = new Set(existingData.savedPlays.map((p: SavedPlay) => p.id));
          const localPlayIds = new Set(updatedPlays.map((p: SavedPlay) => p.id));
          const playsToKeep = existingData.savedPlays.filter((p: SavedPlay) => !localPlayIds.has(p.id));
          mergedPlays = [...playsToKeep, ...updatedPlays];
        }
        
        const userData: UserData = {
          savedPlays: mergedPlays,
          folders: updatedFolders,
          updatedAt: new Date().toISOString()
        };
        await saveUserData(user.uid, userData);
      } catch (error) {
        console.error('Error syncing folder deletion to Firebase:', error);
      }
    }
    
    setFolderMenuOpen(null);
  };

  // Open delete folder modal
  const handleDeleteFolder = (folderId: string) => {
    setFolderToDelete(folderId);
    setShowDeleteFolderModal(true);
  };

  // Download a single play as JPG
  const downloadPlayAsJPG = (play: SavedPlay) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      alert('Could not create canvas context.');
      return;
    }

    // Set canvas size with higher resolution
    const baseSize = 800;
    const scale = 2;
    const size = baseSize * scale;
    canvas.width = size;
    canvas.height = size;
    
    ctx.scale(scale, scale);

    // Fill background with white
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, baseSize, baseSize);

    // Draw field lines
    const lineWidth = baseSize * 0.002;
    ctx.strokeStyle = '#9ca3af';
    ctx.lineWidth = lineWidth;

    // Draw yard lines
    for (let i = 1; i < 10; i++) {
      const y = (baseSize * i) / 10;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(baseSize, y);
      ctx.stroke();
    }

    // Draw hash marks
    const hashWidth = baseSize * 0.01;
    const hashHeight = baseSize * 0.02;
    for (let i = 0; i < 10; i++) {
      const y = (baseSize * i) / 10;
      const leftX = baseSize * 0.1;
      const rightX = baseSize * 0.9;
      
      ctx.fillStyle = '#9ca3af';
      ctx.fillRect(leftX, y - hashHeight/2, hashWidth, hashHeight);
      ctx.fillRect(rightX, y - hashHeight/2, hashWidth, hashHeight);
    }

    // Draw sidelines
    ctx.fillStyle = '#9ca3af';
    ctx.fillRect(0, 0, baseSize, lineWidth);
    ctx.fillRect(0, baseSize - lineWidth, baseSize, lineWidth);

    // Calculate bounding box to scale coordinates
    const allPoints: { x: number; y: number }[] = [];
    play.players.forEach(player => allPoints.push({ x: player.x, y: player.y }));
    play.routes?.forEach(route => route.points.forEach(point => allPoints.push(point)));
    play.textBoxes?.forEach(textBox => allPoints.push({ x: textBox.x, y: textBox.y }));
    play.circles?.forEach(circle => allPoints.push({ x: circle.x, y: circle.y }));
    play.footballs?.forEach(football => allPoints.push({ x: football.x, y: football.y }));

    if (allPoints.length === 0) {
      alert('Play has no elements to download.');
      return;
    }

    const minX = Math.min(...allPoints.map(p => p.x));
    const maxX = Math.max(...allPoints.map(p => p.x));
    const minY = Math.min(...allPoints.map(p => p.y));
    const maxY = Math.max(...allPoints.map(p => p.y));
    
    const contentWidth = maxX - minX || 400;
    const contentHeight = maxY - minY || 300;
    const padding = 40;
    const paddedWidth = contentWidth + padding * 2;
    const paddedHeight = contentHeight + padding * 2;
    
    const scaleX = (baseSize - padding * 2) / paddedWidth;
    const scaleY = (baseSize - padding * 2) / paddedHeight;
    const contentScale = Math.min(scaleX, scaleY);
    
    const scaledWidth = paddedWidth * contentScale;
    const scaledHeight = paddedHeight * contentScale;
    const offsetX = (baseSize - scaledWidth) / 2 - (minX - padding) * contentScale;
    const offsetY = (baseSize - scaledHeight) / 2 - (minY - padding) * contentScale;

    // Draw routes
    ctx.strokeStyle = 'black';
    ctx.lineWidth = lineWidth * 3;
    play.routes?.forEach(route => {
      if (!route || !route.points || !Array.isArray(route.points) || route.points.length < 2) return;
      
      if (route.style === 'dashed') {
        ctx.setLineDash([8, 4]);
      } else {
        ctx.setLineDash([]);
      }
      
      ctx.beginPath();
      const firstPoint = route.points[0];
      ctx.moveTo(firstPoint.x * contentScale + offsetX, firstPoint.y * contentScale + offsetY);
      
      const shouldShowArrow = route.lineBreakType !== 'none' && route.lineBreakType !== 'smooth-none';
      const endIndex = shouldShowArrow ? route.points.length - 1 : route.points.length;
      
      for (let i = 1; i < endIndex; i++) {
        const point = route.points[i];
        ctx.lineTo(point.x * contentScale + offsetX, point.y * contentScale + offsetY);
      }
      
      if (shouldShowArrow && route.points.length >= 2) {
        const lastPoint = route.points[route.points.length - 1];
        const secondLastPoint = route.points[route.points.length - 2];
        
        const dx = lastPoint.x - secondLastPoint.x;
        const dy = lastPoint.y - secondLastPoint.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const arrowGap = 6;
        const stopDistance = Math.max(0, distance - arrowGap);
        const stopRatio = stopDistance / distance;
        
        const stopX = secondLastPoint.x + dx * stopRatio;
        const stopY = secondLastPoint.y + dy * stopRatio;
        ctx.lineTo(stopX * contentScale + offsetX, stopY * contentScale + offsetY);
      }
      
      ctx.stroke();
      
      // Draw arrow
      if (shouldShowArrow && route.points.length >= 2) {
        const lastPoint = route.points[route.points.length - 1];
        const secondLastPoint = route.points[route.points.length - 2];
        
        const angle = Math.atan2(secondLastPoint.y - lastPoint.y, secondLastPoint.x - lastPoint.x);
        const arrowLength = baseSize * 0.03;
        const arrowX = (lastPoint.x * contentScale + offsetX) + Math.cos(angle) * arrowLength;
        const arrowY = (lastPoint.y * contentScale + offsetY) + Math.sin(angle) * arrowLength;
        
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.moveTo(lastPoint.x * contentScale + offsetX, lastPoint.y * contentScale + offsetY);
        ctx.lineTo(arrowX - Math.cos(angle - 0.6) * arrowLength * 0.6, arrowY - Math.sin(angle - 0.6) * arrowLength * 0.6);
        ctx.lineTo(arrowX - Math.cos(angle + 0.6) * arrowLength * 0.6, arrowY - Math.sin(angle + 0.6) * arrowLength * 0.6);
        ctx.closePath();
        ctx.fill();
      }
    });

    // Draw players
    const playerRadius = baseSize * 0.03;
    const colorMap: { [key: string]: string } = {
      'blue': '#3b82f6',
      'red': '#ef4444',
      'green': '#22c55e',
      'yellow': '#eab308',
      'qb': '#000000'
    };
    const labelMap: { [key: string]: string } = {
      'blue': 'X',
      'red': 'Z',
      'green': 'Y',
      'yellow': 'C',
      'qb': 'QB'
    };

    play.players.forEach(player => {
      const playerColor = colorMap[player.color] || '#6b7280';
      const playerLabel = labelMap[player.color] || '';
      
      const x = player.x * contentScale + offsetX;
      const y = player.y * contentScale + offsetY;
      
      ctx.fillStyle = playerColor;
      ctx.beginPath();
      ctx.arc(x, y, playerRadius, 0, 2 * Math.PI);
      ctx.fill();
      
      ctx.strokeStyle = 'white';
      ctx.lineWidth = lineWidth * 2;
      ctx.stroke();
      
      if (playerLabel) {
        ctx.fillStyle = 'white';
        ctx.font = `${baseSize * 0.02}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(playerLabel, x, y);
      }
    });

    // Draw text boxes
    play.textBoxes?.forEach(textBox => {
      const x = textBox.x * contentScale + offsetX;
      const y = textBox.y * contentScale + offsetY;
      
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.fillRect(x - 20, y - 8, 40, 16);
      
      ctx.strokeStyle = '#d1d5db';
      ctx.lineWidth = lineWidth;
      ctx.strokeRect(x - 20, y - 8, 40, 16);
      
      ctx.fillStyle = textBox.color;
      ctx.font = `${baseSize * 0.012}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(textBox.text, x, y);
    });

    // Draw circles
    play.circles?.forEach(circle => {
      const x = circle.x * contentScale + offsetX;
      const y = circle.y * contentScale + offsetY;
      const radius = circle.radius * contentScale;
      
      ctx.fillStyle = circle.color;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2 * Math.PI);
      ctx.fill();
    });

    // Draw footballs
    const downloadImage = () => {
      canvas.toBlob((blob) => {
        if (!blob) {
          alert('Could not create image.');
          return;
        }
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${play.name.replace(/[^a-z0-9]/gi, '_')}-${Date.now()}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 'image/jpeg', 0.9);
    };

    if (play.footballs && play.footballs.length > 0) {
      // Load all football images first
      const footballImages: HTMLImageElement[] = [];
      let loadedCount = 0;
      
      play.footballs.forEach((football, index) => {
        const x = football.x * contentScale + offsetX;
        const y = football.y * contentScale + offsetY;
        const size = football.size * contentScale;
        
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, x - size/2, y - size/2, size, size);
          loadedCount++;
          if (loadedCount === play.footballs!.length) {
            downloadImage();
          }
        };
        img.onerror = () => {
          loadedCount++;
          if (loadedCount === play.footballs!.length) {
            downloadImage();
          }
        };
        img.src = '/svgs/american-football.svg';
        footballImages.push(img);
      });
    } else {
      // No footballs, download immediately
      downloadImage();
    }
  };

  // Helper function to generate smooth path
  const generateSmoothPath = (points: { x: number; y: number }[]): string => {
    if (points.length < 2) return '';
    if (points.length === 2) {
      return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
    }
    
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      if (i < points.length - 1) {
        const curr = points[i];
        const next = points[i + 1];
        const controlX = (curr.x + next.x) / 2;
        const controlY = (curr.y + next.y) / 2;
        path += ` Q ${curr.x} ${curr.y} ${controlX} ${controlY}`;
      } else {
        path += ` L ${points[i].x} ${points[i].y}`;
      }
    }
    return path;
  };

  // Render play preview with proper scaling
  const renderPlayPreview = (play: SavedPlay) => {
    // Find bounding box of all elements
    const allPoints: { x: number; y: number }[] = [];
    
    // Add player positions
    play.players.forEach(player => {
      allPoints.push({ x: player.x, y: player.y });
    });
    
    // Add route points
    play.routes?.forEach(route => {
      route.points.forEach(point => {
        allPoints.push(point);
      });
    });
    
    // Add text box positions
    play.textBoxes?.forEach(textBox => {
      allPoints.push({ x: textBox.x, y: textBox.y });
    });

    // Add circle positions
    play.circles?.forEach(circle => {
      allPoints.push({ x: circle.x, y: circle.y });
    });

    // Add football positions
    play.footballs?.forEach(football => {
      allPoints.push({ x: football.x, y: football.y });
    });
    
    if (allPoints.length === 0) {
      return <div className="flex items-center justify-center h-full text-gray-400">No elements</div>;
    }
    
    // Calculate bounding box
    const minX = Math.min(...allPoints.map(p => p.x));
    const maxX = Math.max(...allPoints.map(p => p.x));
    const minY = Math.min(...allPoints.map(p => p.y));
    const maxY = Math.max(...allPoints.map(p => p.y));
    
    const contentWidth = maxX - minX || 400;
    const contentHeight = maxY - minY || 300;
    
    // Add padding
    const padding = 40;
    const paddedWidth = contentWidth + padding * 2;
    const paddedHeight = contentHeight + padding * 2;
    
    // Container dimensions
    const containerWidth = 300;
    const containerHeight = 300;
    
    // Calculate scale to fit with padding
    const scaleX = (containerWidth - padding * 2) / paddedWidth;
    const scaleY = (containerHeight - padding * 2) / paddedHeight;
    const scale = Math.min(scaleX, scaleY);
    
    // Calculate offset to center the content
    const scaledWidth = paddedWidth * scale;
    const scaledHeight = paddedHeight * scale;
    const offsetX = (containerWidth - scaledWidth) / 2 - (minX - padding) * scale;
    const offsetY = (containerHeight - scaledHeight) / 2 - (minY - padding) * scale;

    return (
                    <div className="relative w-full h-full bg-white">
        {/* Football Field Lines */}
        <div className="absolute inset-0">
          {/* Yard Lines */}
          <div className="absolute top-0 left-0 w-full h-full">
            {/* 10-yard lines */}
            <div className="absolute top-[10%] left-0 right-0 h-0.5 bg-gray-400"></div>
            <div className="absolute top-[20%] left-0 right-0 h-0.5 bg-gray-400"></div>
            <div className="absolute top-[30%] left-0 right-0 h-0.5 bg-gray-400"></div>
            <div className="absolute top-[40%] left-0 right-0 h-0.5 bg-gray-400"></div>
            <div className="absolute top-[50%] left-0 right-0 h-0.5 bg-gray-400"></div>
            <div className="absolute top-[60%] left-0 right-0 h-0.5 bg-gray-400"></div>
            <div className="absolute top-[70%] left-0 right-0 h-0.5 bg-gray-400"></div>
            <div className="absolute top-[80%] left-0 right-0 h-0.5 bg-gray-400"></div>
            <div className="absolute top-[90%] left-0 right-0 h-0.5 bg-gray-400"></div>
            
            {/* Hash marks */}
            <div className="absolute top-[5%] left-[10%] w-1 h-2 bg-gray-400"></div>
            <div className="absolute top-[5%] left-[90%] w-1 h-2 bg-gray-400"></div>
            <div className="absolute top-[15%] left-[10%] w-1 h-2 bg-gray-400"></div>
            <div className="absolute top-[15%] left-[90%] w-1 h-2 bg-gray-400"></div>
            <div className="absolute top-[25%] left-[10%] w-1 h-2 bg-gray-400"></div>
            <div className="absolute top-[25%] left-[90%] w-1 h-2 bg-gray-400"></div>
            <div className="absolute top-[35%] left-[10%] w-1 h-2 bg-gray-400"></div>
            <div className="absolute top-[35%] left-[90%] w-1 h-2 bg-gray-400"></div>
            <div className="absolute top-[45%] left-[10%] w-1 h-2 bg-gray-400"></div>
            <div className="absolute top-[45%] left-[90%] w-1 h-2 bg-gray-400"></div>
            <div className="absolute top-[55%] left-[10%] w-1 h-2 bg-gray-400"></div>
            <div className="absolute top-[55%] left-[90%] w-1 h-2 bg-gray-400"></div>
            <div className="absolute top-[65%] left-[10%] w-1 h-2 bg-gray-400"></div>
            <div className="absolute top-[65%] left-[90%] w-1 h-2 bg-gray-400"></div>
            <div className="absolute top-[75%] left-[10%] w-1 h-2 bg-gray-400"></div>
            <div className="absolute top-[75%] left-[90%] w-1 h-2 bg-gray-400"></div>
            <div className="absolute top-[85%] left-[10%] w-1 h-2 bg-gray-400"></div>
            <div className="absolute top-[85%] left-[90%] w-1 h-2 bg-gray-400"></div>
            <div className="absolute top-[95%] left-[10%] w-1 h-2 bg-gray-400"></div>
            <div className="absolute top-[95%] left-[90%] w-1 h-2 bg-gray-400"></div>
            
            {/* Sidelines */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gray-400"></div>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-gray-400"></div>
          </div>
        </div>
        
        {/* Routes */}
                      {play.routes?.map((route) => {
                        if (!route || !route.points || !Array.isArray(route.points) || route.points.length < 2) return null;
                        
          // Scale and offset route points
                        const scaledPoints = route.points.map(point => ({
            x: point.x * scale + offsetX,
            y: point.y * scale + offsetY
                        }));
                        
                        // Calculate arrow direction
                        let startIndex = scaledPoints.length - 2;
                        const lastPoint = scaledPoints[scaledPoints.length - 1];
                        let secondLastPoint = scaledPoints[startIndex];
                        
          // Find the last significant movement
                        while (startIndex > 0) {
                          const dx = lastPoint.x - secondLastPoint.x;
                          const dy = lastPoint.y - secondLastPoint.y;
                          const distance = Math.sqrt(dx * dx + dy * dy);
                          
            if (distance >= 10 * scale) {
                            break;
                          }
                          
                          startIndex--;
                          secondLastPoint = scaledPoints[startIndex];
                        }
                        
                        const angle = Math.atan2(secondLastPoint.y - lastPoint.y, secondLastPoint.x - lastPoint.x);
          const arrowLength = 20 * scale;
                        const arrowX = lastPoint.x + Math.cos(angle) * arrowLength;
                        const arrowY = lastPoint.y + Math.sin(angle) * arrowLength;
          
          // Shorten the line before arrow
          let routePoints = scaledPoints;
          if (route.lineBreakType !== 'none' && route.lineBreakType !== 'smooth-none' && scaledPoints.length >= 2) {
            const lastP = scaledPoints[scaledPoints.length - 1];
            const secondLastP = scaledPoints[scaledPoints.length - 2];
            
            const dx = lastP.x - secondLastP.x;
            const dy = lastP.y - secondLastP.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            const arrowGap = 6 * scale;
            const stopDistance = Math.max(0, distance - arrowGap);
            const stopRatio = stopDistance / distance;
            
            const stopX = secondLastP.x + dx * stopRatio;
            const stopY = secondLastP.y + dy * stopRatio;
            
            routePoints = scaledPoints.slice(0, -1);
            routePoints.push({ x: stopX, y: stopY });
          }
                        
                        return (
                          <svg
                            key={route.id}
                            className="absolute inset-0 w-full h-full pointer-events-none"
                            style={{ zIndex: 1 }}
                          >
              {(route.lineBreakType === 'smooth' || route.lineBreakType === 'smooth-none') ? (
                              <path
                  d={(() => {
                    // If there's an arrow ('smooth' type has arrows, 'smooth-none' doesn't), stop the line slightly before the last point
                    if (route.lineBreakType === 'smooth' && route.points.length >= 2) {
                      const lastP = route.points[route.points.length - 1];
                      const secondLastP = route.points[route.points.length - 2];
                      
                      const dx = lastP.x - secondLastP.x;
                      const dy = lastP.y - secondLastP.y;
                      const distance = Math.sqrt(dx * dx + dy * dy);
                      
                      const arrowGap = 6;
                      const stopDistance = Math.max(0, distance - arrowGap);
                      const stopRatio = stopDistance / distance;
                      
                      const stopX = secondLastP.x + dx * stopRatio;
                      const stopY = secondLastP.y + dy * stopRatio;
                      
                      const points = route.points.slice(0, -1);
                      points.push({ x: stopX, y: stopY });
                      
                      const scaled = points.map(p => ({
                        x: p.x * scale + offsetX,
                        y: p.y * scale + offsetY
                      }));
                      return generateSmoothPath(scaled);
                    } else {
                      const scaled = route.points.map(p => ({
                        x: p.x * scale + offsetX,
                        y: p.y * scale + offsetY
                      }));
                      return generateSmoothPath(scaled);
                    }
                  })()}
                                fill="none"
                                stroke="black"
                  strokeWidth={Math.max(2, 3 * scale)}
                  strokeDasharray={route.style === 'dashed' ? '8,4' : 'none'}
                              />
                            ) : (
                              <polyline
                  points={routePoints.map(p => `${p.x},${p.y}`).join(' ')}
                                fill="none"
                                stroke="black"
                  strokeWidth={Math.max(2, 3 * scale)}
                  strokeDasharray={route.style === 'dashed' ? '8,4' : 'none'}
                              />
                            )}
              {/* Arrow at the end */}
              {route.lineBreakType !== 'none' && route.lineBreakType !== 'smooth-none' && (
                              <polygon
                  points={`${lastPoint.x},${lastPoint.y} ${arrowX - Math.cos(angle - 0.6) * 12 * scale},${arrowY - Math.sin(angle - 0.6) * 12 * scale} ${arrowX - Math.cos(angle + 0.6) * 12 * scale},${arrowY - Math.sin(angle + 0.6) * 12 * scale}`}
                                fill="black"
                              />
                            )}
                          </svg>
                        );
                      })}
                      
        {/* Players */}
                      {play.players.map((player) => {
                        const colorOption = colors.find(c => c.name === player.color);
                        const isQB = player.color === 'qb';
                        return (
                          <div
                            key={player.id}
              className={`absolute rounded-full ${colorOption?.color || 'bg-gray-500'} border-2 border-white transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center`}
                            style={{
                left: player.x * scale + offsetX,
                top: player.y * scale + offsetY,
                width: `${20 * scale}px`,
                height: `${20 * scale}px`,
                minWidth: '20px',
                minHeight: '20px',
                              zIndex: 3,
                            }}
                          >
                            {colorOption?.label && !isQB && (
                <span 
                  className="text-white font-bold"
                  style={{ fontSize: `${Math.max(10, 12 * scale)}px` }}
                >
                                {colorOption.label}
                              </span>
                            )}
                          </div>
                        );
                      })}

        {/* Text Boxes */}
        {play.textBoxes?.map((textBox) => (
          <div
            key={textBox.id}
            className="absolute transform -translate-x-1/2 -translate-y-1/2 bg-white bg-opacity-80 px-2 py-1 rounded border border-gray-300 shadow-sm"
            style={{
              left: textBox.x * scale + offsetX,
              top: textBox.y * scale + offsetY,
              fontSize: `${Math.max(10, textBox.fontSize * scale)}px`,
              color: textBox.color,
              zIndex: 3
            }}
          >
            {textBox.text}
          </div>
        ))}

        {/* Circles */}
        {play.circles?.map((circle) => (
          <div
            key={circle.id}
            className="absolute transform -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              left: circle.x * scale + offsetX,
              top: circle.y * scale + offsetY,
              width: `${circle.radius * 2 * scale}px`,
              height: `${circle.radius * 2 * scale}px`,
              backgroundColor: circle.color,
              zIndex: 3
            }}
          />
        ))}

        {/* Footballs */}
        {play.footballs?.map((football) => (
          <div
            key={football.id}
            className="absolute transform -translate-x-1/2 -translate-y-1/2"
            style={{
              left: football.x * scale + offsetX,
              top: football.y * scale + offsetY,
              width: `${football.size * scale}px`,
              height: `${football.size * scale}px`,
              zIndex: 3
            }}
          >
            <img
              src="/svgs/american-football.svg"
              alt="Football"
              width={football.size * scale}
              height={football.size * scale}
              style={{
                objectFit: 'contain'
              }}
            />
          </div>
        ))}
      </div>
    );
  };

  // Login form state for unauthenticated users
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [googleLoginLoading, setGoogleLoginLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(true); // Default to sign up mode

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);

    try {
      if (isSignUp) {
        await signUp(loginEmail, loginPassword);
      } else {
        await logIn(loginEmail, loginPassword);
      }
      // Redirect to my-plays page after successful login
      router.push('/my-plays');
    } catch (err: unknown) {
      console.error('Auth error:', err);
      const error = err as { code?: string; message?: string };
      if (error.code === 'auth/email-already-in-use') {
        setLoginError('This email is already registered. Please sign in instead.');
      } else if (error.code === 'auth/invalid-email') {
        setLoginError('Invalid email address.');
      } else if (error.code === 'auth/weak-password') {
        setLoginError('Password should be at least 6 characters.');
      } else if (error.code === 'auth/user-not-found') {
        setLoginError('No account found with this email.');
      } else if (error.code === 'auth/wrong-password') {
        setLoginError('Incorrect password.');
      } else {
        setLoginError(error.message || 'An error occurred. Please try again.');
      }
    } finally {
      setLoginLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoginError('');
    setGoogleLoginLoading(true);

    try {
      await signInWithGoogle();
      // Redirect to my-plays page after successful login
      router.push('/my-plays');
    } catch (err: unknown) {
      console.error('Google auth error:', err);
      const error = err as { code?: string; message?: string };
      if (error.code === 'auth/popup-closed-by-user') {
        setLoginError('Sign-in was cancelled.');
      } else if (error.code === 'auth/popup-blocked') {
        setLoginError('Popup was blocked. Please allow popups for this site.');
      } else {
        setLoginError(error.message || 'Failed to sign in with Google. Please try again.');
      }
    } finally {
      setGoogleLoginLoading(false);
    }
  };

  // Show login page if user is not logged in
  if (!authLoading && !user) {
    return (
      <div className="h-screen flex flex-col bg-gray-50">
        {/* Navigation */}
        <header className="flex items-center justify-between px-8 py-6 bg-white border-b border-gray-200 flex-shrink-0">
          {/* Site Title */}
          <div className="flex items-center">
            <Link href="/" className="text-gray-800 font-bold text-lg tracking-tight hover:text-gray-900 transition-colors">
              Flag Tactics
            </Link>
          </div>

          {/* Navigation Links (no login button) */}
          <div className="flex items-center gap-6">
            <Link 
              href="/builder" 
              className={`text-sm font-medium transition-colors ${
                pathname === '/builder' 
                  ? 'text-gray-900' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Play Builder
            </Link>
            <Link 
              href="/my-plays" 
              className={`text-sm font-medium transition-colors ${
                pathname === '/my-plays' 
                  ? 'text-gray-900' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              My Plays
            </Link>
          </div>
        </header>

        {/* Login Form Content */}
        <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full space-y-8">
            <div>
              <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                Save Plays. Share Plays. Win Games.
              </h2>
              <p className="mt-2 text-center text-sm text-gray-600">
                {isSignUp ? (
                  <>
                    Already have an account?{' '}
                    <button
                      onClick={() => {
                        setIsSignUp(false);
                        setLoginError('');
                      }}
                      className="font-medium text-blue-600 hover:text-blue-500"
                    >
                      Sign in
                    </button>
                  </>
                ) : (
                  <>
                    Don&apos;t have an account?{' '}
                    <button
                      onClick={() => {
                        setIsSignUp(true);
                        setLoginError('');
                      }}
                      className="font-medium text-blue-600 hover:text-blue-500"
                    >
                      Sign up
                    </button>
                  </>
                )}
              </p>
            </div>
          <form className="mt-8 space-y-6" onSubmit={handleLoginSubmit}>
            {loginError && (
              <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                <span className="block sm:inline">{loginError}</span>
              </div>
            )}
            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <label htmlFor="email-address" className="sr-only">
                  Email address
                </label>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Email address"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                />
              </div>
              <div className="relative">
                <label htmlFor="password" className="sr-only">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type={showLoginPassword ? 'text' : 'password'}
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 pr-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowLoginPassword(!showLoginPassword);
                  }}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 z-10 cursor-pointer"
                  aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                >
                  {showLoginPassword ? (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <button
                type="submit"
                disabled={loginLoading || googleLoginLoading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loginLoading ? 'Please wait...' : isSignUp ? 'Sign up' : 'Sign in'}
              </button>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-gray-50 text-gray-500">Or continue with</span>
                </div>
              </div>
              
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loginLoading || googleLoginLoading}
                className="w-full flex items-center justify-center gap-3 py-2 px-4 border border-gray-300 rounded-md bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {googleLoginLoading ? (
                  'Please wait...'
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Sign in with Google
                  </>
                )}
              </button>
            </div>
          </form>
          </div>
        </div>
      </div>
    );
  }

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-lg text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Navigation */}
      <header className="flex items-center justify-between px-8 py-6 bg-white border-b border-gray-200 flex-shrink-0">
        {/* Site Title */}
        <div className="flex items-center">
          <span className="text-gray-800 font-bold text-lg tracking-tight">Flag Tactics</span>
        </div>

        {/* Navigation Links and Login/Logout */}
        <div className="flex items-center gap-6">
          <Link 
            href="/builder" 
            className={`text-sm font-medium transition-colors ${
              pathname === '/builder' 
                ? 'text-gray-900' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Play Builder
          </Link>
          <Link 
            href="/my-plays" 
            className={`text-sm font-medium transition-colors ${
              pathname === '/my-plays' 
                ? 'text-gray-900' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            My Plays
          </Link>
          {!user ? (
            <Link
              href="/login"
              className="px-4 py-2 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors text-sm"
            >
              Log In
            </Link>
          ) : (
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors text-sm"
            >
              Log Out
            </button>
          )}
        </div>
      </header>
                  
      {/* Breadcrumb Navigation */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-2 flex-shrink-0">
        <button
          onClick={() => navigateToFolder(null)}
          className="flex items-center gap-2 px-3 py-1.5 rounded hover:bg-gray-100 transition-colors text-sm text-gray-700"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span>My Plays</span>
        </button>
        {folderPath.map((folder, index) => (
          <div key={folder.id} className="flex items-center gap-2">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <button
              onClick={() => navigateToBreadcrumb(index)}
              className="px-3 py-1.5 rounded hover:bg-gray-100 transition-colors text-sm text-gray-700"
            >
              {folder.name}
            </button>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-4 flex-shrink-0">
        {/* Create New Play Button */}
        <button
          onClick={createNewPlay}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Play
        </button>


        {/* View Toggle */}
        <div className="flex items-center gap-1 ml-auto border border-gray-200 rounded-lg p-1">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded transition-colors ${
              viewMode === 'grid' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded transition-colors ${
              viewMode === 'list' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>
                  
      {/* Main Content Area - Sidebar + Grid */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Expand Sidebar Button - Only visible when collapsed */}
        {sidebarCollapsed && (
          <button
            onClick={() => setSidebarCollapsed(false)}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white border-r border-t border-b border-gray-200 rounded-r-lg p-2 shadow-sm hover:bg-gray-50 transition-colors"
            title="Expand sidebar"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}

        {/* Sidebar */}
        <div className={`${sidebarCollapsed ? 'w-0' : 'w-64'} bg-white border-r border-gray-200 flex flex-col transition-all duration-200 overflow-hidden`}>
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Navigation</span>
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              title="Collapse sidebar"
            >
              <svg className={`w-4 h-4 text-gray-600 transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {/* Home Button */}
            <button
              onClick={() => navigateToFolder(null)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors mb-2 ${
                currentFolderId === null ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span>Home</span>
            </button>

            {/* All Plays Folder */}
            <div className="flex items-center gap-1 mb-2">
              <div className="w-5" /> {/* Spacer to align with folders that have expand buttons */}
              <button
                onClick={() => navigateToFolder('__all_plays__')}
                className={`flex-1 flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors ${
                  currentFolderId === '__all_plays__' ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <span>All Plays</span>
            </button>
            </div>
            
            {/* Folder Tree - Regular folders only */}
            {getFolderTree(null)
              .filter(folder => !('isAllPlays' in folder))
              .map((folder) => {
                const hasChildren = folders.some(f => f.parentFolderId === folder.id);
                return (
              <div key={folder.id} style={{ paddingLeft: `${folder.level * 16}px` }}>
                <div className="flex items-center gap-1">
                    {hasChildren ? (
                  <button
                    onClick={() => toggleFolderExpansion(folder.id)}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <svg 
                      className={`w-3 h-3 transition-transform ${expandedFolders.has(folder.id) ? 'rotate-90' : ''}`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                    ) : (
                      <div className="w-5" /> // Spacer to align with folders that have expand buttons
                    )}
                  <button
                    onClick={() => navigateToFolder(folder.id)}
                    className={`flex-1 flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors ${
                      currentFolderId === folder.id ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                    <span className="truncate">{folder.name}</span>
                  </button>
                </div>
              </div>
              )})}
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {viewMode === 'grid' ? (
            <>
              {/* New Folder Button and Subfolders Row - When inside folders */}
              {currentFolderId !== null && currentFolderId !== '__all_plays__' && (
                <div className="mb-6 flex items-center gap-4 flex-wrap">
                  {/* New Folder Button */}
                  <button
                    onClick={() => {
                      setNewFolderInput('');
                      setShowCreateFolderModal(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-all text-sm font-medium text-gray-600"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    New Folder
                  </button>
                  
                  {/* Subfolders in the same row */}
                  {foldersInCurrentFolder.map((folder, index) => {
                    const isAllPlays = 'isAllPlays' in folder && folder.isAllPlays;
                    const folderId = isAllPlays ? '__all_plays__' : folder.id;
                    const colorIndex = isAllPlays ? -1 : (index - 1);
                    return (
                      <div
                        key={folder.id}
                        className="relative group flex items-center gap-2 px-4 py-2 pr-10 bg-white border border-gray-200 rounded-lg overflow-visible shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer min-w-[180px]"
                        onClick={() => navigateToFolder(folderId)}
                      >
                        {/* Three Dots Menu Button */}
                        <div className="absolute top-1/2 right-1 -translate-y-1/2 z-20" onClick={(e) => e.stopPropagation()} data-folder-card-menu>
                          {!isAllPlays && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setFolderCardMenuOpen(folderCardMenuOpen === folder.id ? null : folder.id);
                              }}
                              className="flex items-center justify-center hover:bg-gray-100 transition-colors rounded p-1"
                              data-folder-card-menu
                            >
                              <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                              </svg>
                            </button>
                          )}

                          {/* Dropdown Menu */}
                          {folderCardMenuOpen === folder.id && (
                            <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-xl z-30 min-w-[160px] py-1" data-folder-card-menu>
                              {isAllPlays ? (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleShareFolder('__all_plays__', 'All Plays');
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-gray-900 hover:bg-gray-50 transition-colors flex items-center gap-2"
                                  data-folder-card-menu
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                                  </svg>
                                  Share
                                </button>
                              ) : (
                                <>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEditFolderName(folder.id, folder.name);
                                      setFolderCardMenuOpen(null);
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm text-gray-900 hover:bg-gray-50 transition-colors flex items-center gap-2"
                                    data-folder-card-menu
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                    Rename
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleShareFolder(folder.id, folder.name);
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm text-gray-900 hover:bg-gray-50 transition-colors flex items-center gap-2"
                                    data-folder-card-menu
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                                    </svg>
                                    Share
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const folderPlays = savedPlays.filter(p => p.folderId === folder.id);
                                      folderPlays.forEach((play, index) => {
                                        setTimeout(() => {
                                          downloadPlayAsJPG(play);
                                        }, index * 500);
                                      });
                                      setFolderCardMenuOpen(null);
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm text-gray-900 hover:bg-gray-50 transition-colors flex items-center gap-2"
                                    data-folder-card-menu
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                    Download
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteFolder(folder.id);
                                      setFolderCardMenuOpen(null);
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                                    data-folder-card-menu
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                    Delete Forever
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Folder Icon and Name */}
                        <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
                          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                          </svg>
                        </div>
                        <span className="text-sm font-medium text-gray-900">{folder.name}</span>
                      </div>
                    );
                  })}
                </div>
              )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                {/* Create New Folder Card - Only at root level */}
                {currentFolderId === null && (
                  <div
                    className="relative group bg-white border-2 border-dashed border-gray-300 rounded-lg overflow-visible shadow-sm hover:shadow-md hover:border-gray-400 transition-all duration-200 cursor-pointer"
                    onClick={() => {
                      setNewFolderInput('');
                      setShowCreateFolderModal(true);
                    }}
                  >
                    <div className="p-6 flex flex-col items-center justify-center min-h-[200px]">
                      <div className="w-16 h-16 border-2 border-dashed border-gray-400 rounded-lg flex items-center justify-center mb-4">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </div>
                      <h3 className="text-base font-semibold text-gray-600 mb-1 text-center">New Folder</h3>
                      <p className="text-sm text-gray-400">Click to create</p>
                    </div>
                  </div>
                )}

              {/* Folder Cards - includes "All Plays" - Only show at root level or All Plays */}
              {(currentFolderId === null || currentFolderId === '__all_plays__') && foldersInCurrentFolder.map((folder, index) => {
                const isAllPlays = 'isAllPlays' in folder && folder.isAllPlays;
                const folderId = isAllPlays ? '__all_plays__' : folder.id;
                // Adjust index for color - skip "All Plays" in color calculation
                const colorIndex = isAllPlays ? -1 : (index - 1);
                return (
                <div
                  key={folder.id}
                  className="relative group bg-white border border-gray-200 rounded-lg overflow-visible shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer"
                  onClick={() => navigateToFolder(folderId)}
                >
                  {/* Three Dots Menu Button - For all folders including "All Plays" */}
                  <div className="absolute top-2 right-2 z-20" onClick={(e) => e.stopPropagation()} data-folder-card-menu>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setFolderCardMenuOpen(folderCardMenuOpen === folder.id ? null : folder.id);
                      }}
                      className="w-8 h-8 flex items-center justify-center rounded-lg bg-white hover:bg-gray-100 transition-colors shadow-sm border border-gray-200"
                      data-folder-card-menu
                    >
                      <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                      </svg>
                    </button>

                    {/* Dropdown Menu */}
                    {folderCardMenuOpen === folder.id && (
                      <div className="absolute right-0 top-10 bg-white border border-gray-200 rounded-lg shadow-xl z-30 min-w-[160px] py-1" data-folder-card-menu>
                        {isAllPlays ? (
                          // "All Plays" only has Share option
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleShareFolder('__all_plays__', 'All Plays');
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-gray-900 hover:bg-gray-50 transition-colors flex items-center gap-2"
                            data-folder-card-menu
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                            </svg>
                            Share
                          </button>
                        ) : (
                          // Regular folders have all options
                          <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditFolderName(folder.id, folder.name);
                            setFolderCardMenuOpen(null);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-gray-900 hover:bg-gray-50 transition-colors flex items-center gap-2"
                          data-folder-card-menu
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Rename
                        </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleShareFolder(folder.id, folder.name);
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-gray-900 hover:bg-gray-50 transition-colors flex items-center gap-2"
                              data-folder-card-menu
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                              </svg>
                              Share
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const folderPlays = savedPlays.filter(p => p.folderId === folder.id);
                            folderPlays.forEach((play, index) => {
                              setTimeout(() => {
                                downloadPlayAsJPG(play);
                              }, index * 500);
                            });
                            setFolderCardMenuOpen(null);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-gray-900 hover:bg-gray-50 transition-colors flex items-center gap-2"
                          data-folder-card-menu
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                              Download
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteFolder(folder.id);
                            setFolderCardMenuOpen(null);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                          data-folder-card-menu
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Delete Forever
                        </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Folder Icon */}
                  <div className="p-6 flex flex-col items-center justify-center min-h-[200px]">
                    <div className={`w-16 h-16 ${isAllPlays ? 'bg-gray-500' : getFolderColor(colorIndex >= 0 ? colorIndex : 0)} rounded-lg flex items-center justify-center mb-4`}>
                      <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                    </div>
                    <h3 className="text-base font-semibold text-gray-900 mb-1 text-center">{folder.name}</h3>
                    <p className="text-sm text-gray-500">{getPlayCount(folderId)} plays{!isAllPlays && `, ${getFolderCount(folderId)} folders`}</p>
                  </div>
                </div>
              )})}

              {/* Play Cards - Only show when inside a folder (not at root) */}
              {currentFolderId !== null && filteredPlays.map((play) => (
              <div
                key={play.id}
                className="relative group bg-white border border-gray-200 rounded-lg overflow-visible shadow-sm hover:shadow-lg transition-all duration-200"
              >
                {/* Three Dots Menu Button */}
                <div data-menu-container>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpenForPlay(menuOpenForPlay === play.id ? null : play.id);
                    }}
                    className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors z-10"
                  >
                    <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                    </svg>
                  </button>

                  {/* Dropdown Menu */}
                  {menuOpenForPlay === play.id && (
                    <div className="absolute top-10 right-2 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-[180px]">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          editPlay(play.id);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit Play
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadPlayAsJPG(play);
                          setMenuOpenForPlay(null);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download Play
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openAddToFolderModal(play.id);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                        </svg>
                        Add Play to Folder
                      </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                          openDeleteModal(play.id);
                    }}
                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                  >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete Play
                  </button>
                  </div>
                  )}
                </div>

                {/* Play Preview */}
                <div className="w-full bg-green-100 relative overflow-hidden" style={{ height: '300px', aspectRatio: '4/3' }}>
                  {/* Field Lines */}
                  <div className="absolute inset-0 opacity-20">
                    {/* Yard Lines */}
                    {[10, 20, 30, 40, 50, 60, 70, 80, 90].map((percent) => (
                      <div
                        key={percent}
                        className="absolute left-0 right-0 bg-white"
                        style={{ top: `${percent}%`, height: '1px' }}
                      />
                    ))}
                    {/* Sidelines */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-white"></div>
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-white"></div>
                  </div>

                  {/* Play Content */}
                  {renderPlayPreview(play)}
                </div>

                {/* Play Name */}
                <div className="p-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-gray-900 truncate flex-1">{play.name}</h3>
                    {play.playNotes && (
                      <div 
                        className="relative"
                        onMouseEnter={() => setNotesTooltipPlayId(play.id)}
                        onMouseLeave={() => setNotesTooltipPlayId(null)}
                      >
                        <button
                          onClick={() => setNotesTooltipPlayId(notesTooltipPlayId === play.id ? null : play.id)}
                          className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M3 18h18v-2H3v2zM3 13h18v-2H3v2zM3 6v2h18V6H3z" />
                          </svg>
                        </button>
                        {notesTooltipPlayId === play.id && (
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 max-w-[90vw] bg-white text-gray-900 text-xs rounded-lg p-3 shadow-xl z-[100] border border-gray-200">
                            <div className="whitespace-pre-wrap">{play.playNotes}</div>
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 -bottom-1">
                              <div className="border-4 border-transparent border-t-white"></div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {play.playbook && (
                    <p className="text-xs text-gray-500 mt-1">{play.playbook}</p>
            )}
          </div>
              </div>
              ))}
            </div>
            </>
          ) : (
            <div className="space-y-2">
              {/* New Folder Button and Subfolders Row - When inside folders */}
              {currentFolderId !== null && currentFolderId !== '__all_plays__' && (
                <div className="mb-6 flex items-center gap-4 flex-wrap">
                  {/* New Folder Button */}
                  <button
                    onClick={() => {
                      setNewFolderInput('');
                      setShowCreateFolderModal(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-all text-sm font-medium text-gray-600"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    New Folder
                  </button>
                  
                  {/* Subfolders in the same row */}
                  {foldersInCurrentFolder.map((folder, index) => {
                    const isAllPlays = 'isAllPlays' in folder && folder.isAllPlays;
                    const folderId = isAllPlays ? '__all_plays__' : folder.id;
                    const colorIndex = isAllPlays ? -1 : (index - 1);
                    return (
                      <div
                        key={folder.id}
                        className="relative group flex items-center gap-2 px-4 py-2 pr-10 bg-white border border-gray-200 rounded-lg overflow-visible shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer min-w-[180px]"
                        onClick={() => navigateToFolder(folderId)}
                      >
                        {/* Three Dots Menu Button */}
                        <div className="absolute top-1/2 right-1 -translate-y-1/2 z-20" onClick={(e) => e.stopPropagation()} data-folder-card-menu>
                          {!isAllPlays && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setFolderCardMenuOpen(folderCardMenuOpen === folder.id ? null : folder.id);
                              }}
                              className="flex items-center justify-center hover:bg-gray-100 transition-colors rounded p-1"
                              data-folder-card-menu
                            >
                              <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                              </svg>
                            </button>
                          )}

                          {/* Dropdown Menu */}
                          {folderCardMenuOpen === folder.id && (
                            <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-xl z-30 min-w-[160px] py-1" data-folder-card-menu>
                              {isAllPlays ? (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleShareFolder('__all_plays__', 'All Plays');
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm text-gray-900 hover:bg-gray-50 transition-colors flex items-center gap-2"
                                  data-folder-card-menu
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                                  </svg>
                                  Share
                                </button>
                              ) : (
                                <>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEditFolderName(folder.id, folder.name);
                                      setFolderCardMenuOpen(null);
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm text-gray-900 hover:bg-gray-50 transition-colors flex items-center gap-2"
                                    data-folder-card-menu
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                    Rename
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleShareFolder(folder.id, folder.name);
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm text-gray-900 hover:bg-gray-50 transition-colors flex items-center gap-2"
                                    data-folder-card-menu
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                                    </svg>
                                    Share
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const folderPlays = savedPlays.filter(p => p.folderId === folder.id);
                                      folderPlays.forEach((play, index) => {
                                        setTimeout(() => {
                                          downloadPlayAsJPG(play);
                                        }, index * 500);
                                      });
                                      setFolderCardMenuOpen(null);
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm text-gray-900 hover:bg-gray-50 transition-colors flex items-center gap-2"
                                    data-folder-card-menu
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                    Download
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteFolder(folder.id);
                                      setFolderCardMenuOpen(null);
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                                    data-folder-card-menu
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                    Delete Forever
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Folder Icon and Name */}
                        <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
                          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                          </svg>
                        </div>
                        <span className="text-sm font-medium text-gray-900">{folder.name}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Create New Folder - List View - Only at root level */}
              {currentFolderId === null && (
                <div
                  className="flex items-center gap-4 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-all cursor-pointer"
                  onClick={() => {
                    setNewFolderInput('');
                    setShowCreateFolderModal(true);
                  }}
                >
                  <div className="w-12 h-12 border-2 border-dashed border-gray-400 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-gray-600">New Folder</h3>
                    <p className="text-sm text-gray-400">Click to create a new folder</p>
                  </div>
                </div>
              )}

              {/* Folder List - Only show at root level or All Plays */}
              {(currentFolderId === null || currentFolderId === '__all_plays__') && foldersInCurrentFolder.map((folder) => {
                const isAllPlays = 'isAllPlays' in folder && folder.isAllPlays;
                const folderId = isAllPlays ? '__all_plays__' : folder.id;
                const colorIndex = isAllPlays ? -1 : (foldersInCurrentFolder.indexOf(folder) - 1);
                return (
                  <div
                    key={folder.id}
                    className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:shadow-sm transition-all cursor-pointer group relative"
                    onClick={() => navigateToFolder(folderId)}
                  >
                    {/* Three Dots Menu Button */}
                    <div className="absolute top-1/2 right-2 -translate-y-1/2 z-20" data-menu-container>
                      {!isAllPlays && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setFolderCardMenuOpen(folderCardMenuOpen === folder.id ? null : folder.id);
                          }}
                          className="flex items-center justify-center hover:bg-gray-100 transition-colors rounded p-1"
                        >
                          <svg className="w-6 h-6 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                          </svg>
                        </button>
                      )}

                      {/* Dropdown Menu */}
                      {folderCardMenuOpen === folder.id && (
                        <div className="absolute top-8 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-[180px]">
                          {isAllPlays ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleShareFolder('__all_plays__', 'All Plays');
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-gray-900 hover:bg-gray-50 transition-colors flex items-center gap-2"
                              data-folder-card-menu
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                              </svg>
                              Share
                            </button>
                          ) : (
                            // Regular folders have all options
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditFolderName(folder.id, folder.name);
                                  setFolderCardMenuOpen(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-gray-900 hover:bg-gray-50 transition-colors flex items-center gap-2"
                                data-folder-card-menu
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Rename
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleShareFolder(folder.id, folder.name);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-gray-900 hover:bg-gray-50 transition-colors flex items-center gap-2"
                                data-folder-card-menu
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                                </svg>
                                Share
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const folderPlays = savedPlays.filter(p => p.folderId === folder.id);
                                  folderPlays.forEach((play, index) => {
                                    setTimeout(() => {
                                      downloadPlayAsJPG(play);
                                    }, index * 500);
                                  });
                                  setFolderCardMenuOpen(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-gray-900 hover:bg-gray-50 transition-colors flex items-center gap-2"
                                data-folder-card-menu
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                Download
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteFolder(folder.id);
                                  setFolderCardMenuOpen(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                                data-folder-card-menu
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Delete Forever
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Folder Icon */}
                    <div className={`w-12 h-12 ${isAllPlays ? 'bg-gray-500' : getFolderColor(colorIndex >= 0 ? colorIndex : 0)} rounded-lg flex items-center justify-center flex-shrink-0`}>
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-gray-900 truncate">{folder.name}</h3>
                      <p className="text-sm text-gray-500">{getPlayCount(folderId)} plays{!isAllPlays && `, ${getFolderCount(folderId)} folders`}</p>
                    </div>
                  </div>
                );
              })}

              {/* Play List - Only show when inside a folder */}
              {currentFolderId !== null && filteredPlays.map((play) => (
                <div
                  key={play.id}
                  className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:shadow-sm transition-all group relative"
                >
                  {/* Three Dots Menu Button */}
                  <div className="absolute top-1/2 right-2 -translate-y-1/2 z-20" data-menu-container>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpenForPlay(menuOpenForPlay === play.id ? null : play.id);
                      }}
                      className="flex items-center justify-center hover:bg-gray-100 transition-colors rounded p-1"
                    >
                      <svg className="w-6 h-6 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                      </svg>
                    </button>

                    {/* Dropdown Menu */}
                    {menuOpenForPlay === play.id && (
                      <div className="absolute top-8 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-[180px]">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            editPlay(play.id);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Edit Play
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadPlayAsJPG(play);
                            setMenuOpenForPlay(null);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          Download Play
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openAddToFolderModal(play.id);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                          </svg>
                          Add Play to Folder
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openDeleteModal(play.id);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Delete Play
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Play Icon - Generic Y with route */}
                  <div className="w-16 h-16 bg-green-100 rounded-lg flex-shrink-0 flex items-center justify-center">
                    <svg className="w-12 h-12" viewBox="0 0 100 100" fill="none">
                      {/* Y shape route */}
                      <path
                        d="M 50 80 L 50 50 L 30 30 M 50 50 L 70 30"
                        stroke="black"
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      {/* Arrow at top of Y */}
                      <path
                        d="M 30 30 L 25 25 M 30 30 L 25 35 M 70 30 L 75 25 M 70 30 L 75 35"
                        stroke="black"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>

                  {/* Play Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-gray-900 truncate">{play.name}</h3>
                    {play.playNotes && (
                      <div className="relative inline-block mt-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setNotesTooltipPlayId(notesTooltipPlayId === play.id ? null : play.id);
                          }}
                          className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
                        >
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                          </svg>
                          Notes
                        </button>
                        {notesTooltipPlayId === play.id && (
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 max-w-[90vw] bg-white text-gray-900 text-xs rounded-lg p-3 shadow-xl z-[100] border border-gray-200">
                            <div className="whitespace-pre-wrap">{play.playNotes}</div>
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 -bottom-1">
                              <div className="border-4 border-transparent border-t-white"></div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    {play.playbook && (
                      <p className="text-sm text-gray-500 mt-1">{play.playbook}</p>
                    )}
                  </div>

                </div>
              ))}
            </div>
          )}
          
          {/* Empty State */}
          {currentFolderId !== null && currentFolderId !== '__all_plays__' && foldersInCurrentFolder.length === 0 && filteredPlays.length === 0 && (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <p className="text-lg text-gray-500 mb-2">This folder is empty</p>
                <p className="text-sm text-gray-400">
                  Create a new play or folder to get started
                </p>
              </div>
            </div>
          )}
          {/* Empty State for All Plays */}
          {currentFolderId === '__all_plays__' && filteredPlays.length === 0 && (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <p className="text-lg text-gray-500 mb-2">No plays yet</p>
                <p className="text-sm text-gray-400">
                  Create a new play to get started
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
                    
      {/* Create Folder Modal */}
      {showCreateFolderModal && (
        <div 
          className="fixed inset-0 bg-white/30 flex items-center justify-center z-50"
          onClick={() => {
            setShowCreateFolderModal(false);
            setNewFolderInput('');
          }}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full mx-4 border border-gray-100"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-2xl font-bold text-gray-900 mb-6 tracking-tight">
              Create New Folder
            </h3>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-800 mb-3">
                Folder Name
              </label>
              <input
                type="text"
                value={newFolderInput}
                onChange={(e) => setNewFolderInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newFolderInput.trim()) {
                    createNewFolder();
                  } else if (e.key === 'Escape') {
                    setShowCreateFolderModal(false);
                    setNewFolderInput('');
                  }
                }}
                placeholder="Enter folder name"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-gray-900 focus:ring-0 text-base text-gray-900 transition-colors placeholder:text-gray-500"
                autoFocus
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCreateFolderModal(false);
                  setNewFolderInput('');
                }}
                className="px-6 py-3 text-base font-medium text-gray-900 bg-white border-2 border-gray-300 rounded-lg hover:border-gray-400 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (newFolderInput.trim()) {
                    createNewFolder();
                  }
                }}
                disabled={!newFolderInput.trim()}
                className="px-6 py-3 text-base font-medium text-white bg-black rounded-lg hover:bg-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
                    
      {/* Add to Folder Modal */}
      {showAddToFolderModal && (
        <div 
          className="fixed inset-0 bg-white/30 flex items-center justify-center z-50"
          onClick={() => {
            setShowAddToFolderModal(false);
            setPlayToAddToFolder(null);
            setNewFolderName('');
          }}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full mx-4 border border-gray-100"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-2xl font-bold text-gray-900 mb-6 tracking-tight">
              Add Play to Folder
            </h3>
            
            <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
              <button
                onClick={() => {
                  if (playToAddToFolder) {
                    addPlayToFolder(playToAddToFolder, null);
                  }
                }}
                className="w-full px-4 py-2 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="text-sm font-medium text-gray-900">None (All Plays)</div>
              </button>
              
              {folders.map((folder) => (
                <button
                  key={folder.id}
                  onClick={() => {
                    if (playToAddToFolder) {
                      addPlayToFolder(playToAddToFolder, folder.id);
                    }
                  }}
                  className="w-full px-4 py-2 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                  <div className="text-sm font-medium text-gray-900">{folder.name}</div>
                </button>
              ))}
            </div>

            {/* Create New Folder */}
            <div className="border-t border-gray-200 pt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Create New Folder
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      createNewFolder();
                      if (playToAddToFolder && newFolderName.trim()) {
                        const newFolder = folders[folders.length - 1];
                        if (newFolder) {
                          addPlayToFolder(playToAddToFolder, newFolder.id);
                        }
                      }
                    }
                  }}
                  placeholder="Folder name"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 text-sm text-gray-900 placeholder:text-gray-500"
                />
                <button
                  onClick={() => {
                    createNewFolder();
                    if (playToAddToFolder && newFolderName.trim()) {
                      const newFolder = folders[folders.length - 1];
                      if (newFolder) {
                        addPlayToFolder(playToAddToFolder, newFolder.id);
                      }
                    }
                  }}
                  className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-900 transition-colors text-sm font-medium"
                >
                  Create
                </button>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => {
                  setShowAddToFolderModal(false);
                  setPlayToAddToFolder(null);
                  setNewFolderName('');
                }}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
              </div>
      )}

      {/* Rename Folder Modal */}
      {showRenameFolderModal && folderToRename && (
        <div 
          className="fixed inset-0 bg-white/30 flex items-center justify-center z-50"
          onClick={() => {
            setShowRenameFolderModal(false);
            setFolderToRename(null);
            setRenameFolderInput('');
          }}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full mx-4 border border-gray-100"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-2xl font-bold text-gray-900 mb-6 tracking-tight">
              Rename Folder
            </h3>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-800 mb-3">
                Folder Name
              </label>
              <input
                type="text"
                value={renameFolderInput}
                onChange={(e) => setRenameFolderInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && renameFolderInput.trim()) {
                    saveFolderName();
                  } else if (e.key === 'Escape') {
                    setShowRenameFolderModal(false);
                    setFolderToRename(null);
                    setRenameFolderInput('');
                  }
                }}
                placeholder="Enter folder name"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-gray-900 focus:ring-0 text-base text-gray-900 transition-colors placeholder:text-gray-500"
                autoFocus
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowRenameFolderModal(false);
                  setFolderToRename(null);
                  setRenameFolderInput('');
                }}
                className="px-6 py-3 text-base font-medium text-gray-900 bg-white border-2 border-gray-300 rounded-lg hover:border-gray-400 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveFolderName}
                disabled={!renameFolderInput.trim()}
                className="px-6 py-3 text-base font-medium text-white bg-black rounded-lg hover:bg-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Folder Modal */}
      {showDeleteFolderModal && (
        <div 
          className="fixed inset-0 bg-white/30 flex items-center justify-center z-50"
          onClick={() => {
            setShowDeleteFolderModal(false);
            setFolderToDelete(null);
          }}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full mx-4 border border-gray-100"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-2xl font-bold text-gray-900 mb-4 tracking-tight">
              Delete Folder Forever
            </h3>
            <p className="text-gray-600 mb-8 text-base">
              Are you sure you want to delete this folder forever? This action cannot be undone. All plays in this folder will be moved to &quot;All Plays&quot;.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteFolderModal(false);
                  setFolderToDelete(null);
                }}
                className="px-6 py-3 text-base font-medium text-gray-900 bg-white border-2 border-gray-300 rounded-lg hover:border-gray-400 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteFolder}
                className="px-6 py-3 text-base font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors"
              >
                Delete Forever
              </button>
            </div>
          </div>
              </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div 
          className="fixed inset-0 bg-white/30 flex items-center justify-center z-50"
          onClick={cancelDelete}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full mx-4 border border-gray-100"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-2xl font-bold text-gray-900 mb-4 tracking-tight">
              Delete Play
            </h3>
            <p className="text-gray-600 mb-8 text-base">
              Are you sure you want to delete this play? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={cancelDelete}
                className="px-6 py-3 text-base font-medium text-gray-900 bg-white border-2 border-gray-300 rounded-lg hover:border-gray-400 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-6 py-3 text-base font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <div 
          className="fixed inset-0 bg-white/30 flex items-center justify-center z-50"
          onClick={() => {
            setShowShareModal(false);
            setShareUrl('');
            setShareError(null);
          }}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full mx-4 border border-gray-100"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-2xl font-bold text-gray-900 mb-6 tracking-tight">
              {shareError ? 'Share Error' : 'Share Link Created'}
            </h3>
            
            {shareError ? (
              <div className="mb-6">
                <p className="text-gray-600 text-base whitespace-pre-wrap">{shareError}</p>
              </div>
            ) : (
              <div className="mb-6">
                <p className="text-gray-600 mb-4 text-base">
                  Share link copied to clipboard! You can share this link with others.
                </p>
                <div className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <input
                    type="text"
                    value={shareUrl}
                    readOnly
                    className="flex-1 text-sm text-gray-900 bg-transparent border-none outline-none"
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(shareUrl);
                    }}
                    className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                    title="Copy again"
                  >
                    Copy
                  </button>
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <button
                onClick={() => {
                  setShowShareModal(false);
                  setShareUrl('');
                  setShareError(null);
                }}
                className="px-6 py-3 text-base font-medium text-gray-900 bg-white border-2 border-gray-300 rounded-lg hover:border-gray-400 transition-colors"
              >
                {shareError ? 'Close' : 'Done'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
