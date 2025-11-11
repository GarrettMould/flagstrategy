'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getSharedFolder, SharedFolder, loadUserData, saveUserData, UserData, signUp, logIn, signInWithGoogle } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';

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
  color?: string; // Optional to match Firebase SavedPlay interface
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
  playbook?: string;
  folderId?: string;
  players: Player[];
  routes: Route[];
  textBoxes?: TextBox[];
  circles?: Circle[];
  footballs?: Football[];
  createdAt?: string;
  playerRouteAssociations?: [string, string[]][];
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

interface Folder {
  id: string;
  name: string;
  createdAt: string;
  parentFolderId?: string | null;
}

export default function SharedFolderPage() {
  const params = useParams();
  const shareId = params.shareId as string;
  const router = useRouter();
  const { user } = useAuth();
  const [sharedFolder, setSharedFolder] = useState<SharedFolder | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState<boolean>(false);
  const [menuOpenForPlay, setMenuOpenForPlay] = useState<string | null>(null);
  const [showAddToFolderModal, setShowAddToFolderModal] = useState<boolean>(false);
  const [playToAddToFolder, setPlayToAddToFolder] = useState<SavedPlay | null>(null);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [newFolderName, setNewFolderName] = useState<string>('');
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [googleLoginLoading, setGoogleLoginLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(true);
  const [showTooltip, setShowTooltip] = useState<string | null>(null);

  const handleComingSoon = (feature: string) => {
    setShowTooltip(feature);
    setTimeout(() => setShowTooltip(null), 2000);
  };

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') {
      return;
    }

    async function fetchData() {
      if (!shareId) {
        setError('No share ID provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const folder = await getSharedFolder(shareId);
        
        if (folder) {
          setSharedFolder(folder);
        } else {
          setError('Shared folder not found');
        }
      } catch (err) {
        console.error('Error fetching shared folder:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch shared folder');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [shareId]);

  // Load user folders when user is logged in
  useEffect(() => {
    const loadFolders = async () => {
      if (user) {
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
      } else {
        // Not logged in - load from localStorage only
        const localFolders = JSON.parse(localStorage.getItem('playFolders') || '[]');
        setFolders(localFolders);
      }
    };

    loadFolders();
  }, [user]);

  const handleRemixPlay = (play: SavedPlay) => {
    // Store the play data in localStorage for the builder page to load
    localStorage.setItem('editingPlay', JSON.stringify(play));
    // Navigate to the builder page
    router.push('/builder');
    setMenuOpenForPlay(null);
  };

  const handleAddToFolder = (play: SavedPlay) => {
    if (!user) {
      // Show login modal instead of redirecting
      setShowLoginModal(true);
      setMenuOpenForPlay(null);
      return;
    }
    setPlayToAddToFolder(play);
    setShowAddToFolderModal(true);
    setMenuOpenForPlay(null);
  };

  const addPlayToFolder = async (play: SavedPlay, folderId: string | null) => {
    if (!user) {
      setShowLoginModal(true);
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
      setShowLoginModal(true);
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

  const importPlays = () => {
    if (!sharedFolder || !sharedFolder.plays || sharedFolder.plays.length === 0) {
      alert('No plays to import');
      return;
    }

    // Get existing plays from localStorage (same as save feature)
    const existingPlays = JSON.parse(localStorage.getItem('savedPlays') || '[]');
    
    // Generate new IDs for imported plays to avoid conflicts
    const importedPlays = sharedFolder.plays.map((play) => ({
      ...play,
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      folderId: undefined, // Remove folder association (user can add to their own folder)
      createdAt: new Date().toISOString()
    }));
    
    // Merge with existing plays
    const updatedPlays = [...existingPlays, ...importedPlays];
    
    // Save to localStorage (same as save feature)
    localStorage.setItem('savedPlays', JSON.stringify(updatedPlays));
    
    alert(`Successfully imported ${importedPlays.length} play(s) to My Plays!`);
    setShowImportModal(false);
    
    // Navigate to My Plays page
    window.location.href = '/my-plays';
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-gray-600">Loading shared folder...</p>
        </div>
      </div>
    );
  }

  if (error || !sharedFolder) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Shared Folder</h1>
          <p className="text-lg text-red-600 mb-4">{error || 'Shared folder not found'}</p>
          <Link href="/" className="text-blue-600 hover:text-blue-800 underline">
            Go to Play Builder
          </Link>
        </div>
      </div>
    );
  }

  const plays = (sharedFolder.plays || []) as SavedPlay[];

  return (
    <div className="h-screen flex flex-col bg-gray-50">
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
            className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            Play Builder
          </Link>
          <Link 
            href="/my-plays" 
            className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
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
              Login
            </Link>
          ) : (
            <>
              <button
                onClick={() => setShowImportModal(true)}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
              >
                Import to My Plays
              </button>
              <UserMenu />
            </>
          )}
        </div>
      </header>

      {/* Shared Folder Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">
              {sharedFolder.folderName}
            </h1>
            <p className="text-sm text-gray-600">
              {plays.length} {plays.length === 1 ? 'play' : 'plays'} shared with you
            </p>
          </div>
          {!user && (
            <div className="flex items-center gap-4 bg-blue-50 border border-blue-200 rounded-lg px-6 py-4">
              <div className="flex-1">
                <h3 className="text-base font-semibold text-gray-900 mb-1">Create your own plays!</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Sign up for free to build, organize, and share your own playbook.
                </p>
                <Link
                  href="/login?signup=true"
                  className="inline-block px-4 py-2 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors text-sm"
                >
                  Get Started Free
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {plays.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-lg text-gray-500 mb-2">This folder is empty</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
            {plays.map((play) => (
              <div
                key={play.id}
                className="relative group bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-lg transition-all duration-200"
              >
                {/* Play Preview */}
                <div className="w-full bg-white relative overflow-hidden" style={{ height: '300px', aspectRatio: '4/3' }}>
                  {/* Play Content */}
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
                      </div>
                    )}
                  </div>
                </div>

                {/* Play Name */}
                <div className="p-3">
                  <h3 className="text-sm font-medium text-gray-900 truncate">{play.name}</h3>
                  {play.playbook && (
                    <p className="text-xs text-gray-500 mt-1">{play.playbook}</p>
                  )}
                  {play.playNotes && (
                    <p className="text-xs text-gray-600 mt-2 whitespace-pre-wrap">{play.playNotes}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Import Confirmation Modal */}
      {showImportModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowImportModal(false)}
        >
          <div 
            className="bg-white rounded-lg p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Import Plays
            </h3>
            <p className="text-gray-600 mb-6">
              This will import {plays.length} play(s) from &quot;{sharedFolder.folderName}&quot; into your My Plays collection. You can then organize them into your own folders.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={importPlays}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
              >
                Import
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          {/* Subtle blur overlay */}
          <div 
            className="absolute inset-0 backdrop-blur-sm bg-black/20"
            onClick={() => {
              setShowLoginModal(false);
              setLoginError('');
            }}
          ></div>
          {/* Modal content */}
          <div 
            className="relative bg-white rounded-lg shadow-xl p-6 pb-8 w-full max-w-md mx-4 border border-gray-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button - X in top right, own row */}
            <div className="flex justify-end mb-4">
              <button
                onClick={() => {
                  setShowLoginModal(false);
                  setLoginError('');
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <h2 className="text-3xl font-bold mb-2 text-gray-900 text-center">
              Save Plays. Share Plays. Win Games.
            </h2>
            <p className="text-sm text-gray-600 text-center mb-6">
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
            <form className="space-y-4" onSubmit={async (e) => {
              e.preventDefault();
              setLoginError('');
              setLoginLoading(true);
              try {
                if (isSignUp) {
                  await signUp(loginEmail, loginPassword);
                } else {
                  await logIn(loginEmail, loginPassword);
                }
                setShowLoginModal(false);
                setLoginError('');
                // Wait a moment for auth context to update, then reload folders
                setTimeout(async () => {
                  const { user: updatedUser } = await import('../../contexts/AuthContext');
                  // Actually, we need to get the user from the auth context hook
                  // The useEffect for loading folders will handle this automatically
                }, 500);
              } catch (error: any) {
                if (error.code === 'auth/email-already-in-use') {
                  setLoginError('This email is already registered. Please sign in instead.');
                } else if (error.code === 'auth/weak-password') {
                  setLoginError('Password should be at least 6 characters.');
                } else if (error.code === 'auth/invalid-email') {
                  setLoginError('Invalid email address.');
                } else if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                  setLoginError('Invalid email or password.');
                } else {
                  setLoginError(error.message || 'Failed to sign in. Please try again.');
                }
              } finally {
                setLoginLoading(false);
              }
            }}>
              {loginError && (
                <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded relative text-sm" role="alert">
                  <span className="block sm:inline">{loginError}</span>
                </div>
              )}
              <div className="rounded-md shadow-sm -space-y-px">
                <div>
                  <label htmlFor="login-email" className="sr-only">
                    Email address
                  </label>
                  <input
                    id="login-email"
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
                  <label htmlFor="login-password" className="sr-only">
                    Password
                  </label>
                  <input
                    id="login-password"
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
                    <span className="px-2 bg-white text-gray-500">Or continue with</span>
                  </div>
                </div>
                
                <button
                  type="button"
                  onClick={async () => {
                    setLoginError('');
                    setGoogleLoginLoading(true);
                    try {
                      await signInWithGoogle();
                      setShowLoginModal(false);
                      // The useEffect for loading folders will automatically reload when user changes
                    } catch (error: any) {
                      if (error.code === 'auth/popup-closed-by-user') {
                        setLoginError('Sign-in popup was closed. Please try again.');
                      } else if (error.code === 'auth/popup-blocked') {
                        setLoginError('Popup was blocked. Please allow popups for this site.');
                      } else {
                        setLoginError(error.message || 'Failed to sign in with Google. Please try again.');
                      }
                    } finally {
                      setGoogleLoginLoading(false);
                    }
                  }}
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
      )}
    </div>
  );
}
