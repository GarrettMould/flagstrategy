'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';
import { loadUserData, saveUserData, UserData, SavedPlay, createShareableLink } from '../firebase';

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

interface SavedPlay {
  id: string;
  name: string;
  playbook: string;
  folderId?: string;
  players: Player[];
  routes: Route[];
  textBoxes?: TextBox[];
  circles?: Circle[];
  footballs?: Football[];
  createdAt: string;
  playNotes?: string;
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
  const { user, loading: authLoading } = useAuth();
  const [savedPlays, setSavedPlays] = useState<SavedPlay[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null); // null = all plays, string = folder id
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
  const [showFolderView, setShowFolderView] = useState<boolean>(true);
  const [showCreateFolderModal, setShowCreateFolderModal] = useState<boolean>(false);
  const [newFolderInput, setNewFolderInput] = useState<string>('');
  const [folderCardMenuOpen, setFolderCardMenuOpen] = useState<string | null>(null);
  const [showDeleteFolderModal, setShowDeleteFolderModal] = useState<boolean>(false);
  const [folderToDelete, setFolderToDelete] = useState<string | null>(null);
  const [showRenameFolderModal, setShowRenameFolderModal] = useState<boolean>(false);
  const [folderToRename, setFolderToRename] = useState<{ id: string; name: string } | null>(null);
  const [renameFolderInput, setRenameFolderInput] = useState<string>('');

