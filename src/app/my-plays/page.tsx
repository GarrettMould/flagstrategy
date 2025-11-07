'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';

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

interface SavedPlay {
  id: string;
  name: string;
  playbook: string;
  folderId?: string;
  players: Player[];
  routes: Route[];
  textBoxes?: TextBox[];
  circles?: Circle[];
  createdAt: string;
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
  const [savedPlays, setSavedPlays] = useState<SavedPlay[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null); // null = all plays, string = folder id
  const [menuOpenForPlay, setMenuOpenForPlay] = useState<string | null>(null);
  const [showAddToFolderModal, setShowAddToFolderModal] = useState<boolean>(false);
  const [playToAddToFolder, setPlayToAddToFolder] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [playToDelete, setPlayToDelete] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState<string>('');

  useEffect(() => {
    const plays = JSON.parse(localStorage.getItem('savedPlays') || '[]');
    setSavedPlays(plays);
    
    // Load folders
    const savedFolders = JSON.parse(localStorage.getItem('playFolders') || '[]');
    setFolders(savedFolders);
    
    // Check for folder query parameter
    const urlParams = new URLSearchParams(window.location.search);
    const folderId = urlParams.get('folder');
    if (folderId) {
      setSelectedFolder(folderId);
    }
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (menuOpenForPlay && !target.closest('[data-menu-container]')) {
        setMenuOpenForPlay(null);
      }
    };

    if (menuOpenForPlay) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [menuOpenForPlay]);

  const filteredPlays = selectedFolder === null
    ? savedPlays
    : savedPlays.filter(play => play.folderId === selectedFolder);

  const createNewPlay = () => {
    // Navigate to blank canvas
    window.location.href = '/';
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
    
    // Store the play data in localStorage for the main page to load
    localStorage.setItem('editingPlay', JSON.stringify(play));
    // Navigate to the main page
    window.location.href = '/';
  };

  const openAddToFolderModal = (playId: string) => {
    setPlayToAddToFolder(playId);
    setShowAddToFolderModal(true);
    setMenuOpenForPlay(null);
  };

  const addPlayToFolder = (playId: string, folderId: string | null) => {
    const updatedPlays = savedPlays.map(play => 
      play.id === playId ? { ...play, folderId: folderId || undefined } : play
    );
    setSavedPlays(updatedPlays);
    localStorage.setItem('savedPlays', JSON.stringify(updatedPlays));
    setShowAddToFolderModal(false);
    setPlayToAddToFolder(null);
  };

  const openDeleteModal = (playId: string) => {
    setPlayToDelete(playId);
    setShowDeleteModal(true);
    setMenuOpenForPlay(null);
  };

  const confirmDelete = () => {
    if (!playToDelete) return;
    
    const updatedPlays = savedPlays.filter(play => play.id !== playToDelete);
    setSavedPlays(updatedPlays);
    localStorage.setItem('savedPlays', JSON.stringify(updatedPlays));
    setShowDeleteModal(false);
    setPlayToDelete(null);
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setPlayToDelete(null);
  };

  // Unused function - keeping for potential future use
  // const deleteFolder = (folderId: string) => {
  //   // Remove folder and unassign plays from it
  //   const updatedFolders = folders.filter(f => f.id !== folderId);
  //   setFolders(updatedFolders);
  //   localStorage.setItem('playFolders', JSON.stringify(updatedFolders));
  //   
  //   // Unassign plays from deleted folder
  //   const updatedPlays = savedPlays.map(play => 
  //     play.folderId === folderId ? { ...play, folderId: undefined } : play
  //   );
  //   setSavedPlays(updatedPlays);
  //   localStorage.setItem('savedPlays', JSON.stringify(updatedPlays));
  // };

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
                        return (
                          <div
                            key={player.id}
              className={`absolute rounded-full ${colorOption?.color || 'bg-gray-500'} border-2 border-white transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center`}
                            style={{
                left: player.x * scale + offsetX,
                top: player.y * scale + offsetY,
                width: `${16 * scale}px`,
                height: `${16 * scale}px`,
                minWidth: '16px',
                minHeight: '16px',
                              zIndex: 3,
                            }}
                          >
                            {colorOption?.label && (
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
              const name = prompt('Enter folder name:');
              if (name && name.trim()) {
                const newFolder: Folder = {
                  id: Date.now().toString(),
                  name: name.trim(),
                  createdAt: new Date().toISOString()
                };
                const updatedFolders = [...folders, newFolder];
                setFolders(updatedFolders);
                localStorage.setItem('playFolders', JSON.stringify(updatedFolders));
              }
            }}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm text-gray-700 whitespace-nowrap"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Folder
          </button>

          {/* All Plays Option */}
          <button
            onClick={() => setSelectedFolder(null)}
            className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${
              selectedFolder === null
                ? 'bg-gray-100 text-gray-900 font-medium'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            All Plays
          </button>

          {/* Folder Buttons */}
          {folders.map((folder) => (
            <button
              key={folder.id}
              onClick={() => setSelectedFolder(folder.id)}
              className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors flex items-center gap-2 ${
                selectedFolder === folder.id
                  ? 'bg-gray-100 text-gray-900 font-medium'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              {folder.name}
            </button>
          ))}
        </div>
                  </div>
                  
      {/* Main Content - Full Page Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {filteredPlays.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-lg text-gray-500 mb-2">
                {selectedFolder === null ? 'No plays saved yet' : 'No plays in this folder'}
              </p>
              <p className="text-sm text-gray-400">
                {selectedFolder === null 
                  ? 'Create some plays in the Play Builder!'
                  : 'Add plays to this folder using the menu on play cards'}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
            {filteredPlays.map((play) => (
              <div
                key={play.id}
                className="relative group bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-lg transition-all duration-200"
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
                <div className="w-full bg-green-100 relative" style={{ height: '300px', aspectRatio: '4/3' }}>
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
                  <h3 className="text-sm font-medium text-gray-900 truncate">{play.name}</h3>
                  {play.playbook && (
                    <p className="text-xs text-gray-500 mt-1">{play.playbook}</p>
            )}
          </div>
              </div>
            ))}
                      </div>
        )}
                    </div>
                    
      {/* Add to Folder Modal */}
      {showAddToFolderModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => {
            setShowAddToFolderModal(false);
            setPlayToAddToFolder(null);
            setNewFolderName('');
          }}
        >
          <div 
            className="bg-white rounded-lg p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
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
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 text-sm"
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
                  className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
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

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={cancelDelete}
        >
          <div 
            className="bg-white rounded-lg p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Confirm Deletion
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this play? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={cancelDelete}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
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
