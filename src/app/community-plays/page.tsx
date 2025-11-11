'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import { loadCommunityPlays, SavedPlay, loadUserData, saveUserData, UserData, createShareableLink } from '../firebase';

interface Folder {
  id: string;
  name: string;
  createdAt: string;
  parentFolderId?: string | null;
}

export default function CommunityPlays() {
  const { user, loading: authLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [communityPlays, setCommunityPlays] = useState<SavedPlay[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [menuOpenForPlay, setMenuOpenForPlay] = useState<string | null>(null);
  const [showAddToFolderModal, setShowAddToFolderModal] = useState<boolean>(false);
  const [playToAddToFolder, setPlayToAddToFolder] = useState<SavedPlay | null>(null);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [newFolderName, setNewFolderName] = useState<string>('');
  const [shareUrl, setShareUrl] = useState<string>('');
  const [showShareModal, setShowShareModal] = useState<boolean>(false);
  const [showTooltip, setShowTooltip] = useState<string | null>(null);

  const handleComingSoon = (feature: string) => {
    setShowTooltip(feature);
    setTimeout(() => setShowTooltip(null), 2000);
  };

  useEffect(() => {
    const loadPlays = async () => {
      try {
        setLoading(true);
        setError('');
        const plays = await loadCommunityPlays();
        setCommunityPlays(plays);
      } catch (err) {
        console.error('Error loading community plays:', err);
        setError('Failed to load community plays. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadPlays();
  }, []);

  // Load user folders when user is logged in
  useEffect(() => {
    const loadFolders = async () => {
      if (user && !authLoading) {
        try {
          const userData = await loadUserData(user.uid);
          if (userData && userData.folders) {
            setFolders(userData.folders);
          } else {
            // Fall back to localStorage
            const localFolders = JSON.parse(localStorage.getItem('playFolders') || '[]');
            setFolders(localFolders);
          }
        } catch (error) {
          console.error('Error loading user folders:', error);
          // Fall back to localStorage
          const localFolders = JSON.parse(localStorage.getItem('playFolders') || '[]');
          setFolders(localFolders);
        }
      } else if (!user && !authLoading) {
        // Not logged in - load from localStorage only
        const localFolders = JSON.parse(localStorage.getItem('playFolders') || '[]');
        setFolders(localFolders);
      }
    };

    loadFolders();
  }, [user, authLoading]);

  const colors = [
    { name: 'blue', color: 'bg-blue-500', label: 'X' },
    { name: 'red', color: 'bg-red-500', label: 'Z' },
    { name: 'green', color: 'bg-green-500', label: 'Y' },
    { name: 'yellow', color: 'bg-yellow-500', label: 'C' },
    { name: 'qb', color: 'bg-black', label: 'QB' },
  ];

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

  const handleRemixPlay = (play: SavedPlay) => {
    // Store the play data in localStorage for the builder page to load
    localStorage.setItem('editingPlay', JSON.stringify(play));
    // Navigate to the builder page
    router.push('/builder');
    setMenuOpenForPlay(null);
  };

  const handleAddToFolder = (play: SavedPlay) => {
    setPlayToAddToFolder(play);
    setShowAddToFolderModal(true);
    setMenuOpenForPlay(null);
  };

  const addPlayToFolder = async (play: SavedPlay, folderId: string | null) => {
    if (!user) {
      // If not logged in, redirect to login
      router.push('/login');
      return;
    }

    // Create a copy of the play with a new ID
    const newPlay: SavedPlay = {
      ...play,
      id: Date.now().toString(),
      folderId: folderId || undefined,
      createdAt: new Date().toISOString(),
      sharedToCommunity: false // This is now the user's copy
    };

    try {
      // Load existing user data
      const existingData = await loadUserData(user.uid);
      const existingPlays = existingData?.savedPlays || [];
      
      // Add the new play
      const updatedPlays = [...existingPlays, newPlay];
      
      // Update localStorage
      localStorage.setItem('savedPlays', JSON.stringify(updatedPlays));
      
      // Save to Firebase
      const userData: UserData = {
        savedPlays: updatedPlays,
        folders: folders,
        updatedAt: new Date().toISOString()
      };
      
      await saveUserData(user.uid, userData);
      
      setShowAddToFolderModal(false);
      setPlayToAddToFolder(null);
    } catch (error) {
      console.error('Error adding play to folder:', error);
      setError('Failed to add play to folder. Please try again.');
    }
  };

  const createNewFolder = async () => {
    if (!newFolderName.trim()) return;
    if (!user) {
      router.push('/login');
      return;
    }
    
    const newFolder: Folder = {
      id: Date.now().toString(),
      name: newFolderName.trim(),
      createdAt: new Date().toISOString(),
      parentFolderId: null
    };
    
    const updatedFolders = [...folders, newFolder];
    setFolders(updatedFolders);
    localStorage.setItem('playFolders', JSON.stringify(updatedFolders));
    setNewFolderName('');
    
    // Sync to Firebase
    try {
      const existingData = await loadUserData(user.uid);
      const userData: UserData = {
        savedPlays: existingData?.savedPlays || [],
        folders: updatedFolders,
        updatedAt: new Date().toISOString()
      };
      await saveUserData(user.uid, userData);
    } catch (error) {
      console.error('Error syncing folder creation to Firebase:', error);
    }
  };

  const handleSharePlay = async (play: SavedPlay) => {
    if (!user) {
      router.push('/login');
      return;
    }

    try {
      // Create a shareable link for this individual play
      // For now, we'll create a temporary folder with just this play
      const tempFolderId = `temp_${Date.now()}`;
      const playCopy = { ...play, id: play.id, folderId: tempFolderId };
      
      // Create shareable link (this function already returns the full URL with correct domain)
      const shareUrl = await createShareableLink(tempFolderId, play.name, [playCopy]);
      
      setShareUrl(shareUrl);
      setShowShareModal(true);
      setMenuOpenForPlay(null);
      
      // Copy to clipboard automatically
      navigator.clipboard.writeText(shareUrl);
    } catch (error) {
      console.error('Error sharing play:', error);
      setError('Failed to create share link. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <header className="flex items-center justify-between px-8 py-6 bg-white border-b border-gray-200 flex-shrink-0">
        {/* Site Title */}
        <div className="flex items-center">
          <Link href="/" className="flex flex-col hover:opacity-80 transition-opacity">
            <span className="text-gray-900 font-extrabold text-2xl tracking-tight">Flag Plays</span>
            <span className="text-gray-500 text-xs font-normal">by Flag Dojo</span>
          </Link>
        </div>

        {/* Navigation Links and Login/Logout */}
        <div className="flex items-center gap-6 ml-auto">
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
          <div className="relative">
            <button
              onClick={() => handleComingSoon('playbooks')}
              className="text-sm font-medium text-gray-400 cursor-not-allowed transition-colors"
            >
              Playbooks
            </button>
            {showTooltip === 'playbooks' && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap z-50">
                Coming Soon!
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
              </div>
            )}
          </div>
          <div className="relative">
            <button
              onClick={() => handleComingSoon('community-plays')}
              className="text-sm font-medium text-gray-400 cursor-not-allowed transition-colors"
            >
              Community Plays
            </button>
            {showTooltip === 'community-plays' && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap z-50">
                Coming Soon!
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
              </div>
            )}
          </div>
          <div className="relative">
            <button
              onClick={() => handleComingSoon('coaching-resources')}
              className="text-sm font-medium text-gray-400 cursor-not-allowed transition-colors"
            >
              Coaching Resources
            </button>
            {showTooltip === 'coaching-resources' && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap z-50">
                Coming Soon!
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
              </div>
            )}
          </div>
          {!user ? (
            <Link
              href="/login"
              className="px-4 py-2 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors text-sm"
            >
              Log In
            </Link>
          ) : (
            <Link
              href="/my-plays"
              className="px-4 py-2 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors text-sm"
            >
              My Plays
            </Link>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-8 py-8 flex gap-8">
        {/* Left Content - Plays Grid */}
        <div className="flex-1">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Community Plays</h1>
            <p className="text-gray-600">
              Browse plays shared by the community. These plays are publicly available for everyone to view and use.
            </p>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-600">Loading community plays...</div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {!loading && !error && communityPlays.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-600 text-lg">No community plays yet.</p>
              <p className="text-gray-500 mt-2">Be the first to share a play with the community!</p>
            </div>
          )}

          {!loading && !error && communityPlays.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {communityPlays.map((play) => (
                <div
                  key={play.id}
                  className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden relative group"
                >
                  <div className="h-48 bg-gray-100 flex items-center justify-center relative">
                    {renderPlayPreview(play)}
                    {/* Three-dot menu button */}
                    <div className="absolute top-2 right-2 z-10">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setMenuOpenForPlay(menuOpenForPlay === play.id ? null : play.id);
                        }}
                        className="p-1.5 bg-white rounded-full shadow-md hover:bg-gray-50 transition-colors"
                      >
                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                        </svg>
                      </button>
                      {/* Menu dropdown */}
                      {menuOpenForPlay === play.id && (
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleRemixPlay(play);
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Remix Play
                          </button>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleAddToFolder(play);
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                            </svg>
                            Add to Folder
                          </button>
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleSharePlay(play);
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                            </svg>
                            Share Play
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 mb-1 truncate">{play.name}</h3>
                    {play.playNotes && (
                      <p className="text-sm text-gray-600 line-clamp-2 mb-2">{play.playNotes}</p>
                    )}
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{play.players.length} players</span>
                      <span>{play.routes.length} routes</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Sidebar - Filters */}
        <div className="w-64 flex-shrink-0">
          <div className="bg-white rounded-lg shadow-md p-6 sticky top-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Filters</h2>
            <div className="space-y-2">
              <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                Spread Formation
              </button>
              <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                Bunch Formation
              </button>
              <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                Run Play
              </button>
              <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                Pass Play
              </button>
              <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                Double QB
              </button>
              <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                Short Pass
              </button>
              <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                Long Pass
              </button>
              <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                Trick Play
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Add to Folder Modal */}
      {showAddToFolderModal && playToAddToFolder && (
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
                  addPlayToFolder(playToAddToFolder, null);
                }}
                className="w-full px-4 py-2 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="text-sm font-medium text-gray-900">None (All Plays)</div>
              </button>
              
              {folders.map((folder) => (
                <button
                  key={folder.id}
                  onClick={() => {
                    addPlayToFolder(playToAddToFolder, folder.id);
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
                      if (newFolderName.trim()) {
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
                    if (newFolderName.trim()) {
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
          }}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full mx-4 border border-gray-100"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-2xl font-bold text-gray-900 mb-4 tracking-tight">
              Share Play
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Share link copied to clipboard! You can share this link with others.
            </p>
            <div className="mb-4">
              <input
                type="text"
                value={shareUrl}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm text-gray-900"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
            </div>
            <button
              onClick={() => {
                setShowShareModal(false);
                setShareUrl('');
              }}
              className="w-full px-4 py-2 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