  // Load user data from Firestore when user logs in
  useEffect(() => {
    const loadData = async () => {
      if (user && !authLoading) {
        // Load from Firebase first
        try {
          const userData = await loadUserData(user.uid);
          if (userData) {
            // Update state with Firebase data
            setSavedPlays(userData.savedPlays || []);
            setFolders(userData.folders || []);
            
            // Update localStorage with cloud data (for compatibility)
            localStorage.setItem('savedPlays', JSON.stringify(userData.savedPlays || []));
            localStorage.setItem('playFolders', JSON.stringify(userData.folders || []));
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
      setSelectedFolder(folderId);
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

  const filteredPlays = selectedFolder === null
    ? savedPlays
    : savedPlays.filter(play => play.folderId === selectedFolder);

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

  // Get play count for a folder
  const getPlayCount = (folderId: string | null): number => {
    if (folderId === null) {
      return savedPlays.length;
    }
    return savedPlays.filter(play => play.folderId === folderId).length;
  };

  const createNewPlay = () => {
    // Navigate to blank canvas
    window.location.href = '/builder';
  };

  const createNewFolder = () => {
    if (!newFolderName.trim()) return;
    
    const newFolder: Folder = {
      id: Date.now().toString(),
      name: newFolderName.trim(),
      createdAt: new Date().toISOString()
    };
    
    const updatedFolders = [...folders, newFolder];
    setFolders(updatedFolders);
    localStorage.setItem('playFolders', JSON.stringify(updatedFolders));
    setNewFolderName('');
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
        console.log('Play deleted from Firebase successfully');
      } catch (error) {
        console.error('Error syncing play deletion to Firebase:', error);
        // Don't block the UI - deletion from localStorage already happened
      }
    }
    
    setShowDeleteModal(false);
    setPlayToDelete(null);
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setPlayToDelete(null);
  };

  // Share folder
  const handleShareFolder = async (folderId: string, folderName: string) => {
    try {
      const folderPlays = savedPlays.filter(play => play.folderId === folderId);
      
      if (folderPlays.length === 0) {
        alert('This folder is empty. Add some plays before sharing.');
        setFolderMenuOpen(null);
        return;
      }
      
      const shareUrl = await createShareableLink(folderId, folderName, folderPlays);
      
      // Copy to clipboard
      navigator.clipboard.writeText(shareUrl);
      alert(`Share link copied to clipboard!\n\n${shareUrl}`);
      setFolderMenuOpen(null);
    } catch (error) {
      console.error('Error creating share link:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Failed to create share link.\n\nError: ${errorMessage}\n\nCheck:\n1. Firestore security rules are set\n2. Browser console for details`);
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
    
    // If the deleted folder was selected, switch to All Plays
    if (selectedFolder === folderId) {
      setSelectedFolder(null);
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

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Navigation */}
      <div className="bg-white border-b border-gray-200 flex-shrink-0">
        <div className="px-8 py-5 flex justify-between items-center max-w-full">
          <div className="flex items-center">
            <h1 className="text-lg font-bold text-gray-900">
              Flag Football Play Builder
            </h1>
          </div>
          <div className="flex items-center space-x-8">
            <Link 
              href="/my-plays" 
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              My Plays
            </Link>
            <UserMenu />
          </div>
                    </div>
                  </div>
                  
      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4 flex-shrink-0">
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

        {/* Folders Row */}
        <div className="flex items-center gap-2 flex-1 overflow-x-auto">
          {/* Create Folder Button */}
          <button
            onClick={() => {
              setNewFolderInput('');
              setShowCreateFolderModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm text-gray-700 whitespace-nowrap"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Folder
          </button>

          {/* Back to Folders Button */}
          {!showFolderView && (
          <button
              onClick={() => setShowFolderView(true)}
              className="px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors text-gray-600 hover:bg-gray-50 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Folders
          </button>
          )}

          {/* Folder Buttons - Only show when not in folder view */}
          {!showFolderView && folders.map((folder) => (
            <div
              key={folder.id}
              className={`relative px-5 py-3 rounded-lg text-base whitespace-nowrap transition-colors flex items-center gap-3 ${
                selectedFolder === folder.id
                  ? 'bg-gray-100 text-gray-900 font-medium'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <button
                onClick={() => setSelectedFolder(folder.id)}
                className="flex items-center gap-3 flex-1"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
                {editingFolderId === folder.id ? (
                  <input
                    type="text"
                    value={editingFolderName}
                    onChange={(e) => setEditingFolderName(e.target.value)}
                    onBlur={saveFolderName}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        saveFolderName();
                      } else if (e.key === 'Escape') {
                        setEditingFolderId(null);
                        setEditingFolderName('');
                      }
                    }}
                    className="flex-1 bg-transparent border-b-2 border-blue-500 outline-none"
                    autoFocus
                  />
                ) : (
                  <span>{folder.name}</span>
                )}
            </button>
            </div>
          ))}
        </div>
                  </div>
                  
      {/* Main Content - Full Page Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {showFolderView ? (
          // Show folder cards when in folder view
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
            {/* All Plays Card */}
            <div
              onClick={() => {
                setSelectedFolder(null);
                setShowFolderView(false);
              }}
              className="relative cursor-pointer group hover:scale-105 transition-transform"
            >
              {/* Card Stack Effect */}
              <div className="relative">
                {/* Back cards for stack effect */}
                <div className="absolute top-4 left-4 w-full h-full bg-gray-300 rounded-lg opacity-60"></div>
                <div className="absolute top-2 left-2 w-full h-full bg-gray-400 rounded-lg opacity-80"></div>
                {/* Front card */}
                <div className="relative bg-gray-500 rounded-lg shadow-lg p-6 min-h-[200px] flex flex-col justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">All Plays</h3>
                  </div>
                  <div className="mt-auto pt-4 border-t border-white/30">
                    <p className="text-sm text-white/90">{getPlayCount(null)} plays</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Folder Cards */}
            {folders.map((folder, index) => (
              <div
                key={folder.id}
                className="relative group hover:scale-105 transition-transform"
              >
                {/* Three Dots Menu Button */}
                <div className="absolute top-3 right-3 z-20" onClick={(e) => e.stopPropagation()} data-folder-card-menu>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setFolderCardMenuOpen(folderCardMenuOpen === folder.id ? null : folder.id);
                    }}
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/20 hover:bg-white/30 transition-colors backdrop-blur-sm"
                    data-folder-card-menu
                  >
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                    </svg>
                  </button>

                  {/* Dropdown Menu */}
                  {folderCardMenuOpen === folder.id && (
                    <div className="absolute right-0 top-10 bg-white border border-gray-200 rounded-lg shadow-xl z-30 min-w-[160px] py-1" data-folder-card-menu>
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
                          const folderPlays = savedPlays.filter(p => p.folderId === folder.id);
                          folderPlays.forEach((play, index) => {
                            setTimeout(() => {
                              downloadPlayAsJPG(play);
                            }, index * 500); // Stagger downloads by 500ms
                          });
                          setFolderCardMenuOpen(null);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-900 hover:bg-gray-50 transition-colors flex items-center gap-2"
                        data-folder-card-menu
                      >
                        Download
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
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
                    </div>
                  )}
                </div>

                {/* Card Stack Effect */}
                <div 
                  className="relative cursor-pointer"
                  onClick={() => {
                    setSelectedFolder(folder.id);
                    setShowFolderView(false);
                  }}
                >
                  {/* Back cards for stack effect */}
                  <div className={`absolute top-4 left-4 w-full h-full ${getFolderColor(index)} rounded-lg opacity-60`}></div>
                  <div className={`absolute top-2 left-2 w-full h-full ${getFolderColor(index)} rounded-lg opacity-80`}></div>
                  {/* Front card */}
                  <div className={`relative ${getFolderColor(index)} rounded-lg shadow-lg p-6 min-h-[200px] flex flex-col justify-between`}>
                    <div>
                      <h3 className="text-xl font-bold text-white mb-2">{folder.name}</h3>
                    </div>
                    <div className="mt-auto pt-4 border-t border-white/30">
                      <p className="text-sm text-white/90">{getPlayCount(folder.id)} plays</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredPlays.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-lg text-gray-500 mb-2">No plays in this folder</p>
              <p className="text-sm text-gray-400">
                Add plays to this folder using the menu on play cards
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
            {filteredPlays.map((play) => (
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
                    className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors z-10"
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
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
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
                        Download Play
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openAddToFolderModal(play.id);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        Add Play to Folder
                      </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                          openDeleteModal(play.id);
                    }}
                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
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
        )}
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
                    const newFolder: Folder = {
                      id: Date.now().toString(),
                      name: newFolderInput.trim(),
                      createdAt: new Date().toISOString()
                    };
                    const updatedFolders = [...folders, newFolder];
                    setFolders(updatedFolders);
                    localStorage.setItem('playFolders', JSON.stringify(updatedFolders));
                    
                    // Sync to Firebase if logged in
                    if (user) {
                      const savedPlays = JSON.parse(localStorage.getItem('savedPlays') || '[]');
                      saveUserData(savedPlays, updatedFolders).catch(console.error);
                    }
                    
                    setShowCreateFolderModal(false);
                    setNewFolderInput('');
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
                    const newFolder: Folder = {
                      id: Date.now().toString(),
                      name: newFolderInput.trim(),
                      createdAt: new Date().toISOString()
                    };
                    const updatedFolders = [...folders, newFolder];
                    setFolders(updatedFolders);
                    localStorage.setItem('playFolders', JSON.stringify(updatedFolders));
                    
                    // Sync to Firebase if logged in
                    if (user) {
                      const savedPlays = JSON.parse(localStorage.getItem('savedPlays') || '[]');
                      saveUserData(savedPlays, updatedFolders).catch(console.error);
                    }
                    
                    setShowCreateFolderModal(false);
                    setNewFolderInput('');
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
    </div>
  );
}
