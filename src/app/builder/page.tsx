'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import { saveUserData, loadUserData, UserData, SavedPlay, signUp, logIn, signInWithGoogle } from '../firebase';

interface Player {
  id: string;
  x: number;
  y: number;
  color: string;
  type: 'offense' | 'defense';
  assignedTo?: string; // For defensive players - which offensive player they're covering
}

interface Route {
  id: string;
  points: { x: number; y: number }[];
  style: 'solid' | 'dashed';
  lineBreakType: 'rigid' | 'smooth' | 'none' | 'smooth-none';
  color: string;
  showArrow?: boolean; // Whether to show the arrow (can be toggled)
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

interface Folder {
  id: string;
  name: string;
  createdAt: string;
  parentFolderId?: string | null; // For nested folders
}

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

export default function Home() {
  const { user, loading: authLoading, logout } = useAuth();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [selectedColor, setSelectedColor] = useState<string>('blue');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isLoadingUserData, setIsLoadingUserData] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [mode, setMode] = useState<'add' | 'select' | 'route' | 'erase'>('add');
  const [draggedPlayer, setDraggedPlayer] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [showSaveDialog, setShowSaveDialog] = useState<boolean>(false);
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [googleLoginLoading, setGoogleLoginLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(true);
  const [playName, setPlayName] = useState<string>('');
  const [playNotes, setPlayNotes] = useState<string>('');
  const [selectedFolder, setSelectedFolder] = useState<string>('');
  const [folders, setFolders] = useState<Folder[]>([]);
  const [newFolderName, setNewFolderName] = useState<string>('');
  const [showCreateFolderInput, setShowCreateFolderInput] = useState<boolean>(false);
  const [editingPlayId, setEditingPlayId] = useState<string | null>(null);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [selectedRouteStyle, setSelectedRouteStyle] = useState<'solid' | 'dashed' | null>(null);
  const [selectedLineBreakType, setSelectedLineBreakType] = useState<'rigid' | 'smooth' | 'none' | 'smooth-none' | null>(null);
  const [currentRoute, setCurrentRoute] = useState<{ x: number; y: number }[]>([]);
  const [isDrawingRoute, setIsDrawingRoute] = useState<boolean>(false);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [animationProgress, setAnimationProgress] = useState<number>(0);
  const [animationStartTime, setAnimationStartTime] = useState<number>(0);
  const [animationSpeed] = useState<number>(150); // pixels per second
  const [showAlert, setShowAlert] = useState<boolean>(false);
  const [alertMessage, setAlertMessage] = useState<string>('');
  const [showSaveNotification, setShowSaveNotification] = useState<boolean>(false);
  const [lastMouseMoveTime, setLastMouseMoveTime] = useState<number>(0);
  const [pauseThreshold] = useState<number>(500); // milliseconds to detect pause
  const [draggedElement, setDraggedElement] = useState<{ type: 'player' | 'route' | 'textbox' | 'circle' | 'football', id: string } | null>(null);
  const [playerRouteAssociations, setPlayerRouteAssociations] = useState<Map<string, string[]>>(new Map());
  const [defensiveFormation, setDefensiveFormation] = useState<'zone' | null>(null);
  const [defensivePlayers, setDefensivePlayers] = useState<Player[]>([]);
  
  // Coverage pattern interface
  interface CoveragePattern {
    id: string;
    name: string;
    description: string;
    // Positions are relative to field (0-1 for x and y, where 0,0 is top-left)
    // Each position corresponds to a defensive player index
    positions: Array<{ x: number; y: number }>;
  }
  
  // Default coverage patterns
  const defaultCoverages: CoveragePattern[] = [
    {
      id: 'cover-2',
      name: 'Cover 2',
      description: 'Two deep safeties, three underneath',
      positions: [
        { x: 0.2, y: 0.15 },  // Left deep safety
        { x: 0.8, y: 0.15 },  // Right deep safety
        { x: 0.3, y: 0.35 },  // Left underneath
        { x: 0.5, y: 0.35 },  // Middle underneath
        { x: 0.7, y: 0.35 }   // Right underneath
      ]
    },
    {
      id: 'cover-3',
      name: 'Cover 3',
      description: 'Three deep zones, two underneath',
      positions: [
        { x: 0.2, y: 0.15 },  // Left deep
        { x: 0.5, y: 0.15 },  // Middle deep
        { x: 0.8, y: 0.15 },  // Right deep
        { x: 0.35, y: 0.35 }, // Left underneath
        { x: 0.65, y: 0.35 }  // Right underneath
      ]
    },
    {
      id: 'man-coverage',
      name: 'Man Coverage',
      description: 'Man-to-man, follow nearest receiver',
      positions: [] // Empty means use default behavior (follow nearest)
    },
    {
      id: 'cover-4',
      name: 'Cover 4',
      description: 'Four deep zones, one underneath',
      positions: [
        { x: 0.2, y: 0.15 },  // Left deep
        { x: 0.4, y: 0.15 },  // Left-middle deep
        { x: 0.6, y: 0.15 },  // Right-middle deep
        { x: 0.8, y: 0.15 },  // Right deep
        { x: 0.5, y: 0.4 }    // Middle underneath
      ]
    }
  ];
  
  const [selectedCoverage, setSelectedCoverage] = useState<CoveragePattern | null>(null);
  const [originalPlayerPosition, setOriginalPlayerPosition] = useState<{ x: number; y: number } | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);
  const [originalPlayerRoutePositions, setOriginalPlayerRoutePositions] = useState<Map<string, { x: number; y: number }[]>>(new Map());
  const [lastPoint, setLastPoint] = useState<{ x: number; y: number } | null>(null);
  const [textBoxes, setTextBoxes] = useState<TextBox[]>([]);
  const [draggedTextBox, setDraggedTextBox] = useState<string | null>(null);
  const [editingTextBox, setEditingTextBox] = useState<string | null>(null);
  const [circles, setCircles] = useState<Circle[]>([]);
  const [draggedCircle, setDraggedCircle] = useState<string | null>(null);
  const [footballs, setFootballs] = useState<Football[]>([]);
  const [draggedFootball, setDraggedFootball] = useState<string | null>(null);
  const [showColorPicker, setShowColorPicker] = useState<boolean>(false);
  const [selectedPlayerForColor, setSelectedPlayerForColor] = useState<string | null>(null);
  const [colorPickerPosition, setColorPickerPosition] = useState<{ x: number; y: number } | null>(null);
  const [hasDragged, setHasDragged] = useState<boolean>(false);
  const [history, setHistory] = useState<{ players: Player[], routes: Route[], textBoxes: TextBox[], circles: Circle[], footballs: Football[], playerRouteAssociations: Map<string, string[]> }[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  // Store custom routes with their associated player color
  const [customQuickAddRoutes, setCustomQuickAddRoutes] = useState<(Route & { playerColor?: string } | null)[]>(Array(8).fill(null)); // 8 slots (4 standard + 4 custom)
  const [selectionBox, setSelectionBox] = useState<{ startX: number; startY: number; endX: number; endY: number } | null>(null);
  const [isSelecting, setIsSelecting] = useState<boolean>(false);
  const [selectedItems, setSelectedItems] = useState<{
    players: string[];
    routes: string[];
    textBoxes: string[];
    circles: string[];
    footballs: string[];
  }>({ players: [], routes: [], textBoxes: [], circles: [], footballs: [] });
  const [showDownloadDropdown, setShowDownloadDropdown] = useState<boolean>(false);
  const [openFolderMenu, setOpenFolderMenu] = useState<string | null>(null);
  const [showDeleteFolderConfirm, setShowDeleteFolderConfirm] = useState<string | null>(null);
  const [showMobileMenu, setShowMobileMenu] = useState<boolean>(false);
  const saveHistoryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const historyIndexRef = useRef<number>(-1);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const touchStartTimeRef = useRef<number>(0);
  const touchStartPositionRef = useRef<{ x: number; y: number } | null>(null);
  
  // Keep ref in sync with state
  useEffect(() => {
    historyIndexRef.current = historyIndex;
  }, [historyIndex]);

  const showCustomAlert = (message: string) => {
    setAlertMessage(message);
    setShowAlert(true);
    setTimeout(() => {
      setShowAlert(false);
    }, 3000); // Auto-hide after 3 seconds
  };

  const saveToHistory = () => {
    // Clear any pending save to prevent duplicate entries when actions happen quickly
    if (saveHistoryTimeoutRef.current) {
      clearTimeout(saveHistoryTimeoutRef.current);
    }
    
    // Debounce the save to batch rapid actions (50ms delay)
    saveHistoryTimeoutRef.current = setTimeout(() => {
      // Capture current state at the time of execution
      const currentState = {
        players: [...players],
        routes: [...routes],
        textBoxes: [...textBoxes],
        circles: [...circles],
        footballs: [...footballs],
        playerRouteAssociations: new Map(playerRouteAssociations)
      };
      
      // Use functional updates with ref to get latest index
      setHistory(prevHistory => {
        const currentIndex = historyIndexRef.current;
        // Remove any history after current index
        const newHistory = prevHistory.slice(0, currentIndex + 1);
        newHistory.push(currentState);
        
        // Limit history to 50 states to prevent memory issues
        if (newHistory.length > 50) {
          newHistory.shift();
          // Update index ref but don't increment (we removed first item)
          setHistoryIndex(currentIndex);
          historyIndexRef.current = currentIndex;
        } else {
          // Increment index
          const newIndex = currentIndex + 1;
          setHistoryIndex(newIndex);
          historyIndexRef.current = newIndex;
        }
        
        return newHistory;
      });
    }, 50); // 50ms debounce to batch rapid actions
  };

  const undo = () => {
    // Flush any pending history saves first by clearing the timeout
    if (saveHistoryTimeoutRef.current) {
      clearTimeout(saveHistoryTimeoutRef.current);
      saveHistoryTimeoutRef.current = null;
    }
    
    // Perform the undo using functional update to get latest history
    setHistory(prevHistory => {
      const currentIndex = historyIndexRef.current;
      if (currentIndex > 0) {
        const newIndex = currentIndex - 1;
        const state = prevHistory[newIndex];
        if (state) {
          // Update all states
          setPlayers([...state.players]);
          setRoutes([...state.routes]);
          setTextBoxes([...state.textBoxes]);
          setCircles([...(state.circles || [])]);
          setFootballs([...(state.footballs || [])]);
          setPlayerRouteAssociations(new Map(state.playerRouteAssociations));
          setHistoryIndex(newIndex);
          historyIndexRef.current = newIndex;
        }
      }
      return prevHistory; // Return unchanged history
    });
  };

  const redo = () => {
    const currentIndex = historyIndexRef.current;
    // Read history state using functional update to get latest value
      setHistory(prevHistory => {
      if (currentIndex < prevHistory.length - 1) {
        const newIndex = currentIndex + 1;
          const state = prevHistory[newIndex];
          if (state) {
          // Update all states - React will batch these updates
            setPlayers([...state.players]);
            setRoutes([...state.routes]);
            setTextBoxes([...state.textBoxes]);
            setCircles([...(state.circles || [])]);
            setPlayerRouteAssociations(new Map(state.playerRouteAssociations));
          setHistoryIndex(newIndex);
            historyIndexRef.current = newIndex;
          }
        }
      return prevHistory; // Return unchanged history
    });
  };

  const rebuildPlayerRouteAssociations = (players: Player[], routes: Route[]) => {
    const associations = new Map<string, string[]>();
    
    // For each route, find the closest player and associate them
    routes.forEach(route => {
      if (!route || !route.points || !Array.isArray(route.points) || route.points.length === 0) return;
      const routeStart = route.points[0];
      let closestPlayer: Player | null = null;
      let closestDistance = Infinity;
      
      for (const player of players) {
        const distance = Math.sqrt(
          Math.pow(routeStart.x - player.x, 2) + Math.pow(routeStart.y - player.y, 2)
        );
        if (distance < closestDistance) {
          closestDistance = distance;
          closestPlayer = player;
        }
      }
      
      if (closestPlayer) {
        const existingRoutes = associations.get(closestPlayer.id) || [];
        associations.set(closestPlayer.id, [...existingRoutes, route.id]);
      }
    });
    
    return associations;
  };


  const createDefensivePlayers = () => {
    // Use setTimeout to ensure container has settled before getting dimensions
    setTimeout(() => {
      const fieldContainer = document.querySelector('[data-field-container]') as HTMLElement;
      if (!fieldContainer) {
        showCustomAlert('Canvas container not found.');
        return;
      }
      
      const rect = fieldContainer.getBoundingClientRect();
      const fieldWidth = rect.width;
      const fieldHeight = rect.height;
      
      // Get offensive players to position defense against
      const offensivePlayers = players.filter(p => p.type === 'offense');
      
      if (offensivePlayers.length === 0) {
        showCustomAlert('Please add offensive players before creating defense!');
        return;
      }
      
      // Ensure positions are within bounds (account for player icon size - 24px radius = 48px total)
      const padding = 24; // Half of player icon size
      const maxX = fieldWidth - padding;
      const maxY = fieldHeight - padding;
      const minX = padding;
      const minY = padding;
      
      // Zone: Defensive players spread across the field, constrained to visible area
      const zonePositions = [
        { x: Math.max(minX, Math.min(maxX, fieldWidth * 0.2)), y: Math.max(minY, Math.min(maxY, fieldHeight * 0.3)) }, // Left side
        { x: Math.max(minX, Math.min(maxX, fieldWidth * 0.4)), y: Math.max(minY, Math.min(maxY, fieldHeight * 0.2)) }, // Left middle
        { x: Math.max(minX, Math.min(maxX, fieldWidth * 0.6)), y: Math.max(minY, Math.min(maxY, fieldHeight * 0.2)) }, // Right middle
        { x: Math.max(minX, Math.min(maxX, fieldWidth * 0.8)), y: Math.max(minY, Math.min(maxY, fieldHeight * 0.3)) }, // Right side
        { x: Math.max(minX, Math.min(maxX, fieldWidth * 0.5)), y: Math.max(minY, Math.min(maxY, fieldHeight * 0.4)) }  // Deep middle
      ];
      
      const newDefensivePlayers: Player[] = [];
      zonePositions.forEach((pos, index) => {
        const defensivePlayer: Player = {
          id: `defense-${Date.now()}-${index}`,
          x: pos.x,
          y: pos.y,
          color: 'grey',
          type: 'defense'
        };
        newDefensivePlayers.push(defensivePlayer);
      });
      
      setDefensivePlayers(newDefensivePlayers);
    }, 0);
  };

  const addFivePurpleDefensivePlayers = () => {
    // Use setTimeout to ensure container has settled before getting dimensions
    setTimeout(() => {
      const fieldContainer = document.querySelector('[data-field-container]') as HTMLElement;
      if (!fieldContainer) {
        return;
      }
      
      const rect = fieldContainer.getBoundingClientRect();
      const fieldWidth = rect.width;
      const fieldHeight = rect.height;
      
      // Ensure positions are within bounds (account for player icon size - 24px radius = 48px total)
      const padding = 24; // Half of player icon size
      const maxX = fieldWidth - padding;
      const maxY = fieldHeight - padding;
      const minX = padding;
      const minY = padding;
      
      // Position 5 purple defensive players across the field, constrained to visible area
      const positions = [
        { x: Math.max(minX, Math.min(maxX, fieldWidth * 0.2)), y: Math.max(minY, Math.min(maxY, fieldHeight * 0.3)) }, // Left side
        { x: Math.max(minX, Math.min(maxX, fieldWidth * 0.4)), y: Math.max(minY, Math.min(maxY, fieldHeight * 0.2)) }, // Left middle
        { x: Math.max(minX, Math.min(maxX, fieldWidth * 0.5)), y: Math.max(minY, Math.min(maxY, fieldHeight * 0.4)) }, // Deep middle
        { x: Math.max(minX, Math.min(maxX, fieldWidth * 0.6)), y: Math.max(minY, Math.min(maxY, fieldHeight * 0.2)) }, // Right middle
        { x: Math.max(minX, Math.min(maxX, fieldWidth * 0.8)), y: Math.max(minY, Math.min(maxY, fieldHeight * 0.3)) }  // Right side
      ];
      
      const newDefensivePlayers: Player[] = positions.map((pos, index) => ({
        id: `defense-purple-${Date.now()}-${index}`,
        x: pos.x,
        y: pos.y,
        color: 'purple',
        type: 'defense'
      }));
      
      setDefensivePlayers(prev => [...prev, ...newDefensivePlayers]);
    }, 0);
  };


  const generateSmoothPath = (points: { x: number; y: number }[]) => {
    if (points.length < 2) return '';
    if (points.length === 2) {
      return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
    }
    
    let path = `M ${points[0].x} ${points[0].y}`;
    
    // Use quadratic curves for smoother free-draw effect
    for (let i = 1; i < points.length - 1; i++) {
      const curr = points[i];
      const next = points[i + 1];
      const controlX = (curr.x + next.x) / 2;
      const controlY = (curr.y + next.y) / 2;
      
      path += ` Q ${curr.x} ${curr.y} ${controlX} ${controlY}`;
    }
    
    // Add the last point
    const lastPoint = points[points.length - 1];
    path += ` L ${lastPoint.x} ${lastPoint.y}`;
    
    return path;
  };

  const smoothPoints = (points: { x: number; y: number }[]) => {
    if (points.length < 3) return points;
    
    const smoothed = [points[0]]; // Keep first point
    
    for (let i = 1; i < points.length - 1; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const next = points[i + 1];
      
      // Average the current point with its neighbors for smoothing
      const smoothedPoint = {
        x: (prev.x + curr.x + next.x) / 3,
        y: (prev.y + curr.y + next.y) / 3
      };
      
      smoothed.push(smoothedPoint);
    }
    
    smoothed.push(points[points.length - 1]); // Keep last point
    return smoothed;
  };

  // Load play for editing on component mount
  useEffect(() => {
    const editingPlayData = localStorage.getItem('editingPlay');
    if (editingPlayData) {
      const play = JSON.parse(editingPlayData);
      const loadedPlayers = play.players || [];
      const loadedRoutes = play.routes || [];
      
      setPlayers(loadedPlayers);
      setRoutes(loadedRoutes);
      setTextBoxes(play.textBoxes || []);
      setCircles(play.circles || []);
      setFootballs(play.footballs || []);
      setPlayName(play.name);
      setPlayNotes(play.playNotes || '');
      setSelectedFolder(play.folderId || '');
      setEditingPlayId(play.id);
      setMode('select');
      
      // Rebuild player-route associations for loaded play
      let associations: Map<string, string[]>;
      if (play.playerRouteAssociations) {
        // Convert from object format (Firestore) or array format (legacy localStorage) to Map
        if (Array.isArray(play.playerRouteAssociations)) {
          // Legacy format: array of [key, value] tuples
          associations = new Map(play.playerRouteAssociations);
        } else {
          // New format: object { [playerId]: [routeIds] }
          associations = new Map(Object.entries(play.playerRouteAssociations));
        }
      } else {
        // Old format - rebuild associations based on proximity
        associations = rebuildPlayerRouteAssociations(loadedPlayers, loadedRoutes);
      }
      setPlayerRouteAssociations(associations);
      
      // Clear the editing data from localStorage
      localStorage.removeItem('editingPlay');
    }
    
    // Initialize history with empty state
    const initialState = {
      players: [],
      routes: [],
      textBoxes: [],
      circles: [],
      footballs: [],
      playerRouteAssociations: new Map()
    };
    setHistory([initialState]);
    setHistoryIndex(0);
    
    // Load folders
    const savedFolders = JSON.parse(localStorage.getItem('playFolders') || '[]');
    setFolders(savedFolders);
  }, []);

  // Close download dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // Close mobile menu if clicking outside
      if (showMobileMenu && !target.closest('header') && !target.closest('[data-mobile-menu]')) {
        setShowMobileMenu(false);
      }
      if (showDownloadDropdown && !target.closest('[data-download-dropdown]')) {
        setShowDownloadDropdown(false);
      }
      if (openFolderMenu && !target.closest('[data-folder-menu]')) {
        setOpenFolderMenu(null);
      }
    };

    if (showDownloadDropdown || openFolderMenu || showMobileMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showDownloadDropdown, openFolderMenu, showMobileMenu]);

  const colors = [
    { name: 'blue', color: 'bg-blue-500', label: 'X' },
    { name: 'red', color: 'bg-red-500', label: 'Z' },
    { name: 'green', color: 'bg-green-500', label: 'Y' },
    { name: 'yellow', color: 'bg-yellow-500', label: 'C' },
    { name: 'qb', color: 'bg-black', label: 'QB' },
  ];

  // Helper function to get coordinates from mouse or touch event
  const getEventCoordinates = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>, target: HTMLElement) => {
    if ('touches' in e && e.touches.length > 0) {
      const rect = target.getBoundingClientRect();
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    } else {
      const rect = target.getBoundingClientRect();
      return {
        x: (e as React.MouseEvent<HTMLDivElement>).clientX - rect.left,
        y: (e as React.MouseEvent<HTMLDivElement>).clientY - rect.top
      };
    }
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Deselect route if clicking on empty space
      setSelectedRoute(null);
      setDraggedElement(null);
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Handle selection box in select mode
    if (mode === 'select' && !selectedRouteStyle) {
      // Check if clicking on an item or delete button (if so, don't start selection box)
      const target = e.target as HTMLElement;
      const isClickingItem = target.closest('[data-player]') || 
                            target.closest('[data-route]') || 
                            target.closest('[data-textbox]') || 
                            target.closest('[data-circle]') ||
                            target.closest('[data-football]') ||
                            target.closest('button') || // Don't start selection if clicking a button
                            target.closest('[data-delete-button]'); // Don't start selection if clicking delete button
      
      if (!isClickingItem) {
        // Start selection box
        setIsSelecting(true);
        setSelectionBox({ startX: x, startY: y, endX: x, endY: y });
        setSelectedItems({ players: [], routes: [], textBoxes: [], circles: [], footballs: [] });
      }
      return;
    }
    
    // Only handle route drawing if route style is selected
    if (selectedRouteStyle) {
      console.log('Starting route drawing, selectedRouteStyle:', selectedRouteStyle);
      
        // Start a new route
        setCurrentRoute([{ x, y }]);
      setLastPoint({ x, y });
        setIsDrawingRoute(true);
        setLastMouseMoveTime(Date.now());
      console.log('Route started at:', x, y);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    // Handle selection box dragging
    if (isSelecting && selectionBox) {
      const coords = getEventCoordinates(e, e.currentTarget);
      setSelectionBox({ ...selectionBox, endX: coords.x, endY: coords.y });
      return;
    }
    
    // Only handle route drawing if route is being drawn
    if (selectedRouteStyle && isDrawingRoute && currentRoute.length > 0) {
      const coords = getEventCoordinates(e, e.currentTarget);
      const x = coords.x;
      const y = coords.y;
      
      setCurrentRoute(prev => {
        const newRoute = [...prev];
        
        if (selectedLineBreakType === 'smooth') {
          // Smooth drawing - add points with distance filtering
          if (newRoute.length === 1) {
            newRoute.push({ x, y });
            setLastPoint({ x, y });
          } else {
            // Only add point if moved at least 5 pixels from last point
            if (lastPoint) {
              const distance = Math.sqrt(
                Math.pow(x - lastPoint.x, 2) + Math.pow(y - lastPoint.y, 2)
              );
              
              if (distance >= 5) {
                newRoute.push({ x, y });
                setLastPoint({ x, y });
              }
            }
          }
        } else if (selectedLineBreakType === 'none') {
          // Original straight line drawing - just two points (start and end)
          if (newRoute.length === 1) {
            newRoute.push({ x, y });
          } else {
            // Update the end point
            newRoute[1] = { x, y };
          }
        } else if (selectedLineBreakType === 'smooth-none') {
          // Smooth line drawing with no arrow - allow multiple points like smooth
          // This allows curved dashed lines without arrows
          if (newRoute.length === 1) {
            newRoute.push({ x, y });
            setLastPoint({ x, y });
          } else {
            // Only add point if moved at least 5 pixels from last point
            if (lastPoint) {
              const distance = Math.sqrt(
                Math.pow(x - lastPoint.x, 2) + Math.pow(y - lastPoint.y, 2)
              );
              
              if (distance >= 5) {
                newRoute.push({ x, y });
                setLastPoint({ x, y });
              }
            }
          }
        } else {
          // Rigid drawing - use the old pause-based system
          const now = Date.now();
          const timeSinceLastMove = now - lastMouseMoveTime;
          
          if (newRoute.length === 1) {
            // Add second point if this is the first move
            newRoute.push({ x, y });
          } else if (timeSinceLastMove > pauseThreshold) {
            // Pause detected - add a pivot point and start a new segment
            newRoute.push({ x, y }); // Add the current position as a pivot point
            newRoute.push({ x, y }); // Add it again as the start of the new segment
            console.log('Pivot point added at pause');
          } else {
            // Normal movement - update the last point
        newRoute[newRoute.length - 1] = { x, y };
          }
        }
        return newRoute;
      });
      
      // Update the last mouse move time for rigid drawing
      if (selectedLineBreakType !== 'smooth' && selectedLineBreakType !== 'smooth-none') {
      setLastMouseMoveTime(Date.now());
      }
    }
  };

  // Detect items within selection box
  const detectItemsInSelectionBox = (box: { startX: number; startY: number; endX: number; endY: number }) => {
    const minX = Math.min(box.startX, box.endX);
    const maxX = Math.max(box.startX, box.endX);
    const minY = Math.min(box.startY, box.endY);
    const maxY = Math.max(box.startY, box.endY);
    
    const selectedOffensivePlayers = players.filter(player => 
      player.x >= minX && player.x <= maxX && player.y >= minY && player.y <= maxY
    ).map(p => p.id);
    
    const selectedDefensivePlayers = defensivePlayers.filter(player => 
      player.x >= minX && player.x <= maxX && player.y >= minY && player.y <= maxY
    ).map(p => p.id);
    
    const selectedPlayers = [...selectedOffensivePlayers, ...selectedDefensivePlayers];
    
    const selectedRoutes = routes.filter(route => {
      // Check if any point of the route is within the selection box
      return route.points.some(point => 
        point.x >= minX && point.x <= maxX && point.y >= minY && point.y <= maxY
      );
    }).map(r => r.id);
    
    const selectedTextBoxes = textBoxes.filter(textBox => 
      textBox.x >= minX && textBox.x <= maxX && textBox.y >= minY && textBox.y <= maxY
    ).map(tb => tb.id);
    
    const selectedCircles = circles.filter(circle => {
      // Check if circle center is within selection box, or if circle overlaps
      const circleLeft = circle.x - circle.radius;
      const circleRight = circle.x + circle.radius;
      const circleTop = circle.y - circle.radius;
      const circleBottom = circle.y + circle.radius;
      
      return !(circleRight < minX || circleLeft > maxX || circleBottom < minY || circleTop > maxY);
    }).map(c => c.id);
    
    return {
      players: selectedPlayers,
      routes: selectedRoutes,
      textBoxes: selectedTextBoxes,
      circles: selectedCircles,
      footballs: footballs.filter(f => {
        // Check if football overlaps with selection box
        const footballLeft = f.x - f.size / 2;
        const footballRight = f.x + f.size / 2;
        const footballTop = f.y - f.size / 2;
        const footballBottom = f.y + f.size / 2;
        
        return !(footballRight < minX || footballLeft > maxX || footballBottom < minY || footballTop > maxY);
      }).map(f => f.id)
    };
  };

  const handleCanvasMouseUp = () => {
    // Handle selection box completion
    if (isSelecting && selectionBox) {
      const minX = Math.min(selectionBox.startX, selectionBox.endX);
      const maxX = Math.max(selectionBox.startX, selectionBox.endX);
      const minY = Math.min(selectionBox.startY, selectionBox.endY);
      const maxY = Math.max(selectionBox.startY, selectionBox.endY);
      
      // Only select if box has meaningful size (at least 10px)
      if (Math.abs(maxX - minX) > 10 || Math.abs(maxY - minY) > 10) {
        const items = detectItemsInSelectionBox(selectionBox);
        setSelectedItems(items);
      }
      
      setIsSelecting(false);
      setSelectionBox(null);
      return;
    }
    
    // Only handle route completion if route is being drawn
    if (selectedRouteStyle && isDrawingRoute && currentRoute.length >= 2) {
      // Find the closest player (if any) to associate with this route
      const routeStart = currentRoute[0];
      let nearbyPlayer: Player | null = null;
      let closestDistance = Infinity;
      
      for (const player of players) {
        const distance = Math.sqrt(
          Math.pow(routeStart.x - player.x, 2) + Math.pow(routeStart.y - player.y, 2)
        );
        if (distance < closestDistance) {
          closestDistance = distance;
          nearbyPlayer = player;
        }
      }
      
      console.log('Finishing route with points:', currentRoute, nearbyPlayer ? `near player: ${nearbyPlayer.id}` : 'no nearby player');
        // Finish the route with smoothing applied
      // Apply smoothing to 'smooth' and 'smooth-none' types
      const smoothedPoints = (selectedLineBreakType === 'smooth' || selectedLineBreakType === 'smooth-none') ? smoothPoints(currentRoute) : currentRoute;
      const newRoute: Route = {
        id: Date.now().toString(),
          points: smoothedPoints,
        style: selectedRouteStyle,
          lineBreakType: selectedLineBreakType || 'rigid',
        color: 'black',
        showArrow: selectedLineBreakType !== 'none' && selectedLineBreakType !== 'smooth-none' // Default to showing arrow if route type supports it
      };
      setRoutes([...routes, newRoute]);
      
      // Associate this route with the nearest player (if any)
      if (nearbyPlayer) {
        setPlayerRouteAssociations(prev => {
          const newMap = new Map(prev);
          const existingRoutes = newMap.get(nearbyPlayer.id) || [];
          newMap.set(nearbyPlayer.id, [...existingRoutes, newRoute.id]);
          return newMap;
        });
      }
        
      // Save state after adding route (use setTimeout to ensure state is updated)
      setTimeout(() => saveToHistory(), 0);
        
        // Reset route drawing state and switch to select mode
      setCurrentRoute([]);
      setIsDrawingRoute(false);
        setSelectedRouteStyle(null);
        setSelectedLineBreakType(null);
        setMode('select');
        console.log('Route completed and added to routes');
    } else {
      console.log('Route not completed. selectedRouteStyle:', selectedRouteStyle, 'isDrawingRoute:', isDrawingRoute, 'currentRoute.length:', currentRoute.length);
    }
  };

  const toggleRouteArrow = (routeId: string) => {
    setRoutes(prevRoutes => prevRoutes.map(route => {
      if (route.id === routeId) {
        return { ...route, showArrow: !route.showArrow };
      }
      return route;
    }));
    setTimeout(() => saveToHistory(), 0);
  };

  const addTextBoxToCanvas = () => {
    // Calculate middle of field
    const fieldWidth = window.innerWidth * 0.75 * 0.6;
    const fieldHeight = fieldWidth / 0.92; // Height based on aspect ratio (slightly taller than wide)
    
    const newTextBox: TextBox = {
      id: Date.now().toString(),
      x: fieldWidth / 2,
      y: fieldHeight / 2,
      text: 'Click to edit',
      fontSize: 16,
      color: 'black'
    };
    
    setTextBoxes([...textBoxes, newTextBox]);
    setEditingTextBox(newTextBox.id);
    setTimeout(() => saveToHistory(), 0);
  };

  const addCircleToCanvas = () => {
    // Calculate middle of field
    const fieldWidth = window.innerWidth * 0.75 * 0.6;
    const fieldHeight = fieldWidth / 0.92; // Height based on aspect ratio (slightly taller than wide)
    
    const newCircle: Circle = {
      id: Date.now().toString(),
      x: fieldWidth / 2,
      y: fieldHeight / 2,
      radius: 8, // Small black circle
      color: 'black'
    };
    
    setCircles([...circles, newCircle]);
    setTimeout(() => saveToHistory(), 0);
  };

  const addFootballToCanvas = () => {
    // Calculate middle of field
    const fieldWidth = window.innerWidth * 0.75 * 0.6;
    const fieldHeight = fieldWidth / 0.92; // Height based on aspect ratio (slightly taller than wide)
    
    const newFootball: Football = {
      id: Date.now().toString(),
      x: fieldWidth / 2,
      y: fieldHeight / 2,
      size: 32 // Size of the football icon (slightly bigger)
    };
    
    setFootballs([...footballs, newFootball]);
    setTimeout(() => saveToHistory(), 0);
  };

  const addPlayerToCanvas = (color: string) => {
    // Deselect route drawing if active
    if (selectedRouteStyle) {
      setSelectedRouteStyle(null);
      setSelectedLineBreakType(null);
      setIsDrawingRoute(false);
      setCurrentRoute([]);
    }
    
    // Get actual canvas dimensions
    const fieldContainer = document.querySelector('[data-field-container]') as HTMLElement;
    if (!fieldContainer) {
      showCustomAlert('Canvas container not found.');
      return;
    }
    
    const fieldWidth = fieldContainer.offsetWidth;
    const fieldHeight = fieldContainer.offsetHeight;
    
    // Position players at the bottom of the field (around 80% down)
    const bottomY = fieldHeight * 0.8;
    
    // QB goes slightly behind the line (85% down)
    let playerY = bottomY;
    if (color === 'qb') {
      playerY = fieldHeight * 0.85;
    }
    
    // Position based on color - spread across the field width
    let positionX: number;
    switch (color) {
      case 'blue':
        positionX = fieldWidth * 0.15; // Left side
        break;
      case 'yellow':
        positionX = fieldWidth * 0.35; // Left middle
        break;
      case 'green':
        positionX = fieldWidth * 0.65; // Right middle
        break;
      case 'red':
        positionX = fieldWidth * 0.85; // Right side
        break;
      case 'qb':
        positionX = fieldWidth * 0.5; // Center
        break;
      default:
        // For other colors, use default spacing logic
        const existingPlayersOnSameLine = players.filter(p => 
          Math.abs(p.y - playerY) < fieldHeight * 0.05 // Within 5% of the same yard line
        );
        const spacing = 80; // 80px spacing between players
        const startX = fieldWidth / 2 - (existingPlayersOnSameLine.length * spacing) / 2;
        positionX = startX + (existingPlayersOnSameLine.length * spacing);
        break;
    }
    
    const newPlayer: Player = {
      id: Date.now().toString(),
      x: positionX,
      y: playerY,
      color,
      type: 'offense'
    };
    
    setPlayers([...players, newPlayer]);
    setMode('select'); // Switch to select mode after adding a player
    // Save state after adding player (use setTimeout to ensure state is updated)
    setTimeout(() => saveToHistory(), 0);
  };

  const addAllPlayersToCanvas = () => {
    // Deselect route drawing if active
    if (selectedRouteStyle) {
      setSelectedRouteStyle(null);
      setSelectedLineBreakType(null);
      setIsDrawingRoute(false);
      setCurrentRoute([]);
    }
    
    // Get actual canvas dimensions
    const fieldContainer = document.querySelector('[data-field-container]') as HTMLElement;
    if (!fieldContainer) {
      showCustomAlert('Canvas container not found.');
      return;
    }
    
    const fieldWidth = fieldContainer.offsetWidth;
    const fieldHeight = fieldContainer.offsetHeight;
    
    // Position players at the bottom of the field (around 80% down)
    const bottomY = fieldHeight * 0.8;
    const qbY = fieldHeight * 0.85; // QB goes slightly behind the line
    
    // Create all players at their default positions
    const newPlayers: Player[] = colors.map((colorOption, index) => {
      let positionX: number;
      let y: number;
      
      switch (colorOption.name) {
        case 'blue':
          positionX = fieldWidth * 0.15; // Left side
          y = bottomY;
          break;
        case 'yellow':
          positionX = fieldWidth * 0.35; // Left middle
          y = bottomY;
          break;
        case 'green':
          positionX = fieldWidth * 0.65; // Right middle
          y = bottomY;
          break;
        case 'red':
          positionX = fieldWidth * 0.85; // Right side
          y = bottomY;
          break;
        case 'qb':
          positionX = fieldWidth * 0.5; // Center
          y = qbY;
          break;
        default:
          positionX = fieldWidth * 0.5;
          y = bottomY;
      }
      
      return {
        id: `${Date.now()}-${index}-${Math.random().toString(36).substring(2, 9)}`,
        x: positionX,
        y: y,
        color: colorOption.name,
        type: 'offense' as const
      };
    });
    
    // Add all players at once
    setPlayers([...players, ...newPlayers]);
    setMode('select');
    // Save state after adding players
    setTimeout(() => saveToHistory(), 0);
  };

  // Get default position for a player color
  // Uses the same calculation as addAllPlayers and addPlayerToCanvas for consistency
  const getDefaultPlayerPosition = (color: string) => {
    // Use the same calculation method as addAllPlayers/addPlayerToCanvas
    const fieldWidth = window.innerWidth * 0.75 * 0.6; // 60% of the canvas area (75% of screen)
    const fieldHeight = fieldWidth / 0.92; // Height based on aspect ratio
    
    const middleY = fieldHeight / 2;
    const qbY = fieldHeight / 2 + (fieldHeight * 0.1); // QB goes one line behind
    
    switch (color) {
      case 'blue':
        return { x: fieldWidth * 0.2, y: middleY };
      case 'yellow':
        return { x: fieldWidth * 0.5, y: middleY };
      case 'green':
        return { x: fieldWidth * 0.65, y: middleY };
      case 'red':
        return { x: fieldWidth * 0.85, y: middleY };
      case 'qb':
        return { x: fieldWidth * 0.5, y: qbY };
      default:
        return { x: fieldWidth * 0.5, y: middleY };
    }
  };

  // Route button icon definitions (for bottom menu buttons)
  // These are rendered in 50x50 viewBox, so routes should be normalized/scaled appropriately
  const routeButtonIcons: Record<string, { points: { x: number; y: number }[]; style: 'solid' | 'dashed'; lineBreakType: 'rigid' | 'smooth' | 'none' | 'smooth-none'; color: string }> = {
    'solid-rigid': {
      points: [
        { x: 21.50684931506848, y: 39.99999999999997 },
        { x: 21.917808219178085, y: 21.917808219178056 },
        { x: 22.328767123287662, y: 21.917808219178056 },
        { x: 27.260273972602732, y: 30.13698630136986 },
        { x: 27.67123287671231, y: 30.13698630136986 },
        { x: 28.493150684931493, y: 10 }
      ],
      style: 'solid',
      lineBreakType: 'rigid',
      color: 'black'
    },
    'solid-smooth': {
      points: [
        { x: 10, y: 35 },
        { x: 20, y: 35 },
        { x: 25, y: 30 },
        { x: 30, y: 20 }
      ],
      style: 'solid',
      lineBreakType: 'smooth',
      color: 'black'
    },
    'dashed-rigid': {
      points: [
        { x: 10, y: 35 },
        { x: 20, y: 35 },
        { x: 20, y: 20 },
        { x: 30, y: 20 }
      ],
      style: 'dashed',
      lineBreakType: 'rigid',
      color: 'black'
    },
    'dashed-smooth': {
      points: [
        { x: 10, y: 35 },
        { x: 20, y: 35 },
        { x: 25, y: 30 },
        { x: 30, y: 20 }
      ],
      style: 'dashed',
      lineBreakType: 'smooth',
      color: 'black'
    },
    'dashed-none': {
      points: [
        { x: 10, y: 25 },
        { x: 40, y: 25 }
      ],
      style: 'dashed',
      lineBreakType: 'none',
      color: 'black'
    },
    'dashed-smooth-none': {
      points: [
        { x: 10, y: 35 },
        { x: 20, y: 35 },
        { x: 25, y: 30 },
        { x: 30, y: 20 }
      ],
      style: 'dashed',
      lineBreakType: 'smooth-none',
      color: 'black'
    }
  };

  // Helper function to render a route in a button icon (50x50 viewBox)
  const renderRouteButtonIcon = (routeData: { points: { x: number; y: number }[]; style: 'solid' | 'dashed'; lineBreakType: 'rigid' | 'smooth' | 'none' | 'smooth-none'; color: string }) => {
    const { points, style, lineBreakType, color } = routeData;
    
    if (points.length < 2) return null;
    
    // Check if we should show arrow
    const shouldShowArrow = lineBreakType !== 'none' && lineBreakType !== 'smooth-none';
    
    // Calculate path points (stop slightly before end if showing arrow)
    let pathPoints = points;
    if (shouldShowArrow && points.length >= 2) {
      const lastPoint = points[points.length - 1];
      const secondLastPoint = points[points.length - 2];
      const dx = lastPoint.x - secondLastPoint.x;
      const dy = lastPoint.y - secondLastPoint.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      const arrowGap = 3; // Smaller gap for button icons
      const stopDistance = Math.max(0, distance - arrowGap);
      const stopRatio = distance > 0 ? stopDistance / distance : 0;
      
      const arrowStopPoint = {
        x: secondLastPoint.x + dx * stopRatio,
        y: secondLastPoint.y + dy * stopRatio
      };
      
      pathPoints = points.slice(0, -1);
      pathPoints.push(arrowStopPoint);
    }
    
    // Generate path string
    let pathD = '';
    if (lineBreakType === 'smooth' || lineBreakType === 'smooth-none') {
      if (pathPoints.length === 2) {
        pathD = `M ${pathPoints[0].x} ${pathPoints[0].y} L ${pathPoints[1].x} ${pathPoints[1].y}`;
      } else {
        pathD = `M ${pathPoints[0].x} ${pathPoints[0].y}`;
        for (let i = 1; i < pathPoints.length; i++) {
          if (i < pathPoints.length - 1) {
            const curr = pathPoints[i];
            const next = pathPoints[i + 1];
            const controlX = (curr.x + next.x) / 2;
            const controlY = (curr.y + next.y) / 2;
            pathD += ` Q ${curr.x} ${curr.y} ${controlX} ${controlY}`;
          } else {
            pathD += ` L ${pathPoints[i].x} ${pathPoints[i].y}`;
          }
        }
      }
    } else {
      pathD = `M ${pathPoints.map(p => `${p.x},${p.y}`).join(' L ')}`;
    }
    
    // Calculate arrow if needed
    let arrowElement = null;
    if (shouldShowArrow && points.length >= 2) {
      const lastPoint = points[points.length - 1];
      const secondLastPoint = points[points.length - 2];
      const dx = lastPoint.x - secondLastPoint.x;
      const dy = lastPoint.y - secondLastPoint.y;
      const angle = Math.atan2(dy, dx);
      const arrowLength = 7; // Increased from 5 for more prominence
      const arrowWidth = 4; // Increased from 2.5 for more prominence
      const arrowX = lastPoint.x - Math.cos(angle) * arrowLength;
      const arrowY = lastPoint.y - Math.sin(angle) * arrowLength;
      
      arrowElement = (
        <polygon
          points={`${lastPoint.x},${lastPoint.y} ${arrowX - Math.cos(angle - Math.PI / 2) * arrowWidth},${arrowY - Math.sin(angle - Math.PI / 2) * arrowWidth} ${arrowX - Math.cos(angle + Math.PI / 2) * arrowWidth},${arrowY - Math.sin(angle + Math.PI / 2) * arrowWidth}`}
          fill={color}
        />
      );
    }
    
    return (
      <>
        <path
          d={pathD}
          stroke={color}
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={style === 'dashed' ? '5,5' : 'none'}
        />
        {arrowElement}
      </>
    );
  };

  // Default route definitions (normalized to start at 0,0)
  const defaultRouteData: Record<string, { points: { x: number; y: number }[]; style: 'solid' | 'dashed'; lineBreakType: 'rigid' | 'smooth' | 'none' | 'smooth-none'; color: string; playerColor: string }> = {
    slant: {
      points: [
        { x: 1, y: 214 },
        { x: 0, y: 93 },
        { x: 1, y: 92 },
        { x: 135, y: 0 }
      ],
      style: 'solid',
      lineBreakType: 'rigid',
      color: 'black',
      playerColor: 'red'
    },
    post: {
      points: [
        { x: 1, y: 56 },
        { x: 0, y: 2 },
        { x: 0, y: 1 },
        { x: 129, y: 0 }
      ],
      style: 'solid',
      lineBreakType: 'rigid',
      color: 'black',
      playerColor: 'red'
    },
    hitch: {
      points: [
        { x: 330.5, y: 332 },
        { x: 329.5, y: 256 },
        { x: 329.5, y: 256 },
        { x: 305.5, y: 285 }
      ],
      style: 'solid',
      lineBreakType: 'rigid',
      color: 'black',
      playerColor: 'yellow'
    },
    corner: {
      points: [
        { x: 427.0937255859375, y: 328.59694903829825 },
        { x: 427.0937255859375, y: 298.59694903829825 },
        { x: 427.0937255859375, y: 298.59694903829825 },
        { x: 286.0937255859375, y: 267.59694903829825 }
      ],
      style: 'solid',
      lineBreakType: 'rigid',
      color: 'black',
      playerColor: 'green'
    }
  };

  const addStandardRoute = (routeType: 'slant' | 'post' | 'hitch' | 'corner') => {
    // Get the default route data for this type
    const routeData = defaultRouteData[routeType];
    const playerColor = routeData.playerColor || 'red';
    
    // Get default position for this player color
    const defaultPosition = getDefaultPlayerPosition(playerColor);
    const startX = defaultPosition.x;
    const startY = defaultPosition.y;
    
    // Create player at default position for their color
    const newPlayer: Player = {
      id: Date.now().toString(),
      x: startX,
      y: startY,
      color: playerColor,
      type: 'offense'
    };
    
    // Scale and position the route points
    // The default routes are normalized (relative to first point), so we need to:
    // 1. Find the first point (starting position in normalized coordinates)
    // 2. Calculate relative movements from the first point
    // 3. Position them relative to the player's start position
    const firstPoint = routeData.points[0];
    const routePoints = routeData.points.map((point, index) => {
      if (index === 0) {
        // First point is at the player's position
        return { x: startX, y: startY };
      } else {
        // Calculate relative movement from first point
        const relativeX = point.x - firstPoint.x;
        const relativeY = point.y - firstPoint.y;
        return {
          x: startX + relativeX,
          y: startY + relativeY // y increases downward in canvas
        };
      }
    });
    
    // Create route
    const newRoute: Route = {
      id: Date.now().toString(),
      points: routePoints,
      style: routeData.style,
      lineBreakType: routeData.lineBreakType,
      color: routeData.color,
      showArrow: routeData.lineBreakType !== 'none' && routeData.lineBreakType !== 'smooth-none'
    };
    
    // Add player and route
    setPlayers([...players, newPlayer]);
    setRoutes([...routes, newRoute]);
    
    // Associate route with player
    const updatedAssociations = new Map(playerRouteAssociations);
    updatedAssociations.set(newPlayer.id, [newRoute.id]);
    setPlayerRouteAssociations(updatedAssociations);
    
    setTimeout(() => saveToHistory(), 0);
  };

  // Export route as JSON for making it a default route
  const exportRouteAsDefault = (playerId: string) => {
    const associatedRouteIds = playerRouteAssociations.get(playerId) || [];
    if (associatedRouteIds.length === 0) {
      alert('No route found for this player.');
      return;
    }
    
    // Get the first associated route
    const routeId = associatedRouteIds[0];
    const route = routes.find(r => r.id === routeId);
    
    if (!route) {
      alert('Route not found.');
      return;
    }
    
    // Get the player to find their color
    const player = players.find(p => p.id === playerId);
    const playerColor = player?.color || 'red';
    
    // Keep route points as absolute coordinates (matching defaultRouteData format)
    // The first point will be the starting position, and addStandardRoute will
    // replace it with the player's default position and calculate relative movements
    const routePoints = route.points.map(point => ({
      x: point.x,
      y: point.y
    }));
    
    const routeData = {
      points: routePoints,
      style: route.style,
      lineBreakType: route.lineBreakType,
      color: route.color || 'black',
      playerColor: playerColor
    };
    
    // Copy to clipboard
    const jsonString = JSON.stringify(routeData, null, 2);
    navigator.clipboard.writeText(jsonString);
    
    // Also log to console for easy access
    console.log('=== ROUTE DATA FOR DEFAULT QUICK ADD ===');
    console.log('Use this data to replace one of the default routes (slant, post, hitch, or corner)');
    console.log('Format: routeName: { ...routeData }');
    console.log(jsonString);
    console.log('=== COPY THIS DATA ===');
    
    alert(`Route data copied to clipboard!\n\nAlso check the browser console (F12) to see the formatted JSON.\n\nYou can now use this to replace a default route in the defaultRouteData object.`);
  };

  // Export route data for button icon (scaled to fit 50x50 viewBox)
  const exportRouteForButtonIcon = (playerId: string) => {
    const associatedRouteIds = playerRouteAssociations.get(playerId) || [];
    if (associatedRouteIds.length === 0) {
      alert('No route found for this player.');
      return;
    }
    
    // Get the first associated route
    const routeId = associatedRouteIds[0];
    const route = routes.find(r => r.id === routeId);
    
    if (!route) {
      alert('Route not found.');
      return;
    }
    
    // Normalize and scale route to fit 50x50 viewBox
    const allX = route.points.map(p => p.x);
    const allY = route.points.map(p => p.y);
    const minX = Math.min(...allX);
    const maxX = Math.max(...allX);
    const minY = Math.min(...allY);
    const maxY = Math.max(...allY);
    const width = maxX - minX || 1;
    const height = maxY - minY || 1;
    
    // Scale to fit in 50x50 with padding
    const padding = 10;
    const scaleX = (50 - padding * 2) / width;
    const scaleY = (50 - padding * 2) / height;
    const scale = Math.min(scaleX, scaleY);
    
    const offsetX = (50 - width * scale) / 2 - minX * scale;
    const offsetY = (50 - height * scale) / 2 - minY * scale;
    
    const scaledPoints = route.points.map(p => ({
      x: p.x * scale + offsetX,
      y: p.y * scale + offsetY
    }));
    
    const routeData = {
      points: scaledPoints,
      style: route.style,
      lineBreakType: route.lineBreakType,
      color: route.color || 'black'
    };
    
    // Determine which button this should replace
    const buttonKey = `${route.style}-${route.lineBreakType}`;
    
    // Copy to clipboard
    const jsonString = JSON.stringify(routeData, null, 2);
    navigator.clipboard.writeText(jsonString);
    
    // Also log to console for easy access
    console.log('=== ROUTE DATA FOR BUTTON ICON ===');
    console.log(`Button key: "${buttonKey}"`);
    console.log(jsonString);
    console.log('=== COPY THIS DATA ===');
    
    alert(`Route data for button icon copied to clipboard!\n\nButton key: "${buttonKey}"\n\nAlso check the browser console (F12) to see the formatted JSON.\n\nYou can now use this to replace a button icon.`);
  };

  // Copy route to quick adds section
  const copyRouteToQuickAdds = (playerId: string) => {
    const associatedRouteIds = playerRouteAssociations.get(playerId) || [];
    if (associatedRouteIds.length === 0) return;
    
    // Get the first associated route
    const routeId = associatedRouteIds[0];
    const route = routes.find(r => r.id === routeId);
    if (!route) return;
    
    // Get the player to find their color and position
    const player = players.find(p => p.id === playerId);
    if (!player) return;
    const playerColor = player.color || 'red';
    
    // Normalize the route points relative to the player's position (not the route's first point)
    // This ensures the route is positioned correctly when applied from quick adds
    const normalizedRoute: Route & { playerColor?: string } = {
      ...route,
      points: route.points.map((point) => {
        // Calculate relative position from player's center
        return {
          x: point.x - player.x,
          y: point.y - player.y
        };
      }),
      playerColor
    };
    
    // Find first empty slot (slots 4-7 are for custom routes, after the 4 standard ones)
    const emptyIndex = customQuickAddRoutes.findIndex((r, idx) => idx >= 4 && r === null);
    if (emptyIndex === -1) {
      // No empty slot, replace the last custom slot (index 7)
      const updated = [...customQuickAddRoutes];
      updated[7] = normalizedRoute;
      setCustomQuickAddRoutes(updated);
    } else {
      const updated = [...customQuickAddRoutes];
      updated[emptyIndex] = normalizedRoute;
      setCustomQuickAddRoutes(updated);
    }
    
    setShowColorPicker(false);
    setSelectedPlayerForColor(null);
  };

  // Add custom route from quick adds to canvas
  const addCustomRouteFromQuickAdds = (routeIndex: number) => {
    const customRoute = customQuickAddRoutes[routeIndex];
    if (!customRoute) return;
    
    // Get the player color (default to 'red' if not stored)
    const playerColor = customRoute.playerColor || 'red';
    
    // Get default position for this player color
    const defaultPosition = getDefaultPlayerPosition(playerColor);
    const startX = defaultPosition.x;
    const startY = defaultPosition.y;
    
    // Create player at default position for their color
    const newPlayer: Player = {
      id: Date.now().toString(),
      x: startX,
      y: startY,
      color: playerColor,
      type: 'offense'
    };
    
    // Route points are normalized relative to player's center (all points are relative to player position)
    // Position the route starting at the default position
    const routePoints = customRoute.points.map((point) => {
      // All points are relative to the player's center position
      return {
        x: startX + point.x,
        y: startY + point.y
      };
    });
    
    // Create new route with translated points
    const newRoute: Route = {
      id: Date.now().toString(),
      points: routePoints,
      style: customRoute.style,
      lineBreakType: customRoute.lineBreakType,
      color: customRoute.color || 'black'
    };
    
    // Add player and route
    setPlayers([...players, newPlayer]);
    setRoutes([...routes, newRoute]);
    
    // Associate route with player
    const updatedAssociations = new Map(playerRouteAssociations);
    updatedAssociations.set(newPlayer.id, [newRoute.id]);
    setPlayerRouteAssociations(updatedAssociations);
    
    setTimeout(() => saveToHistory(), 0);
  };

  const handleTextBoxMouseDown = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>, textBoxId: string) => {
    if (mode === 'erase') {
      e.stopPropagation();
      setTextBoxes(prev => prev.filter(tb => tb.id !== textBoxId));
      setTimeout(() => saveToHistory(), 0);
    } else {
      e.stopPropagation();
      if ('preventDefault' in e) {
        e.preventDefault();
      }
      setDraggedTextBox(textBoxId);
      setDraggedElement({ type: 'textbox', id: textBoxId });
      
      const coords = getEventCoordinates(e, e.currentTarget);
      setDragOffset({
        x: coords.x - 24,
        y: coords.y - 12
      });
    }
  };

  const handleTextBoxClick = (e: React.MouseEvent<HTMLDivElement>, textBoxId: string) => {
    e.stopPropagation();
    setEditingTextBox(textBoxId);
  };

  const handleTextBoxTextChange = (textBoxId: string, newText: string) => {
    setTextBoxes(prev => prev.map(tb => 
      tb.id === textBoxId ? { ...tb, text: newText } : tb
    ));
  };

  const changePlayerColor = (playerId: string, newColor: string) => {
    setPlayers(prev => prev.map(player => 
      player.id === playerId ? { ...player, color: newColor } : player
    ));
    setShowColorPicker(false);
    setSelectedPlayerForColor(null);
    setTimeout(() => saveToHistory(), 0);
  };

  // Delete selected items
  const deleteSelectedItems = () => {
    console.log('deleteSelectedItems called, selectedItems:', selectedItems);
    // Delete selected players and their associated routes
    const playersToDelete = selectedItems.players || [];
    const routesToDelete = new Set([
      ...(selectedItems.routes || []),
      ...Array.from(playerRouteAssociations.entries())
        .filter(([playerId]) => playersToDelete.includes(playerId))
        .flatMap(([, routeIds]) => routeIds)
    ]);
    
    // Delete offensive players
    setPlayers(prev => prev.filter(p => !playersToDelete.includes(p.id)));
    
    // Delete defensive players
    setDefensivePlayers(prev => prev.filter(p => !playersToDelete.includes(p.id)));
    
    // Delete routes
    setRoutes(prev => prev.filter(r => !routesToDelete.has(r.id)));
    
    // Delete text boxes
    setTextBoxes(prev => prev.filter(tb => !(selectedItems.textBoxes || []).includes(tb.id)));
    
    // Delete circles
    setCircles(prev => prev.filter(c => !(selectedItems.circles || []).includes(c.id)));
    setFootballs(prev => prev.filter(f => !((selectedItems.footballs || []).includes(f.id))));
    
    // Clean up player-route associations
    setPlayerRouteAssociations(prev => {
      const newMap = new Map(prev);
      playersToDelete.forEach(playerId => newMap.delete(playerId));
      return newMap;
    });
    
    // Clear selection
    setSelectedItems({ players: [], routes: [], textBoxes: [], circles: [], footballs: [] });
    
    setTimeout(() => saveToHistory(), 0);
  };

  // Delete a single item
  const deleteSingleItem = (type: 'player' | 'route' | 'textbox' | 'circle' | 'football', id: string) => {
    if (type === 'player') {
      const associatedRouteIds = playerRouteAssociations.get(id) || [];
      setPlayers(prev => prev.filter(p => p.id !== id));
      setDefensivePlayers(prev => prev.filter(p => p.id !== id));
      setRoutes(prev => prev.filter(r => !associatedRouteIds.includes(r.id)));
      setPlayerRouteAssociations(prev => {
        const newMap = new Map(prev);
        newMap.delete(id);
        return newMap;
      });
    } else if (type === 'route') {
      setRoutes(prev => prev.filter(r => r.id !== id));
    } else if (type === 'textbox') {
      setTextBoxes(prev => prev.filter(tb => tb.id !== id));
    } else if (type === 'circle') {
      setCircles(prev => prev.filter(c => c.id !== id));
    } else if (type === 'football') {
      setFootballs(prev => prev.filter(f => f.id !== id));
    }
    
    // Remove from selection
    setSelectedItems(prev => ({
      players: prev.players.filter(p => p !== id),
      routes: prev.routes.filter(r => r !== id),
      textBoxes: prev.textBoxes.filter(tb => tb !== id),
      circles: prev.circles.filter(c => c !== id),
      footballs: (prev.footballs || []).filter(f => f !== id)
    }));
    
    setTimeout(() => saveToHistory(), 0);
  };

  const deletePlayerAndRoutes = (playerId: string) => {
    // Delete the player
    setPlayers(prev => prev.filter(p => p.id !== playerId));
    
    // Delete associated routes
    const associatedRouteIds = playerRouteAssociations.get(playerId) || [];
    setRoutes(prev => prev.filter(route => !associatedRouteIds.includes(route.id)));
    
    // Clean up the association
    setPlayerRouteAssociations(prev => {
      const newMap = new Map(prev);
      newMap.delete(playerId);
      return newMap;
    });
    
    setShowColorPicker(false);
    setSelectedPlayerForColor(null);
    setTimeout(() => saveToHistory(), 0);
  };

  const handlePlayerClick = (e: React.MouseEvent<HTMLDivElement>, playerId: string) => {
    if (mode === 'erase') return; // Don't show color picker in erase mode
    
    e.stopPropagation();
    
    // Disable icon change on mobile devices
    const isMobile = window.innerWidth < 768 || 'ontouchstart' in window;
    if (isMobile) {
      return; // Don't show color picker on mobile
    }
    
    // If we just dragged, don't show color picker
    if (hasDragged) {
      setHasDragged(false);
      return;
    }
    
    const player = players.find(p => p.id === playerId) || defensivePlayers.find(p => p.id === playerId);
    if (!player) return;
    
    // Don't show color picker for defensive players
    if (player.type === 'defense') return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    setColorPickerPosition({
      x: rect.right + 10,
      y: rect.top
    });
    setSelectedPlayerForColor(playerId);
    setShowColorPicker(true);
  };

  const handleCircleMouseDown = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>, circleId: string) => {
    if (mode === 'erase') {
      e.stopPropagation();
      setCircles(prev => prev.filter(c => c.id !== circleId));
      setTimeout(() => saveToHistory(), 0);
    } else {
      e.stopPropagation();
      if ('preventDefault' in e) {
        e.preventDefault();
      }
      setDraggedCircle(circleId);
      setDraggedElement({ type: 'circle', id: circleId });
      
      const coords = getEventCoordinates(e, e.currentTarget);
      setDragOffset({
        x: coords.x - 8,
        y: coords.y - 8
      });
    }
  };

  const handleFootballMouseDown = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>, footballId: string) => {
    if (mode === 'erase') {
      e.stopPropagation();
      setFootballs(prev => prev.filter(f => f.id !== footballId));
      setTimeout(() => saveToHistory(), 0);
    } else {
      e.stopPropagation();
      if ('preventDefault' in e) {
        e.preventDefault();
      }
      setHasDragged(false); // Reset drag flag
      setDraggedFootball(footballId);
      setDraggedElement({ type: 'football', id: footballId });
      
      // Select the football when clicked (like other icons)
      if (mode === 'select') {
        setSelectedItems(prev => ({
          ...prev,
          footballs: prev.footballs.includes(footballId) 
            ? prev.footballs.filter(id => id !== footballId)
            : [...prev.footballs, footballId]
        }));
      }
      
      const coords = getEventCoordinates(e, e.currentTarget);
      const football = footballs.find(f => f.id === footballId);
      // Calculate offset from the center of the football icon
      setDragOffset({
        x: coords.x - (football?.size || 32) / 2,
        y: coords.y - (football?.size || 32) / 2
      });
    }
  };

  const handlePlayerMouseDown = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>, playerId: string) => {
    // If route drawing is active, don't handle player drag - let canvas handle it
    if (selectedRouteStyle) {
      return; // Let the canvas handle route drawing instead
    }
    
    if (mode === 'erase') {
      e.stopPropagation();
      // Check if it's a defensive player or offensive player
      const isDefensive = defensivePlayers.find(p => p.id === playerId);
      if (isDefensive) {
        // Delete defensive player
        setDefensivePlayers(prev => prev.filter(p => p.id !== playerId));
      } else {
        // Delete the offensive player and its associated routes
        setPlayers(prev => prev.filter(p => p.id !== playerId));
        
        // Delete associated routes
        const associatedRouteIds = playerRouteAssociations.get(playerId) || [];
        setRoutes(prev => prev.filter(route => !associatedRouteIds.includes(route.id)));
        
        // Clean up the association
        setPlayerRouteAssociations(prev => {
          const newMap = new Map(prev);
          newMap.delete(playerId);
          return newMap;
        });
      }
      
      // Save state after deleting player (use setTimeout to ensure state is updated)
      setTimeout(() => saveToHistory(), 0);
    } else {
      // Always allow dragging when not in erase mode
      e.stopPropagation();
      if ('preventDefault' in e) {
        e.preventDefault(); // Prevent scrolling on touch
      }
      setHasDragged(false); // Reset drag flag
      setDraggedPlayer(playerId);
      setDraggedElement({ type: 'player', id: playerId });
      
      // Store original position for route movement calculation
      // Check both players and defensivePlayers arrays
      const player = players.find(p => p.id === playerId) || defensivePlayers.find(p => p.id === playerId);
      if (player) {
        setOriginalPlayerPosition({ x: player.x, y: player.y });
        
        // Store original positions of associated routes (only for offensive players)
        const associatedRouteIds = playerRouteAssociations.get(playerId) || [];
        const routePositions = new Map<string, { x: number; y: number }[]>();
        associatedRouteIds.forEach(routeId => {
          const route = routes.find(r => r.id === routeId);
          if (route) {
            routePositions.set(routeId, [...route.points]);
          }
        });
        setOriginalPlayerRoutePositions(routePositions);
        
        // Reset lastPoint to prevent interference with route drawing
        setLastPoint(null);
      }
      
      const coords = getEventCoordinates(e, e.currentTarget);
      // Calculate offset from the center of the player icon (24px is half of 48px)
      setDragOffset({
        x: coords.x - 24,
        y: coords.y - 24
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    // Prevent default scrolling when dragging on touch devices
    if (draggedPlayer || draggedTextBox || draggedCircle || draggedFootball) {
      if ('preventDefault' in e) {
        e.preventDefault();
      }
    }
    
    if (draggedPlayer) {
      setHasDragged(true); // Mark that we're dragging
      const coords = getEventCoordinates(e, e.currentTarget);
      const x = coords.x - dragOffset.x;
      const y = coords.y - dragOffset.y;
      
      // Check if it's a defensive player or offensive player
      const isDefensive = defensivePlayers.find(p => p.id === draggedPlayer);
      if (isDefensive) {
        // Update defensive player position
        setDefensivePlayers(prevPlayers => 
          prevPlayers.map(player => 
            player.id === draggedPlayer 
              ? { ...player, x, y }
              : player
          )
        );
      } else {
        // Update offensive player position
        setPlayers(prevPlayers => 
          prevPlayers.map(player => 
            player.id === draggedPlayer 
              ? { ...player, x, y }
              : player
          )
        );
        
        // Move associated routes with the player using stored associations
        if (draggedPlayer && originalPlayerPosition) {
          const associatedRouteIds = playerRouteAssociations.get(draggedPlayer) || [];
          if (associatedRouteIds.length > 0) {
            const deltaX = x - originalPlayerPosition.x;
            const deltaY = y - originalPlayerPosition.y;
            
            setRoutes(prevRoutes => 
              prevRoutes.map(route => {
                if (associatedRouteIds.includes(route.id)) {
                  // This route belongs to this player, move it using original positions
                  const originalPoints = originalPlayerRoutePositions.get(route.id);
                  if (originalPoints) {
                    return {
                      ...route,
                      points: originalPoints.map(point => ({
                        x: point.x + deltaX,
                        y: point.y + deltaY
                      }))
                    };
                  }
                }
                return route;
              })
            );
          }
        }
      }
    } else if (draggedTextBox) {
      const coords = getEventCoordinates(e, e.currentTarget);
      const x = coords.x - dragOffset.x;
      const y = coords.y - dragOffset.y;
      
      setTextBoxes(prevTextBoxes => 
        prevTextBoxes.map(textBox => 
          textBox.id === draggedTextBox 
            ? { ...textBox, x, y }
            : textBox
        )
      );
    } else if (draggedCircle) {
      const coords = getEventCoordinates(e, e.currentTarget);
      const x = coords.x - dragOffset.x;
      const y = coords.y - dragOffset.y;
      
      setCircles(prevCircles => 
        prevCircles.map(circle => 
          circle.id === draggedCircle 
            ? { ...circle, x, y }
            : circle
        )
      );
    } else if (draggedFootball) {
      setHasDragged(true); // Mark that we're dragging
      const coords = getEventCoordinates(e, e.currentTarget);
      const x = coords.x - dragOffset.x;
      const y = coords.y - dragOffset.y;
      
      setFootballs(prevFootballs => 
        prevFootballs.map(football => 
          football.id === draggedFootball 
            ? { ...football, x, y }
            : football
        )
      );
    } else {
      // Handle route drawing mouse move only if not dragging
    handleCanvasMouseMove(e);
    }
  };

  const handleMouseUp = () => {
    // Handle selection box completion first
    if (isSelecting) {
      handleCanvasMouseUp();
      return;
    }
    
    setDraggedPlayer(null);
    setDraggedTextBox(null);
    setDraggedCircle(null);
    setDraggedFootball(null);
    setDraggedElement(null);
    setOriginalPlayerPosition(null);
    setOriginalPlayerRoutePositions(new Map());
    setSelectedRoute(null);
    
    // Save state after moving if a player, text box, circle, or football was dragged (use setTimeout to ensure state is updated)
    if (draggedPlayer || draggedTextBox || draggedCircle || draggedFootball) {
      setTimeout(() => saveToHistory(), 0);
    }
    
    // Reset hasDragged after a delay to allow click event to fire first
    if (draggedPlayer) {
      setTimeout(() => {
        setHasDragged(false);
      }, 10);
    }
    
    handleCanvasMouseUp();
  };

  const clearPlayboard = () => {
    setPlayers([]);
    setRoutes([]);
    setTextBoxes([]);
    setCircles([]);
    setFootballs([]);
    setCurrentRoute([]);
    setIsDrawingRoute(false);
    setIsAnimating(false);
    setAnimationProgress(0);
    setLastMouseMoveTime(0);
    setDraggedElement(null);
    setDraggedTextBox(null);
    setDraggedCircle(null);
    setDraggedFootball(null);
    setEditingTextBox(null);
    setPlayerRouteAssociations(new Map());
    setDefensiveFormation(null);
    setDefensivePlayers([]);
    setOriginalPlayerPosition(null);
    setOriginalPlayerRoutePositions(new Map());
    setLastPoint(null);
    setSelectedRoute(null);
    setMode('add');
    setPlayNotes('');
    
    // Reset history
    const initialState = {
      players: [],
      routes: [],
      textBoxes: [],
      circles: [],
      footballs: [],
      playerRouteAssociations: new Map()
    };
    setHistory([initialState]);
    setHistoryIndex(0);
  };

  const startAnimation = () => {
    if (routes.length === 0) {
      alert('Please draw some routes before playing the animation.');
      return;
    }
    
    setIsAnimating(true);
    setAnimationProgress(0);
    
    // Calculate distance for each route and find the longest one
    let maxDistance = 0;
    routes.forEach((route) => {
      if (!route || !route.points || !Array.isArray(route.points) || route.points.length < 2) return;
      let distance = 0;
      for (let i = 1; i < route.points.length; i++) {
        const dx = route.points[i].x - route.points[i - 1].x;
        const dy = route.points[i].y - route.points[i - 1].y;
        distance += Math.sqrt(dx * dx + dy * dy);
      }
      if (distance > maxDistance) {
        maxDistance = distance;
      }
    });
    
    // Calculate duration based on longest route (pixels per second)
    const duration = (maxDistance / animationSpeed) * 1000; // Convert to milliseconds
    
    const startTime = Date.now();
    setAnimationStartTime(startTime);
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      setAnimationProgress(progress);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
        setAnimationProgress(0);
        setAnimationStartTime(0);
      }
    };
    
    requestAnimationFrame(animate);
  };

  const stopAnimation = () => {
    setIsAnimating(false);
    setAnimationProgress(0);
    setAnimationStartTime(0);
  };


  const getAnimatedPlayerPosition = (player: Player): { x: number; y: number } => {
    if (!isAnimating) return { x: player.x, y: player.y };
    
    // Handle defensive players
    if (player.type === 'defense') {
      // If a coverage pattern is selected and has positions defined
      if (selectedCoverage && selectedCoverage.positions.length > 0) {
        // Get field dimensions from the canvas container
        const fieldContainer = document.querySelector('[data-field-container]') as HTMLElement;
        if (!fieldContainer) return { x: player.x, y: player.y };
        const rect = fieldContainer.getBoundingClientRect();
        const fieldWidth = rect.width;
        const fieldHeight = rect.height;
        
        // Find the index of this defensive player
        const playerIndex = defensivePlayers.findIndex(p => p.id === player.id);
        if (playerIndex === -1 || playerIndex >= selectedCoverage.positions.length) {
          // Fall back to man coverage if not enough positions defined
          return handleDefensiveManCoverage(player);
        }
        
        // Get target position from coverage pattern (convert from 0-1 to actual coordinates)
        const targetPos = selectedCoverage.positions[playerIndex];
        const targetX = targetPos.x * fieldWidth;
        const targetY = targetPos.y * fieldHeight;
        
        // Calculate distance from starting position to target
        const dx = targetX - player.x;
        const dy = targetY - player.y;
        const totalDistance = Math.sqrt(dx * dx + dy * dy);
        
        if (totalDistance > 0) {
          // Calculate progress based on animation time (same speed as offensive players)
          const elapsed = animationStartTime > 0 ? Date.now() - animationStartTime : 0;
          const elapsedSeconds = elapsed / 1000;
          // Use same speed as offensive players
          const currentDistance = Math.min(elapsedSeconds * animationSpeed, totalDistance);
          const progress = totalDistance > 0 ? currentDistance / totalDistance : 0;
          
          // Interpolate from starting position to target position
          return {
            x: player.x + dx * progress,
            y: player.y + dy * progress
          };
        }
        return { x: player.x, y: player.y };
      }
      
      // Default behavior: man coverage (follow nearest offensive player)
      return handleDefensiveManCoverage(player);
    }
    
    // Helper function for man coverage - calculate offensive player's current animated position
    function getOffensivePlayerAnimatedPosition(offensivePlayer: Player): { x: number; y: number } {
      const associatedRouteIds = playerRouteAssociations.get(offensivePlayer.id) || [];
      const route = routes.find(route => 
        associatedRouteIds.includes(route.id) && route.lineBreakType !== 'none' && route.lineBreakType !== 'smooth-none'
      );
      
      if (!route || !route.points || !Array.isArray(route.points) || route.points.length < 2) {
        return { x: offensivePlayer.x, y: offensivePlayer.y };
      }
      
      // Calculate total distance of the entire route
      let totalDistance = 0;
      for (let i = 1; i < route.points.length; i++) {
        const dx = route.points[i].x - route.points[i - 1].x;
        const dy = route.points[i].y - route.points[i - 1].y;
        totalDistance += Math.sqrt(dx * dx + dy * dy);
      }
      
      // Calculate current distance based on elapsed time and speed
      const elapsed = animationStartTime > 0 ? Date.now() - animationStartTime : 0;
      const elapsedSeconds = elapsed / 1000;
      const currentDistance = Math.min(elapsedSeconds * animationSpeed, totalDistance);
      
      // Find which segment we're currently in
      let accumulatedDistance = 0;
      for (let i = 1; i < route.points.length; i++) {
        const dx = route.points[i].x - route.points[i - 1].x;
        const dy = route.points[i].y - route.points[i - 1].y;
        const segmentDistance = Math.sqrt(dx * dx + dy * dy);
        
        if (currentDistance <= accumulatedDistance + segmentDistance) {
          const segmentProgress = (currentDistance - accumulatedDistance) / segmentDistance;
          const currentPoint = route.points[i - 1];
          const nextPoint = route.points[i];
          return {
            x: currentPoint.x + (nextPoint.x - currentPoint.x) * segmentProgress,
            y: currentPoint.y + (nextPoint.y - currentPoint.y) * segmentProgress
          };
        }
        accumulatedDistance += segmentDistance;
      }
      
      // Animation complete, use final position
      const finalPoint = route.points[route.points.length - 1];
      return { x: finalPoint.x, y: finalPoint.y };
    }
    
    function handleDefensiveManCoverage(player: Player): { x: number; y: number } {
      const offensivePlayers = players.filter(p => p.type === 'offense');
      let nearestPlayer: { x: number; y: number } | null = null;
      let nearestDistance = Infinity;
      
      for (const offensivePlayer of offensivePlayers) {
        const offensivePosition = getOffensivePlayerAnimatedPosition(offensivePlayer);
        const distance = Math.sqrt(
          Math.pow(offensivePosition.x - player.x, 2) + 
          Math.pow(offensivePosition.y - player.y, 2)
        );
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestPlayer = offensivePosition;
        }
      }
      
      if (nearestPlayer) {
        // Move towards nearest offensive player (but not too close)
        const dx: number = nearestPlayer.x - player.x;
        const dy: number = nearestPlayer.y - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const moveDistance = Math.min(distance * 0.1, 20); // Move 10% of distance or max 20px per frame
        
        return {
          x: player.x + (dx / distance) * moveDistance,
          y: player.y + (dy / distance) * moveDistance
        };
      }
      return { x: player.x, y: player.y };
    }
    
    // Handle offensive players
    // Find the first route associated with this player (excluding 'none' and 'smooth-none' type routes - no arrows)
    const associatedRouteIds = playerRouteAssociations.get(player.id) || [];
    const route = routes.find(route => 
      associatedRouteIds.includes(route.id) && route.lineBreakType !== 'none' && route.lineBreakType !== 'smooth-none'
    );
    
    if (!route || !route.points || !Array.isArray(route.points) || route.points.length < 2) return { x: player.x, y: player.y };
    
    // Calculate total distance of the entire route
    let totalDistance = 0;
    for (let i = 1; i < route.points.length; i++) {
      const dx = route.points[i].x - route.points[i - 1].x;
      const dy = route.points[i].y - route.points[i - 1].y;
      totalDistance += Math.sqrt(dx * dx + dy * dy);
    }
    
    // Calculate current distance based on elapsed time and speed (not progress)
    // All players move at the same speed, so shorter routes finish first
    const elapsed = animationStartTime > 0 ? Date.now() - animationStartTime : 0;
    const elapsedSeconds = elapsed / 1000;
    const currentDistance = Math.min(elapsedSeconds * animationSpeed, totalDistance);
    
    // Find which segment we're currently in
    let accumulatedDistance = 0;
    for (let i = 1; i < route.points.length; i++) {
      const dx = route.points[i].x - route.points[i - 1].x;
      const dy = route.points[i].y - route.points[i - 1].y;
      const segmentDistance = Math.sqrt(dx * dx + dy * dy);
      
      if (currentDistance <= accumulatedDistance + segmentDistance) {
        // We're in this segment
        const segmentProgress = (currentDistance - accumulatedDistance) / segmentDistance;
        const currentPoint = route.points[i - 1];
        const nextPoint = route.points[i];
    
    const x = currentPoint.x + (nextPoint.x - currentPoint.x) * segmentProgress;
    const y = currentPoint.y + (nextPoint.y - currentPoint.y) * segmentProgress;
    
    return { x, y };
      }
      
      accumulatedDistance += segmentDistance;
    }
    
    // Animation complete, use final position
    const finalPoint = route.points[route.points.length - 1];
    return { x: finalPoint.x, y: finalPoint.y };
  };

  // Load user data from Firestore when user logs in
  useEffect(() => {
    if (user && !authLoading) {
      setIsLoadingUserData(true);
      loadUserData(user.uid)
        .then((userData) => {
          if (userData) {
            // Update localStorage with cloud data (for compatibility)
            localStorage.setItem('savedPlays', JSON.stringify(userData.savedPlays));
            localStorage.setItem('playFolders', JSON.stringify(userData.folders));
            setFolders(userData.folders);
          }
        })
        .catch((error) => {
          console.error('Error loading user data:', error);
        })
        .finally(() => {
          setIsLoadingUserData(false);
        });
    } else if (!user && !authLoading) {
      // User logged out - keep localStorage as is (for guest mode)
    }
  }, [user, authLoading]);

  const syncToCloud = async (savedPlays: SavedPlay[], folders: Folder[]) => {
    if (user) {
      try {
        console.log('=== syncToCloud START ===');
        console.log('User ID:', user.uid);
        console.log('Local savedPlays count:', savedPlays.length);
        console.log('Local savedPlays:', savedPlays.map(p => ({ id: p.id, name: p.name, folderId: p.folderId })));
        console.log('Local folders count:', folders.length);
        console.log('Local folders:', folders);
        
        // Load existing data from Firebase to merge properly
        console.log('Loading existing data from Firebase...');
        const existingData = await loadUserData(user.uid);
        console.log('Existing data from Firebase:', existingData);
        console.log('Existing savedPlays count:', existingData?.savedPlays?.length || 0);
        console.log('Existing savedPlays:', existingData?.savedPlays?.map((p: SavedPlay) => ({ id: p.id, name: p.name, folderId: p.folderId })) || []);
        
        let mergedPlays = savedPlays;
        
        if (existingData && existingData.savedPlays.length > 0) {
          // Merge plays: keep existing plays that aren't in local, update/keep local plays
          const existingPlayIds = new Set(existingData.savedPlays.map((p: SavedPlay) => p.id));
          const localPlayIds = new Set(savedPlays.map((p: SavedPlay) => p.id));
          
          console.log('Existing play IDs:', Array.from(existingPlayIds));
          console.log('Local play IDs:', Array.from(localPlayIds));
          
          // Keep existing plays that aren't in local array
          const playsToKeep = existingData.savedPlays.filter((p: SavedPlay) => !localPlayIds.has(p.id));
          console.log('Plays to keep from Firebase (not in local):', playsToKeep.length);
          
          // Merge: combine kept plays with local plays
          mergedPlays = [...playsToKeep, ...savedPlays];
          console.log('Merged plays count:', mergedPlays.length);
        } else {
          console.log('No existing data in Firebase, using local plays only');
        }
        
        const userData: UserData = {
          savedPlays: mergedPlays,
          folders,
          updatedAt: new Date().toISOString()
        };
        
        // Debug: Verify folderId is in the data before saving
        const playsWithFolders = mergedPlays.filter((p: SavedPlay) => p.folderId);
        console.log('=== About to save to Firebase ===');
        console.log('Total plays to save:', mergedPlays.length);
        console.log('Plays with folders:', playsWithFolders.length);
        console.log('All plays to save:', mergedPlays.map((p: SavedPlay) => ({ id: p.id, name: p.name, folderId: p.folderId })));
        console.log('Folders to save:', folders);
        console.log('UserData object:', JSON.stringify(userData, null, 2));
        
        await saveUserData(user.uid, userData);
        console.log('Successfully saved to Firebase');
        
        // Verify what was saved by loading it back
        console.log('Verifying save by loading data back...');
        const verifyData = await loadUserData(user.uid);
        console.log('Verified - savedPlays count:', verifyData?.savedPlays?.length || 0);
        console.log('Verified - savedPlays:', verifyData?.savedPlays?.map((p: SavedPlay) => ({ id: p.id, name: p.name, folderId: p.folderId })) || []);
        console.log('=== syncToCloud END ===');
      } catch (error) {
        console.error('=== Error syncing to cloud ===');
        console.error('Error:', error);
        console.error('Error details:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        });
        // Don't throw - allow local save to continue
      }
    } else {
      console.log('syncToCloud: No user logged in, skipping cloud sync');
    }
  };

  const openSaveDialog = () => {
    if (players.length === 0) {
      alert('Please add some players before saving the play.');
      return;
    }
    // If user is not logged in, show login modal instead
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    setShowSaveDialog(true);
    setShowCreateFolderInput(false);
    setNewFolderName('');
    // Load existing folders
    const savedFolders = JSON.parse(localStorage.getItem('playFolders') || '[]');
    setFolders(savedFolders);
  };

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
      // Close login modal and open save dialog
      setShowLoginModal(false);
      setLoginEmail('');
      setLoginPassword('');
      setShowLoginPassword(false);
      // Open save dialog after successful login
      setShowSaveDialog(true);
      setShowCreateFolderInput(false);
      setNewFolderName('');
      const savedFolders = JSON.parse(localStorage.getItem('playFolders') || '[]');
      setFolders(savedFolders);
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
      // Close login modal and open save dialog
      setShowLoginModal(false);
      setLoginEmail('');
      setLoginPassword('');
      setShowLoginPassword(false);
      // Open save dialog after successful login
      setShowSaveDialog(true);
      setShowCreateFolderInput(false);
      setNewFolderName('');
      const savedFolders = JSON.parse(localStorage.getItem('playFolders') || '[]');
      setFolders(savedFolders);
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

  const savePlay = async () => {
    if (!playName.trim()) {
      alert('Please enter a name for the play.');
      return;
    }

    console.log('=== savePlay START ===');
    console.log('Play name:', playName.trim());
    console.log('Editing play ID:', editingPlayId);
    console.log('Selected folder:', selectedFolder);
    console.log('User logged in:', !!user);
    console.log('Players count:', players.length);
    console.log('Routes count:', routes.length);
    console.log('Text boxes count:', textBoxes.length);
    console.log('Circles count:', circles.length);
    console.log('Footballs count:', footballs.length);

    const savedPlays = JSON.parse(localStorage.getItem('savedPlays') || '[]');
    const currentFolders = JSON.parse(localStorage.getItem('playFolders') || '[]');
    console.log('Current savedPlays from localStorage:', savedPlays.length);
    console.log('Current folders from localStorage:', currentFolders.length);
    
    if (editingPlayId) {
      // Update existing play
      console.log('Updating existing play');
      const playIndex = savedPlays.findIndex((play: { id: string }) => play.id === editingPlayId);
      if (playIndex !== -1) {
        const updatedPlay: SavedPlay = {
          ...savedPlays[playIndex],
          name: playName.trim(),
          folderId: selectedFolder || undefined,
          players: players,
          routes: routes,
          textBoxes: textBoxes,
          circles: circles,
          footballs: footballs,
          playerRouteAssociations: Object.fromEntries(playerRouteAssociations), // Convert Map to object for Firestore
          updatedAt: new Date().toISOString()
        };
        // Only include playNotes if it has content, otherwise remove it
        if (playNotes.trim()) {
          updatedPlay.playNotes = playNotes.trim();
        } else {
          delete updatedPlay.playNotes;
        }
        savedPlays[playIndex] = updatedPlay;
        console.log('Updated play:', savedPlays[playIndex]);
        setShowSaveNotification(true);
        setTimeout(() => setShowSaveNotification(false), 3000);
      } else {
        console.warn('Play not found for editing:', editingPlayId);
      }
    } else {
      // Create new play
      console.log('Creating new play');
      const newPlay = {
        id: Date.now().toString(),
        name: playName.trim(),
        folderId: selectedFolder || undefined,
        players: players,
        routes: routes,
        textBoxes: textBoxes,
        circles: circles,
        footballs: footballs,
        playerRouteAssociations: Object.fromEntries(playerRouteAssociations), // Convert Map to object for Firestore
        ...(playNotes.trim() ? { playNotes: playNotes.trim() } : {}),
        createdAt: new Date().toISOString()
      };
      console.log('New play created:', newPlay);
      savedPlays.push(newPlay);
      setShowSaveNotification(true);
      setTimeout(() => setShowSaveNotification(false), 3000);
    }
    
    console.log('After save - savedPlays count:', savedPlays.length);
    console.log('After save - savedPlays:', savedPlays.map((p: SavedPlay) => ({ id: p.id, name: p.name, folderId: p.folderId })));
    
    // Save to localStorage first
    localStorage.setItem('savedPlays', JSON.stringify(savedPlays));
    console.log('Saved to localStorage');
    
    // Close dialog immediately
    setPlayName('');
    setSelectedFolder('');
    setNewFolderName('');
    setEditingPlayId(null);
    setShowSaveDialog(false);
    
    // Cloud sync in background (don't await)
    if (user) {
      console.log('User is logged in, syncing to cloud...');
      // Debug: Log plays with folderId before syncing
      const playsWithFolders = savedPlays.filter((p: SavedPlay) => p.folderId);
      console.log('Syncing to cloud - Total plays:', savedPlays.length, 'Plays with folders:', playsWithFolders.length);
      if (playsWithFolders.length > 0) {
        console.log('Plays with folderId:', playsWithFolders.map((p: SavedPlay) => ({ id: p.id, name: p.name, folderId: p.folderId })));
      }
      syncToCloud(savedPlays, currentFolders).catch((error) => {
        console.error('Error syncing to cloud:', error);
      });
    } else {
      console.log('User not logged in, skipping cloud sync');
    }
    
    console.log('=== savePlay END ===');
  };

  const closeSaveDialog = () => {
    setShowSaveDialog(false);
    setPlayName('');
    setSelectedFolder('');
    setNewFolderName('');
    setShowCreateFolderInput(false);
    setEditingPlayId(null);
  };

  const deleteFolder = async (folderId: string) => {
    // Remove folder from folders list
    const updatedFolders = folders.filter(f => f.id !== folderId);
    setFolders(updatedFolders);
    
    // Unassign plays from deleted folder
    const savedPlays = JSON.parse(localStorage.getItem('savedPlays') || '[]');
    const updatedPlays = savedPlays.map((play: { folderId?: string }) => 
      play.folderId === folderId ? { ...play, folderId: undefined } : play
    );
    
    // Cloud-first: Save to Firestore if logged in, then localStorage
    if (user) {
      await syncToCloud(updatedPlays, updatedFolders);
    }
    localStorage.setItem('playFolders', JSON.stringify(updatedFolders));
    localStorage.setItem('savedPlays', JSON.stringify(updatedPlays));
    
    setShowDeleteFolderConfirm(null);
  };

  const downloadPlayAsJPG = () => {
    // Find the field container
    const fieldContainer = document.querySelector('.bg-white.relative.overflow-hidden');
    if (!fieldContainer) {
      alert('Could not find the field to download.');
      return;
    }

    // Create a canvas element for rendering
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      alert('Could not create canvas context.');
      return;
    }

    // Set canvas size to match the field container with higher resolution
    const rect = fieldContainer.getBoundingClientRect();
    const baseSize = Math.min(rect.width, rect.height); // Make it square
    const scale = 2; // 2x resolution for better quality
    const size = baseSize * scale;
    canvas.width = size;
    canvas.height = size;
    
    // Scale the context for higher resolution
    ctx.scale(scale, scale);

    // Fill background with white
    ctx.fillStyle = '#ffffff'; // white
    ctx.fillRect(0, 0, baseSize, baseSize);

    // Draw field lines
    const lineWidth = baseSize * 0.002; // Scale line width for better visibility
    ctx.strokeStyle = '#9ca3af'; // gray-400 for lines on white background
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
        
        ctx.fillStyle = '#9ca3af'; // gray-400
        ctx.fillRect(leftX, y - hashHeight/2, hashWidth, hashHeight);
        ctx.fillRect(rightX, y - hashHeight/2, hashWidth, hashHeight);
      }

      // Draw sidelines
      ctx.fillStyle = '#9ca3af'; // gray-400
      ctx.fillRect(0, 0, baseSize, lineWidth);
      ctx.fillRect(0, baseSize - lineWidth, baseSize, lineWidth);

    // Draw players
    // Player icons on canvas are w-12 h-12 (48px = 3rem), so radius is 24px
    // Making them slightly smaller in downloaded image - reduce from 0.04 to 0.03
    const playerRadius = baseSize * 0.03; // Slightly smaller for downloaded images
    [...players, ...defensivePlayers].forEach(player => {
      let playerColor = '#6b7280'; // default gray
      let playerLabel = '';
      
      if (player.type === 'defense') {
        playerColor = player.color === 'purple' ? '#a855f7' : '#6b7280';
        playerLabel = 'D';
      } else {
        // Map color names to hex values
        const colorMap: { [key: string]: string } = {
          'blue': '#3b82f6',
          'red': '#ef4444',
          'green': '#22c55e',
          'yellow': '#eab308',
          'qb': '#000000'
        };
        // Map color names to labels
        const labelMap: { [key: string]: string } = {
          'blue': 'X',
          'red': 'Z',
          'green': 'Y',
          'yellow': 'C',
          'qb': 'QB'
        };
        playerColor = colorMap[player.color] || '#6b7280';
        playerLabel = labelMap[player.color] || '';
      }
      
      const x = (player.x / rect.width) * baseSize;
      const y = (player.y / rect.height) * baseSize;
      
      // Draw player circle
      ctx.fillStyle = playerColor;
      ctx.beginPath();
      ctx.arc(x, y, playerRadius, 0, 2 * Math.PI);
      ctx.fill();
      
      // Draw white border
      ctx.strokeStyle = 'white';
      ctx.lineWidth = lineWidth * 2;
      ctx.stroke();
      
      // Draw label if exists
      // Font size should match proportionally with smaller icon size
      if (playerLabel) {
        ctx.fillStyle = 'white';
        ctx.font = `bold ${baseSize * 0.02}px Arial`; // Slightly smaller to match reduced icon size
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(playerLabel, x, y);
      }
    });

    // Draw text boxes
    textBoxes.forEach(textBox => {
      const x = (textBox.x / rect.width) * baseSize;
      const y = (textBox.y / rect.height) * baseSize;
      
      // Draw text box background
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.fillRect(x - 20, y - 8, 40, 16);
      
      // Draw text box border
      ctx.strokeStyle = '#d1d5db';
      ctx.lineWidth = lineWidth;
      ctx.strokeRect(x - 20, y - 8, 40, 16);
      
      // Draw text
      ctx.fillStyle = textBox.color;
      ctx.font = `bold ${baseSize * 0.012}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(textBox.text, x, y);
    });

    // Draw circles
    circles.forEach(circle => {
      const x = (circle.x / rect.width) * baseSize;
      const y = (circle.y / rect.height) * baseSize;
      const radius = (circle.radius / rect.width) * baseSize;
      
      ctx.fillStyle = circle.color;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2 * Math.PI);
      ctx.fill();
    });

    // Draw routes
    ctx.strokeStyle = 'black';
    ctx.lineWidth = lineWidth * 3;
    routes.forEach(route => {
      if (!route || !route.points || !Array.isArray(route.points) || route.points.length < 2) return;
      
      // Set line dash pattern for dashed routes
      if (route.style === 'dashed') {
        ctx.setLineDash([8, 4]);
      } else {
        ctx.setLineDash([]);
      }
      
      ctx.beginPath();
      ctx.moveTo(
        (route.points[0].x / rect.width) * baseSize,
        (route.points[0].y / rect.height) * baseSize
      );
      
      // Draw route line, but stop slightly before the end if there's an arrow
      const shouldShowArrow = route.showArrow !== false && route.lineBreakType !== 'none' && route.lineBreakType !== 'smooth-none';
      const endIndex = shouldShowArrow ? route.points.length - 1 : route.points.length;
      
      for (let i = 1; i < endIndex; i++) {
        ctx.lineTo(
          (route.points[i].x / rect.width) * baseSize,
          (route.points[i].y / rect.height) * baseSize
        );
      }
      
      // If there's an arrow, draw the last segment but stop short of the actual end point
      if (shouldShowArrow && route.points.length >= 2) {
        const lastPoint = route.points[route.points.length - 1];
        const secondLastPoint = route.points[route.points.length - 2];
        
        // Calculate direction vector
        const dx = lastPoint.x - secondLastPoint.x;
        const dy = lastPoint.y - secondLastPoint.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Stop the line 6 pixels before the end point
        const arrowGap = 6;
        const stopDistance = Math.max(0, distance - arrowGap);
        const stopRatio = stopDistance / distance;
        
        const stopX = secondLastPoint.x + dx * stopRatio;
        const stopY = secondLastPoint.y + dy * stopRatio;
        
        ctx.lineTo(
          (stopX / rect.width) * baseSize,
          (stopY / rect.height) * baseSize
        );
      }
      
      ctx.stroke();
      
      // Draw arrow at the end
      if (shouldShowArrow && route.points.length >= 2) {
        const lastPoint = route.points[route.points.length - 1];
        const secondLastPoint = route.points[route.points.length - 2];
        
        const angle = Math.atan2(
          secondLastPoint.y - lastPoint.y,
          secondLastPoint.x - lastPoint.x
        );
        
        const arrowLength = baseSize * 0.03;
        const arrowX = (lastPoint.x / rect.width) * baseSize + Math.cos(angle) * arrowLength;
        const arrowY = (lastPoint.y / rect.height) * baseSize + Math.sin(angle) * arrowLength;
        
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.moveTo((lastPoint.x / rect.width) * baseSize, (lastPoint.y / rect.height) * baseSize);
        ctx.lineTo(
          arrowX - Math.cos(angle - 0.6) * arrowLength * 0.6,
          arrowY - Math.sin(angle - 0.6) * arrowLength * 0.6
        );
        ctx.lineTo(
          arrowX - Math.cos(angle + 0.6) * arrowLength * 0.6,
          arrowY - Math.sin(angle + 0.6) * arrowLength * 0.6
        );
        ctx.closePath();
        ctx.fill();
      }
    });

    // Convert canvas to blob and download
    canvas.toBlob((blob) => {
      if (!blob) {
        alert('Could not create image.');
        return;
      }
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `play-${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 'image/jpeg', 0.9);
  };

  const downloadAnimationAsGIF = () => {
    if (routes.length === 0) {
      alert('Please draw some routes before exporting the animation.');
      return;
    }

    // Load gif.js from CDN if not already loaded
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const loadGIFJS = (): Promise<any> => {
      return new Promise((resolve, reject) => {
        // @ts-expect-error - GIF is loaded dynamically from CDN
        if (window.GIF) {
          // @ts-expect-error - GIF is loaded dynamically from CDN
          resolve(window.GIF);
          return;
        }

        // Load main library
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.js';
        script.onload = () => {
          // @ts-expect-error - GIF is loaded dynamically from CDN
          resolve(window.GIF);
        };
        script.onerror = () => {
          reject(new Error('Failed to load GIF library'));
        };
        document.head.appendChild(script);
      });
    };

    loadGIFJS().then((GIF) => {
      const fieldContainer = document.querySelector('.bg-white.relative.overflow-hidden');
      if (!fieldContainer) {
        alert('Could not find canvas area.');
        return;
      }

      const rect = fieldContainer.getBoundingClientRect();
      const baseSize = Math.min(rect.width, rect.height);
      const scale = 2;
      const size = baseSize * scale;

      // Create GIF with high quality
      // Use workers: 0 to avoid CORS issues with worker script from CDN
      const gif = new GIF({
        workers: 0, // Disable workers to avoid CORS issues
        quality: 10,
        width: size,
        height: size,
        repeat: 0 // Loop forever
      });

      // Calculate distance for each route and find the longest one
      let maxDistance = 0;
      routes.forEach((route) => {
        if (!route || !route.points || !Array.isArray(route.points) || route.points.length < 2) return;
        let distance = 0;
        for (let i = 1; i < route.points.length; i++) {
          const dx = route.points[i].x - route.points[i - 1].x;
          const dy = route.points[i].y - route.points[i - 1].y;
          distance += Math.sqrt(dx * dx + dy * dy);
        }
        if (distance > maxDistance) {
          maxDistance = distance;
        }
      });

      // Calculate duration based on longest route (pixels per second)
      const duration = (maxDistance / animationSpeed) * 1000;
      const fps = 15; // Frames per second
      const frameCount = Math.ceil((duration / 1000) * fps);
      const frameDelay = duration / frameCount;

      // Create temporary canvas for rendering
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = size;
      tempCanvas.height = size;
      const ctx = tempCanvas.getContext('2d');
      if (!ctx) {
        alert('Could not create canvas context.');
        return;
      }

      // Function to render a frame at a specific elapsed time (in milliseconds)
      const renderFrame = (elapsed: number) => {
        ctx.fillStyle = '#ffffff'; // white
        ctx.fillRect(0, 0, size, size);

        // Draw field lines
        const lineWidth = baseSize * 0.002;
        ctx.strokeStyle = '#9ca3af';
        ctx.lineWidth = lineWidth;
        
        // Yard lines
        for (let i = 10; i <= 90; i += 10) {
          const y = (i / 100) * baseSize;
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(baseSize, y);
          ctx.stroke();
        }

        // Hash marks
        const hashMarkLength = baseSize * 0.03;
        for (let i = 10; i <= 90; i += 10) {
          const y = (i / 100) * baseSize;
          // Left hash marks
          ctx.beginPath();
          ctx.moveTo(baseSize * 0.2, y);
          ctx.lineTo(baseSize * 0.2 + hashMarkLength, y);
          ctx.stroke();
          // Right hash marks
          ctx.beginPath();
          ctx.moveTo(baseSize * 0.8, y);
          ctx.lineTo(baseSize * 0.8 - hashMarkLength, y);
          ctx.stroke();
        }

        // Draw players at animated positions - use same logic as getAnimatedPlayerPosition
        // Calculate progress from elapsed time for defensive player movement
        const progress = Math.min(elapsed / duration, 1);
        
        const animatedPlayers = [...players, ...defensivePlayers].map(player => {
          // Handle defensive players
          if (player.type === 'defense') {
            // If a coverage pattern is selected and has positions defined
            if (selectedCoverage && selectedCoverage.positions.length > 0) {
              // Get field dimensions
              const fieldWidth = rect.width;
              const fieldHeight = rect.height;
              
              // Find the index of this defensive player
              const playerIndex = defensivePlayers.findIndex(p => p.id === player.id);
              if (playerIndex !== -1 && playerIndex < selectedCoverage.positions.length) {
                // Get target position from coverage pattern (convert from 0-1 to actual coordinates)
                const targetPos = selectedCoverage.positions[playerIndex];
                const targetX = targetPos.x * fieldWidth;
                const targetY = targetPos.y * fieldHeight;
                
                // Calculate distance from starting position to target
                const dx = targetX - player.x;
                const dy = targetY - player.y;
                const totalDistance = Math.sqrt(dx * dx + dy * dy);
                
                if (totalDistance > 0) {
                  // Calculate progress based on elapsed time (same speed as offensive players)
                  const elapsedSeconds = elapsed / 1000;
                  const currentDistance = Math.min(elapsedSeconds * animationSpeed, totalDistance);
                  const progress = currentDistance / totalDistance;
                  
                  // Interpolate from starting position to target position
                  return {
                    ...player,
                    x: player.x + dx * progress,
                    y: player.y + dy * progress
                  };
                }
              }
            }
            
            // Default behavior: man coverage (follow nearest offensive player)
            const offensivePlayers = players.filter(p => p.type === 'offense');
            let nearestPlayer: { x: number; y: number } | null = null;
            let nearestDistance = Infinity;
            
            for (const offensivePlayer of offensivePlayers) {
              // Calculate offensive player's animated position
              const associatedRouteIds = playerRouteAssociations.get(offensivePlayer.id) || [];
              const route = routes.find(r => 
                associatedRouteIds.includes(r.id) && r.lineBreakType !== 'none' && r.lineBreakType !== 'smooth-none'
              );
              
              let offensiveX = offensivePlayer.x;
              let offensiveY = offensivePlayer.y;
              
              if (route && route.points.length >= 2) {
                let totalDistance = 0;
                for (let i = 1; i < route.points.length; i++) {
                  const dx = route.points[i].x - route.points[i - 1].x;
                  const dy = route.points[i].y - route.points[i - 1].y;
                  totalDistance += Math.sqrt(dx * dx + dy * dy);
                }
                
                // Calculate current distance based on elapsed time and speed
                const elapsedSeconds = elapsed / 1000;
                const currentDistance = Math.min(elapsedSeconds * animationSpeed, totalDistance);
                let accumulatedDistance = 0;
                for (let i = 1; i < route.points.length; i++) {
                  const dx = route.points[i].x - route.points[i - 1].x;
                  const dy = route.points[i].y - route.points[i - 1].y;
                  const segmentDistance = Math.sqrt(dx * dx + dy * dy);
                  
                  if (currentDistance <= accumulatedDistance + segmentDistance) {
                    const segmentProgress = (currentDistance - accumulatedDistance) / segmentDistance;
                    offensiveX = route.points[i - 1].x + (route.points[i].x - route.points[i - 1].x) * segmentProgress;
                    offensiveY = route.points[i - 1].y + (route.points[i].y - route.points[i - 1].y) * segmentProgress;
                    break;
                  }
                  accumulatedDistance += segmentDistance;
                }
              }
              
              const distance = Math.sqrt(
                Math.pow(offensiveX - player.x, 2) + 
                Math.pow(offensiveY - player.y, 2)
              );
              if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestPlayer = { x: offensiveX, y: offensiveY };
              }
            }
            
            if (nearestPlayer) {
              const dx = nearestPlayer.x - player.x;
              const dy = nearestPlayer.y - player.y;
              const distance = Math.sqrt(dx * dx + dy * dy);
              const moveDistance = Math.min(distance * progress * 0.7, distance * 0.7);
              if (distance > 0) {
                return { ...player, x: player.x + (dx / distance) * moveDistance, y: player.y + (dy / distance) * moveDistance };
              }
            }
            return player;
          }
          
          // Handle offensive players
          const associatedRouteIds = playerRouteAssociations.get(player.id) || [];
          const route = routes.find(r => 
            associatedRouteIds.includes(r.id) && r.lineBreakType !== 'none' && r.lineBreakType !== 'smooth-none'
          );
          
          if (!route || !route.points || !Array.isArray(route.points) || route.points.length < 2) {
            return player;
          }
          
          // Calculate total distance of the entire route
          let totalDistance = 0;
          for (let i = 1; i < route.points.length; i++) {
            const dx = route.points[i].x - route.points[i - 1].x;
            const dy = route.points[i].y - route.points[i - 1].y;
            totalDistance += Math.sqrt(dx * dx + dy * dy);
          }
          
          // Calculate current distance based on elapsed time and speed (not progress)
          // All players move at the same speed, so shorter routes finish first
          const elapsedSeconds = elapsed / 1000;
          const currentDistance = Math.min(elapsedSeconds * animationSpeed, totalDistance);
          
          // Find which segment we're currently in
          let accumulatedDistance = 0;
          for (let i = 1; i < route.points.length; i++) {
            const dx = route.points[i].x - route.points[i - 1].x;
            const dy = route.points[i].y - route.points[i - 1].y;
            const segmentDistance = Math.sqrt(dx * dx + dy * dy);
            
            if (currentDistance <= accumulatedDistance + segmentDistance) {
              // We're in this segment
              const segmentProgress = (currentDistance - accumulatedDistance) / segmentDistance;
              const currentPoint = route.points[i - 1];
              const nextPoint = route.points[i];
              
              const x = currentPoint.x + (nextPoint.x - currentPoint.x) * segmentProgress;
              const y = currentPoint.y + (nextPoint.y - currentPoint.y) * segmentProgress;
              
              return { ...player, x, y };
            }
            
            accumulatedDistance += segmentDistance;
          }
          
          // Animation complete, use final position
          const finalPoint = route.points[route.points.length - 1];
          return { ...player, x: finalPoint.x, y: finalPoint.y };
        });

        // Draw all players at their animated positions
        animatedPlayers.forEach(player => {
          const x = (player.x / rect.width) * baseSize;
          const y = (player.y / rect.height) * baseSize;
          
          const radius = baseSize * 0.015;
          ctx.fillStyle = player.color === 'blue' ? '#3b82f6' :
                         player.color === 'red' ? '#ef4444' :
                         player.color === 'green' ? '#22c55e' :
                         player.color === 'yellow' ? '#eab308' :
                         player.color === 'qb' ? '#000000' :
                         player.color === 'purple' ? '#a855f7' : '#6b7280';
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, 2 * Math.PI);
          ctx.fill();
          
          // Draw player label
          const labelMap: { [key: string]: string } = {
            'blue': 'X',
            'red': 'Z',
            'green': 'Y',
            'yellow': 'C',
            'qb': 'QB'
          };
          const playerLabel = labelMap[player.color] || '';
          if (playerLabel) {
            ctx.fillStyle = '#ffffff';
            ctx.font = `bold ${baseSize * 0.012}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(playerLabel, x, y);
          }
        });

        // Draw routes
        ctx.strokeStyle = 'black';
        ctx.lineWidth = lineWidth * 3;
        routes.forEach(route => {
          if (!route || !route.points || !Array.isArray(route.points) || route.points.length < 2) return;
          
          if (route.style === 'dashed') {
            ctx.setLineDash([8, 4]);
          } else {
            ctx.setLineDash([]);
          }
          
          ctx.beginPath();
          ctx.moveTo(
            (route.points[0].x / rect.width) * baseSize,
            (route.points[0].y / rect.height) * baseSize
          );
          
          const shouldShowArrow = route.showArrow !== false && route.lineBreakType !== 'none' && route.lineBreakType !== 'smooth-none';
          const endIndex = shouldShowArrow ? route.points.length - 1 : route.points.length;
          
          for (let i = 1; i < endIndex; i++) {
            ctx.lineTo(
              (route.points[i].x / rect.width) * baseSize,
              (route.points[i].y / rect.height) * baseSize
            );
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
            ctx.lineTo((stopX / rect.width) * baseSize, (stopY / rect.height) * baseSize);
          }
          ctx.stroke();
          
          // Draw arrows
          if (shouldShowArrow && route.points.length >= 2) {
            const lastPoint = route.points[route.points.length - 1];
            const secondLastPoint = route.points[route.points.length - 2];
            const dx = lastPoint.x - secondLastPoint.x;
            const dy = lastPoint.y - secondLastPoint.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance > 0) {
              const angle = Math.atan2(dy, dx);
              const arrowX = (lastPoint.x / rect.width) * baseSize;
              const arrowY = (lastPoint.y / rect.height) * baseSize;
              const arrowLength = baseSize * 0.02;
              
              ctx.fillStyle = 'black';
              ctx.beginPath();
              ctx.moveTo(arrowX, arrowY);
              ctx.lineTo(
                arrowX - Math.cos(angle - 0.6) * arrowLength,
                arrowY - Math.sin(angle - 0.6) * arrowLength
              );
              ctx.lineTo(
                arrowX - Math.cos(angle + 0.6) * arrowLength,
                arrowY - Math.sin(angle + 0.6) * arrowLength
              );
              ctx.closePath();
              ctx.fill();
            }
          }
        });
      };

      // Capture frames
      for (let i = 0; i <= frameCount; i++) {
        const elapsed = i * frameDelay; // Elapsed time in milliseconds
        renderFrame(elapsed);
        gif.addFrame(tempCanvas, { delay: frameDelay });
      }

      // Render the GIF
      gif.on('finished', (blob: Blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `play-animation-${Date.now()}.gif`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });

      gif.render();
    }).catch((error) => {
      alert('Failed to load GIF library: ' + error.message);
    });
  };

  const pathname = usePathname();

  const handleLogout = async () => {
    try {
      if (logout) {
        await logout();
      }
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Navigation */}
      <header className="flex items-center justify-between px-4 md:px-8 py-4 md:py-6 bg-white border-b border-gray-200 relative">
        {/* Site Title */}
        <div className="flex items-center">
          <span className="text-gray-800 font-bold text-lg tracking-tight">Flag Tactics</span>
        </div>

        {/* Desktop Navigation Links and Login/Logout */}
        <div className="hidden md:flex items-center gap-6">
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

        {/* Mobile Hamburger Menu Button */}
        <button
          onClick={() => setShowMobileMenu(!showMobileMenu)}
          className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="Menu"
          data-mobile-menu
        >
          <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {showMobileMenu ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>

        {/* Mobile Menu Dropdown */}
        {showMobileMenu && (
          <div className="absolute top-full left-0 right-0 bg-white border-b border-gray-200 shadow-lg z-50 md:hidden" data-mobile-menu>
            <div className="flex flex-col py-2">
              <Link 
                href="/builder"
                onClick={() => setShowMobileMenu(false)}
                className={`px-4 py-3 text-sm font-medium transition-colors ${
                  pathname === '/builder' 
                    ? 'text-gray-900 bg-gray-50' 
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                Play Builder
              </Link>
              <Link 
                href="/my-plays"
                onClick={() => setShowMobileMenu(false)}
                className={`px-4 py-3 text-sm font-medium transition-colors ${
                  pathname === '/my-plays' 
                    ? 'text-gray-900 bg-gray-50' 
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                My Plays
              </Link>
              {!user ? (
                <Link
                  href="/login"
                  onClick={() => setShowMobileMenu(false)}
                  className="px-4 py-3 bg-gray-900 text-white font-medium hover:bg-gray-800 transition-colors text-sm mx-4 my-2 rounded-lg"
                >
                  Log In
                </Link>
              ) : (
                <button
                  onClick={() => {
                    setShowMobileMenu(false);
                    handleLogout();
                  }}
                  className="px-4 py-3 bg-gray-900 text-white font-medium hover:bg-gray-800 transition-colors text-sm mx-4 my-2 rounded-lg text-left"
                >
                  Log Out
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      <div className="flex flex-1 min-h-0 overflow-hidden">
      {/* Left Sidebar - Folder List */}
      <div className="hidden md:flex w-1/4 bg-white border-r border-gray-200 flex-col overflow-y-auto flex-shrink-0">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-700">Folders</h2>
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
                  const savedPlays = JSON.parse(localStorage.getItem('savedPlays') || '[]');
                  // Cloud-first: Save to Firestore if logged in, then localStorage
                  if (user) {
                    syncToCloud(savedPlays, updatedFolders).catch(console.error);
                  }
                  localStorage.setItem('playFolders', JSON.stringify(updatedFolders));
                }
              }}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors text-gray-600 hover:text-gray-900"
              title="Create Folder"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
              </button>
            </div>
          <div className="space-y-2">
            {/* All Plays Button */}
            <button
              onClick={() => {
                window.location.href = '/my-plays';
              }}
              className="w-full px-4 py-3 text-left flex items-center gap-3 rounded-lg hover:bg-gray-100 transition-colors group"
            >
              <svg className="w-6 h-6 text-gray-500 group-hover:text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <span className="text-base text-gray-700 group-hover:text-gray-900">All Plays</span>
            </button>
            
            {/* Folder List */}
            {folders.map((folder) => (
              <div
                key={folder.id}
                data-folder-id={folder.id}
                className="w-full flex items-center group relative"
                data-folder-menu
              >
            <button
                  onClick={() => {
                    window.location.href = `/my-plays?folder=${folder.id}`;
                  }}
                  className="flex-1 px-4 py-3 text-left flex items-center gap-3 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <svg className="w-6 h-6 text-gray-500 group-hover:text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
                  <span className="text-base text-gray-700 group-hover:text-gray-900">{folder.name}</span>
            </button>
                <div className="relative mr-2">
            <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenFolderMenu(openFolderMenu === folder.id ? null : folder.id);
                    }}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-700 opacity-0 group-hover:opacity-100"
                    title="Folder options"
                    data-folder-menu
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
              </svg>
            </button>
                  {openFolderMenu === folder.id && (
                    <div className="absolute right-0 top-10 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-[160px] py-1" data-folder-menu>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          // Get all plays in this folder (same as save feature)
                          const savedPlays = JSON.parse(localStorage.getItem('savedPlays') || '[]');
                          const folderPlays = savedPlays.filter((play: { folderId?: string }) => play.folderId === folder.id);
                          
                          if (folderPlays.length === 0) {
                            alert('This folder is empty. Add some plays before sharing.');
                            setOpenFolderMenu(null);
                            return;
                          }
                          
                          try {
                            // Use Firebase to create shareable link (stores plays array directly)
                            const { createShareableLink } = await import('../firebase');
                            const shareUrl = await createShareableLink(folder.id, folder.name, folderPlays);
                            
                            // Copy to clipboard
                            navigator.clipboard.writeText(shareUrl);
                            alert(`Share link copied to clipboard!\n\n${shareUrl}`);
                            setOpenFolderMenu(null);
                          } catch (error) {
                            console.error('Error creating share link:', error);
                            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                            alert(`Failed to create share link.\n\nError: ${errorMessage}\n\nCheck:\n1. Firestore security rules are set\n2. Browser console for details`);
                          }
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-900 hover:bg-gray-50 transition-colors flex items-center gap-2"
                        data-folder-menu
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
                        Copy Link
            </button>
            <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowDeleteFolderConfirm(folder.id);
                          setOpenFolderMenu(null);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                        data-folder-menu
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
                        Delete Folder
            </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Play Notes Section - Desktop Only */}
        <div className="hidden md:block mt-auto border-t border-gray-200 p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Play Notes
          </label>
          <textarea
            value={playNotes}
            onChange={(e) => setPlayNotes(e.target.value)}
            placeholder="QB fakes handoff to Y..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm text-gray-900 placeholder:text-gray-500"
            rows={4}
          />
        </div>
      </div>

      {/* Canvas Container with Button Row */}
      <div className="bg-gray-50 flex flex-col md:border-r border-gray-200 min-w-0 overflow-hidden">
        {/* Toolbar - Centered over Canvas */}
        <div className="bg-white border-b border-gray-200 flex-shrink-0">
          <div className="flex flex-col md:flex-row md:items-center md:justify-center gap-3 md:gap-6 py-3 px-4">
            {/* Animation Section */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700">Animation:</span>
              <button
                disabled={players.length === 0 && routes.length === 0 && textBoxes.length === 0 && circles.length === 0 && footballs.length === 0}
                className={`w-10 h-10 rounded flex items-center justify-center transition-colors ${
                  isAnimating 
                    ? 'bg-red-500 text-white hover:bg-red-600' 
                    : (players.length === 0 && routes.length === 0 && textBoxes.length === 0 && circles.length === 0 && footballs.length === 0)
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-yellow-500 text-white hover:bg-yellow-600'
                }`}
                onClick={isAnimating ? stopAnimation : startAnimation}
                title={isAnimating ? "Stop Animation" : (players.length === 0 && routes.length === 0 && textBoxes.length === 0 && circles.length === 0 && footballs.length === 0) ? "Add elements to canvas first" : "Play Animation"}
              >
                {isAnimating ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 6h12v12H6z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>
            </div>
            
            {/* Coverage Selector - Only show if defensive players exist */}
            {defensivePlayers.length > 0 && (
              <>
                <div className="hidden md:block h-10 w-px bg-gray-300"></div>
                <div className="w-full md:w-auto h-px md:h-10 md:w-px bg-gray-300 md:bg-transparent"></div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-700">Coverage:</span>
                  <select
                    value={selectedCoverage?.id || ''}
                    onChange={(e) => {
                      const coverage = defaultCoverages.find(c => c.id === e.target.value);
                      setSelectedCoverage(coverage || null);
                    }}
                    className="flex-1 md:flex-none px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Man Coverage (Default)</option>
                    {defaultCoverages.filter(c => c.id !== 'man-coverage').map(coverage => (
                      <option key={coverage.id} value={coverage.id}>
                        {coverage.name} - {coverage.description}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
            
            {/* Divider */}
            <div className="hidden md:block h-10 w-px bg-gray-300"></div>
            <div className="md:hidden w-full h-px bg-gray-300"></div>
          
            {/* Tools Section */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700">Tools:</span>
              <div className="flex space-x-2">
                <button
                  className="w-10 h-10 rounded flex items-center justify-center transition-colors text-black"
                  onClick={addTextBoxToCanvas}
                  title="Add Text Box"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                  </svg>
                </button>
                <button
                  className="w-10 h-10 rounded flex items-center justify-center transition-colors text-black"
                  onClick={addCircleToCanvas}
                  title="Add Circle"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" />
                  </svg>
                </button>
                <button
                  className="w-10 h-10 rounded flex items-center justify-center transition-colors text-black hover:bg-gray-100"
                  onClick={addFootballToCanvas}
                  title="Add Football"
                >
                  <img 
                    src="/svgs/american-football.svg" 
                    alt="Football" 
                    className="w-5 h-5"
                  />
                </button>
              </div>
            </div>

            {/* Divider */}
            <div className="hidden md:block h-10 w-px bg-gray-300"></div>
            <div className="md:hidden w-full h-px bg-gray-300"></div>
          
            {/* Play Options Section */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700">Play Options:</span>
              <div className="flex space-x-2">
                <button
                  disabled={players.length === 0 && routes.length === 0 && textBoxes.length === 0 && circles.length === 0 && footballs.length === 0}
                  className={`w-10 h-10 rounded flex items-center justify-center transition-colors ${
                    (players.length === 0 && routes.length === 0 && textBoxes.length === 0 && circles.length === 0 && footballs.length === 0)
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-green-500 text-white hover:bg-green-600'
                  }`}
                  onClick={openSaveDialog}
                  title={(players.length === 0 && routes.length === 0 && textBoxes.length === 0 && circles.length === 0 && footballs.length === 0) ? "Add elements to canvas first" : "Save Play"}
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 256 256">
                    <path d="M219.31,72,184,36.69A15.86,15.86,0,0,0,172.69,32H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V83.31A15.86,15.86,0,0,0,219.31,72ZM168,208H88V152h80Zm40,0H184V152a16,16,0,0,0-16-16H88a16,16,0,0,0-16,16v56H48V48H172.69L208,83.31ZM160,72a8,8,0,0,1-8,8H96a8,8,0,0,1,0-16h56A8,8,0,0,1,160,72Z"></path>
                  </svg>
                </button>
                <div className="relative" data-download-dropdown>
                  <button
                    className="w-10 h-10 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors flex items-center justify-center"
                    onClick={() => setShowDownloadDropdown(!showDownloadDropdown)}
                    title="Download"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </button>
                  {showDownloadDropdown && (
                    <div className="absolute top-12 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-[120px]">
                      <button
                        onClick={() => {
                          downloadPlayAsJPG();
                          setShowDownloadDropdown(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-900 hover:bg-gray-50 transition-colors flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Image
                      </button>
                      <button
                        onClick={() => {
                          downloadAnimationAsGIF();
                          setShowDownloadDropdown(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-900 hover:bg-gray-50 transition-colors flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
                        </svg>
                        GIF
                      </button>
                    </div>
                  )}
                </div>
                <button
                  className="w-10 h-10 bg-red-500 text-white rounded hover:bg-red-600 transition-colors flex items-center justify-center"
                  onClick={clearPlayboard}
                  title="Clear Playboard"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Canvas Container - left-aligned field with border */}
        <div className="bg-gray-50 relative overflow-auto" style={{ height: '800px' }}>
        <div className="bg-white border-r border-gray-300 flex flex-col overflow-hidden h-full w-full" style={{ height: '800px' }}>
          {/* Canvas Area */}
          <div className="bg-white relative overflow-hidden w-full" data-field-container style={{ width: '100%', height: '800px', position: 'relative' }}>
        {/* Save Notification */}
        {showSaveNotification && (
          <div className="absolute top-4 left-6 z-20 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 transition-opacity duration-300 opacity-100">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="font-medium">Play saved</span>
          </div>
        )}
        {/* Undo/Redo Buttons */}
        <div className="absolute top-4 right-6 z-10 flex space-x-2">
          <button
            onClick={undo}
            disabled={historyIndex <= 0}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
              historyIndex <= 0
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-white text-gray-700 hover:bg-gray-50 shadow-md'
            }`}
            title="Undo"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
          </button>
          <button
            onClick={redo}
            disabled={historyIndex >= history.length - 1}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
              historyIndex >= history.length - 1
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-white text-gray-700 hover:bg-gray-50 shadow-md'
            }`}
            title="Redo"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10H11a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
            </svg>
          </button>
        </div>
        
        <div
          className={`w-full h-full relative ${
            selectedRouteStyle ? 'cursor-crosshair' : 'cursor-default'
          }`}
          style={{ touchAction: 'pan-y' }}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onTouchStart={(e) => {
            // Don't handle touch if clicking on delete button
            const target = e.target as HTMLElement;
            if (target.closest('[data-delete-button]')) {
              return;
            }
            
            // Store touch start time and position for scroll detection
            touchStartTimeRef.current = Date.now();
            touchStartPositionRef.current = {
              x: e.touches[0].clientX,
              y: e.touches[0].clientY
            };
            
            // Don't prevent default yet - wait to see if it's a drag or scroll
            const coords = getEventCoordinates(e, e.currentTarget);
            const syntheticEvent = {
              ...e,
              currentTarget: e.currentTarget,
              clientX: e.touches[0].clientX,
              clientY: e.touches[0].clientY,
              preventDefault: () => e.preventDefault(),
              stopPropagation: () => e.stopPropagation()
            } as unknown as React.MouseEvent<HTMLDivElement>;
            handleCanvasMouseDown(syntheticEvent);
          }}
          onTouchMove={(e) => {
            // Only prevent default if we're actually dragging something
            if (isDragging || draggedPlayer || draggedTextBox || draggedCircle || draggedFootball || isSelecting || isDrawingRoute) {
              e.preventDefault();
              handleMouseMove(e);
            } else if (touchStartPositionRef.current) {
              // Check if this looks like a scroll (primarily vertical movement)
              const deltaX = Math.abs(e.touches[0].clientX - touchStartPositionRef.current.x);
              const deltaY = Math.abs(e.touches[0].clientY - touchStartPositionRef.current.y);
              
              // If movement is primarily vertical and significant, allow scrolling
              if (deltaY > 10 && deltaY > deltaX * 1.5) {
                // This looks like scrolling, don't prevent default
                return;
              }
              
              // Otherwise, it might be a drag starting - prevent default and handle
              setIsDragging(true);
              e.preventDefault();
              handleMouseMove(e);
            }
          }}
          onTouchEnd={(e) => {
            // Only prevent default if we were dragging
            if (isDragging || draggedPlayer || draggedTextBox || draggedCircle || draggedFootball || isSelecting || isDrawingRoute) {
              e.preventDefault();
            }
            handleMouseUp();
            setIsDragging(false);
            touchStartPositionRef.current = null;
          }}
        >
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
          {routes.map((route) => {
            const isSelected = selectedItems.routes.includes(route.id);
            if (!route || !route.points || !Array.isArray(route.points) || route.points.length < 2) return null;
            
            // Calculate arrow direction from the last significant movement segment
            // Look back to find a meaningful direction (skip very short segments)
            let startIndex = route.points.length - 2;
            const lastPoint = route.points[route.points.length - 1];
            let secondLastPoint = route.points[startIndex];
            
            // Find the last significant movement (at least 10 pixels)
            while (startIndex > 0) {
              const dx = lastPoint.x - secondLastPoint.x;
              const dy = lastPoint.y - secondLastPoint.y;
              const distance = Math.sqrt(dx * dx + dy * dy);
              
              if (distance >= 10) {
                break; // Found a significant segment
              }
              
              startIndex--;
              secondLastPoint = route.points[startIndex];
            }
            
            const angle = Math.atan2(secondLastPoint.y - lastPoint.y, secondLastPoint.x - lastPoint.x);
            const arrowLength = 20; // Larger arrow
            const arrowX = lastPoint.x + Math.cos(angle) * arrowLength;
            const arrowY = lastPoint.y + Math.sin(angle) * arrowLength;
            
            const shouldShowArrow = route.showArrow !== false && route.lineBreakType !== 'none' && route.lineBreakType !== 'smooth-none';
            
            return (
            <React.Fragment key={route.id}>
            <svg
              data-route={route.id}
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{ zIndex: isSelected ? 2 : 1 }}
            >
                {(route.lineBreakType === 'smooth' || route.lineBreakType === 'smooth-none') ? (
                  <path
                    d={(() => {
                      // If there's an arrow, stop the line slightly before the last point
                      if (shouldShowArrow && route.points.length >= 2) {
                        const lastPoint = route.points[route.points.length - 1];
                        const secondLastPoint = route.points[route.points.length - 2];
                        
                        // Calculate direction vector
                        const dx = lastPoint.x - secondLastPoint.x;
                        const dy = lastPoint.y - secondLastPoint.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        
                        // Stop the line 6 pixels before the end point
                        const arrowGap = 6;
                        const stopDistance = Math.max(0, distance - arrowGap);
                        const stopRatio = stopDistance / distance;
                        
                        const stopX = secondLastPoint.x + dx * stopRatio;
                        const stopY = secondLastPoint.y + dy * stopRatio;
                        
                        // Create points array with shortened last segment
                        const points = route.points.slice(0, -1);
                        points.push({ x: stopX, y: stopY });
                        return generateSmoothPath(points);
                      } else {
                        // No arrow, use all points
                        return generateSmoothPath(route.points);
                      }
                    })()}
                    fill="none"
                    stroke={isSelected ? "blue" : selectedRoute === route.id ? "red" : "black"}
                    strokeWidth={isSelected ? "4" : selectedRoute === route.id ? "5" : "3"}
                    strokeDasharray={route.style === 'dashed' ? '8,4' : 'none'}
                  />
                ) : (
              <polyline
                points={(() => {
                  // If there's an arrow, stop the line slightly before the last point
                  if (shouldShowArrow && route.points.length >= 2) {
                    const lastPoint = route.points[route.points.length - 1];
                    const secondLastPoint = route.points[route.points.length - 2];
                    
                    // Calculate direction vector
                    const dx = lastPoint.x - secondLastPoint.x;
                    const dy = lastPoint.y - secondLastPoint.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    // Stop the line 6 pixels before the end point
                    const arrowGap = 6;
                    const stopDistance = Math.max(0, distance - arrowGap);
                    const stopRatio = stopDistance / distance;
                    
                    const stopX = secondLastPoint.x + dx * stopRatio;
                    const stopY = secondLastPoint.y + dy * stopRatio;
                    
                    // Create points array with shortened last segment
                    const points = route.points.slice(0, -1);
                    points.push({ x: stopX, y: stopY });
                    return points.map(p => `${p.x},${p.y}`).join(' ');
                  } else {
                    // No arrow, use all points
                    return route.points.map(p => `${p.x},${p.y}`).join(' ');
                  }
                })()}
                  fill="none"
                  stroke={isSelected ? "blue" : selectedRoute === route.id ? "red" : "black"}
                  strokeWidth={isSelected ? "4" : selectedRoute === route.id ? "5" : "3"}
                strokeDasharray={route.style === 'dashed' ? '8,4' : 'none'}
              />
                )}
                {/* Arrow at the end - only for routes that should show arrows */}
                {shouldShowArrow && (
                  <polygon
                    points={`${lastPoint.x},${lastPoint.y} ${arrowX - Math.cos(angle - 0.6) * 12},${arrowY - Math.sin(angle - 0.6) * 12} ${arrowX - Math.cos(angle + 0.6) * 12},${arrowY - Math.sin(angle + 0.6) * 12}`}
                    fill={isSelected ? "blue" : selectedRoute === route.id ? "red" : "black"}
                  />
                )}
            </svg>
            {/* Invisible clickable tooltip at the end of the route */}
            {(route.lineBreakType !== 'none' && route.lineBreakType !== 'smooth-none') && (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  toggleRouteArrow(route.id);
                }}
                className="absolute cursor-pointer"
                style={{
                  left: `${lastPoint.x - 10}px`,
                  top: `${lastPoint.y - 10}px`,
                  width: '20px',
                  height: '20px',
                  zIndex: 10,
                  borderRadius: '50%',
                  backgroundColor: 'transparent'
                }}
                title={`Click to ${route.showArrow !== false ? 'hide' : 'show'} arrow`}
              />
            )}
            {/* Delete button for selected routes */}
            {isSelected && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  deleteSingleItem('route', route.id);
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
                onTouchStart={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  deleteSingleItem('route', route.id);
                }}
                className="absolute w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg z-50 pointer-events-auto"
                style={{
                  left: `${lastPoint.x - 12}px`,
                  top: `${lastPoint.y - 12}px`,
                }}
                title="Delete route"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            </React.Fragment>
            );
          })}
          
          {/* Current Route Being Drawn */}
          {currentRoute.length > 1 && (
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{ zIndex: 2 }}
            >
              {(selectedLineBreakType === 'smooth' || selectedLineBreakType === 'smooth-none') ? (
                <path
                  d={(() => {
                    // If there's an arrow ('smooth' type has arrows, 'smooth-none' doesn't), stop the line slightly before the last point
                    if (selectedLineBreakType === 'smooth' && currentRoute.length >= 2) {
                      const lastPoint = currentRoute[currentRoute.length - 1];
                      const secondLastPoint = currentRoute[currentRoute.length - 2];
                      
                      // Calculate direction vector
                      const dx = lastPoint.x - secondLastPoint.x;
                      const dy = lastPoint.y - secondLastPoint.y;
                      const distance = Math.sqrt(dx * dx + dy * dy);
                      
                      // Stop the line 15 pixels before the end point
                      const arrowGap = 15;
                      const stopDistance = Math.max(0, distance - arrowGap);
                      const stopRatio = stopDistance / distance;
                      
                      const stopX = secondLastPoint.x + dx * stopRatio;
                      const stopY = secondLastPoint.y + dy * stopRatio;
                      
                      // Create points array with shortened last segment
                      const points = currentRoute.slice(0, -1);
                      points.push({ x: stopX, y: stopY });
                      return generateSmoothPath(points);
                    } else {
                      // No arrow, use all points
                      return generateSmoothPath(currentRoute);
                    }
                  })()}
                  fill="none"
                  stroke="black"
                  strokeWidth="3"
                  strokeDasharray={selectedRouteStyle === 'dashed' ? '8,4' : 'none'}
                  opacity="0.7"
                />
              ) : (
              <polyline
                points={(() => {
                  // If there's an arrow, stop the line slightly before the last point
                  if (selectedLineBreakType !== 'none' && currentRoute.length >= 2) {
                    const lastPoint = currentRoute[currentRoute.length - 1];
                    const secondLastPoint = currentRoute[currentRoute.length - 2];
                    
                    // Calculate direction vector
                    const dx = lastPoint.x - secondLastPoint.x;
                    const dy = lastPoint.y - secondLastPoint.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    // Stop the line 15 pixels before the end point
                    const arrowGap = 15;
                    const stopDistance = Math.max(0, distance - arrowGap);
                    const stopRatio = stopDistance / distance;
                    
                    const stopX = secondLastPoint.x + dx * stopRatio;
                    const stopY = secondLastPoint.y + dy * stopRatio;
                    
                    // Create points array with shortened last segment
                    const points = currentRoute.slice(0, -1);
                    points.push({ x: stopX, y: stopY });
                    return points.map(p => `${p.x},${p.y}`).join(' ');
                  } else {
                    // No arrow, use all points
                    return currentRoute.map(p => `${p.x},${p.y}`).join(' ');
                  }
                })()}
                fill="none"
                stroke="black"
                strokeWidth="3"
                strokeDasharray={selectedRouteStyle === 'dashed' ? '8,4' : 'none'}
                opacity="0.7"
              />
              )}
              {/* Arrow at the end of current route - only for non-'none' types */}
              {currentRoute.length >= 2 && selectedLineBreakType !== 'none' && (() => {
                const lastPoint = currentRoute[currentRoute.length - 1];
                
                // Find the last significant movement segment
                let startIndex = currentRoute.length - 2;
                let secondLastPoint = currentRoute[startIndex];
                
                // Find the last significant movement (at least 10 pixels)
                while (startIndex > 0) {
                  const dx = lastPoint.x - secondLastPoint.x;
                  const dy = lastPoint.y - secondLastPoint.y;
                  const distance = Math.sqrt(dx * dx + dy * dy);
                  
                  if (distance >= 10) {
                    break; // Found a significant segment
                  }
                  
                  startIndex--;
                  secondLastPoint = currentRoute[startIndex];
                }
                
                const angle = Math.atan2(secondLastPoint.y - lastPoint.y, secondLastPoint.x - lastPoint.x);
                const arrowLength = 20; // Larger arrow
                const arrowX = lastPoint.x + Math.cos(angle) * arrowLength;
                const arrowY = lastPoint.y + Math.sin(angle) * arrowLength;
                
                return (
                  <polygon
                    points={`${lastPoint.x},${lastPoint.y} ${arrowX - Math.cos(angle - 0.6) * 12},${arrowY - Math.sin(angle - 0.6) * 12} ${arrowX - Math.cos(angle + 0.6) * 12},${arrowY - Math.sin(angle + 0.6) * 12}`}
                    fill="black"
                    opacity="0.7"
                  />
                );
              })()}
            </svg>
          )}

          {/* Selection Box */}
          {selectionBox && (
            <div
              className="absolute border-2 border-blue-500 pointer-events-none"
              style={{
                left: `${Math.min(selectionBox.startX, selectionBox.endX)}px`,
                top: `${Math.min(selectionBox.startY, selectionBox.endY)}px`,
                width: `${Math.abs(selectionBox.endX - selectionBox.startX)}px`,
                height: `${Math.abs(selectionBox.endY - selectionBox.startY)}px`,
                backgroundColor: 'rgba(59, 130, 246, 0.1)', // Light blue with low opacity
                zIndex: 1000
              }}
            />
          )}

          {/* Delete Selected Items Button - Floating Action Button */}
          {((selectedItems.players?.length || 0) > 0 || (selectedItems.routes?.length || 0) > 0 || (selectedItems.textBoxes?.length || 0) > 0 || (selectedItems.circles?.length || 0) > 0 || (selectedItems.footballs?.length || 0) > 0) && (
            <div
              className="fixed bottom-6 right-6 z-[100] pointer-events-auto"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
              onTouchStart={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
              data-delete-button
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  console.log('Delete button clicked, selectedItems:', selectedItems);
                  deleteSelectedItems();
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                }}
                onTouchStart={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  console.log('Delete button touched, selectedItems:', selectedItems);
                  deleteSelectedItems();
                }}
                className="bg-red-500 hover:bg-red-600 active:bg-red-700 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 transition-all transform hover:scale-105 pointer-events-auto font-medium"
                title="Delete selected items"
                data-delete-button
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span className="hidden md:inline">Delete Selected</span>
              </button>
            </div>
          )}

          {/* Players */}
          {[...players, ...defensivePlayers].map((player) => {
            const colorOption = player.type === 'defense' 
              ? (player.color === 'purple' 
                  ? { name: 'purple', color: 'bg-purple-500', label: 'D' }
                  : { name: 'grey', color: 'bg-gray-500', label: 'D' })
              : colors.find(c => c.name === player.color);
            const animatedPosition = getAnimatedPlayerPosition(player);
            const isSelected = selectedItems.players.includes(player.id);
            
            return (
              <div
                key={player.id}
                data-player={player.id}
                className={`absolute w-12 h-12 rounded-full ${colorOption?.color || 'bg-gray-500'} transform -translate-x-1/2 -translate-y-1/2 ${
                  isSelected ? 'border-4 border-blue-500 ring-4 ring-blue-300' : ''
                } ${
                  mode === 'erase' && !isAnimating ? 'cursor-pointer' : 
                  !isAnimating ? 'cursor-move' : 'cursor-pointer'
                } hover:scale-110 transition-transform flex items-center justify-center`}
                style={{
                  left: animatedPosition.x,
                  top: animatedPosition.y,
                  zIndex: isSelected ? 4 : 3,
                  transition: isAnimating ? 'none' : 'all 0.1s ease-out',
                  touchAction: selectedRouteStyle ? 'auto' : 'none', // Allow touch events to pass through when route drawing, prevent scrolling when dragging
                  WebkitTouchCallout: 'none', // Prevent iOS long-press menu
                  WebkitUserSelect: 'none', // Prevent text selection on drag
                  userSelect: 'none'
                }}
                onMouseDown={(e) => !isAnimating && handlePlayerMouseDown(e, player.id)}
                onTouchStart={(e) => {
                  // If route drawing is active, don't handle player touch - let canvas handle it
                  if (selectedRouteStyle) {
                    return;
                  }
                  e.stopPropagation();
                  if (!isAnimating) {
                    handlePlayerMouseDown(e, player.id);
                  }
                }}
                onTouchMove={(e) => {
                  // Prevent scrolling when dragging player
                  if (draggedPlayer === player.id) {
                    e.preventDefault();
                  }
                }}
                onClick={(e) => !isAnimating && handlePlayerClick(e, player.id)}
              >
                {colorOption?.label && (
                  <span className="text-white text-xs font-bold">
                    {colorOption.label}
                  </span>
                )}
                {/* Delete button for selected players - visible on mobile or when selected */}
                {isSelected && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      deleteSingleItem('player', player.id);
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                    }}
                    onTouchStart={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      deleteSingleItem('player', player.id);
                    }}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg z-50 pointer-events-auto"
                    title="Delete player"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            );
          })}

          {/* Text Boxes */}
          {textBoxes.map((textBox) => {
            const isSelected = selectedItems.textBoxes.includes(textBox.id);
            return (
            <div
              key={textBox.id}
              data-textbox={textBox.id}
              className={`absolute transform -translate-x-1/2 -translate-y-1/2 ${
                mode === 'erase' ? 'cursor-pointer' : 'cursor-move'
              }`}
              style={{
                left: textBox.x,
                top: textBox.y,
                fontSize: textBox.fontSize,
                color: textBox.color,
                zIndex: 3,
                touchAction: selectedRouteStyle ? 'auto' : 'none',
                WebkitTouchCallout: 'none',
                WebkitUserSelect: 'none',
                userSelect: 'none'
              }}
              onMouseDown={(e) => handleTextBoxMouseDown(e, textBox.id)}
              onTouchStart={(e) => {
                // If route drawing is active, don't handle textbox touch
                if (selectedRouteStyle) {
                  return;
                }
                e.stopPropagation();
                e.preventDefault();
                handleTextBoxMouseDown(e, textBox.id);
              }}
              onTouchMove={(e) => {
                if (draggedTextBox === textBox.id) {
                  e.preventDefault();
                }
              }}
              onClick={(e) => handleTextBoxClick(e, textBox.id)}
            >
              {editingTextBox === textBox.id ? (
                <input
                  type="text"
                  value={textBox.text}
                  onChange={(e) => handleTextBoxTextChange(textBox.id, e.target.value)}
                  onBlur={() => setEditingTextBox(null)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setEditingTextBox(null);
                    }
                  }}
                  className="bg-transparent border-none outline-none text-center"
                  style={{ fontSize: textBox.fontSize, color: textBox.color }}
                  autoFocus
                />
              ) : (
                <div className={`relative bg-white bg-opacity-80 px-2 py-1 rounded border-2 shadow-sm ${
                  isSelected ? 'border-blue-500 ring-2 ring-blue-300' : 'border-gray-300'
                }`}>
                  {textBox.text}
                  {/* Delete button for selected text boxes */}
                  {isSelected && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        deleteSingleItem('textbox', textBox.id);
                      }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                      }}
                      onTouchStart={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        deleteSingleItem('textbox', textBox.id);
                      }}
                      className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg z-50 pointer-events-auto"
                      title="Delete text box"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              )}
            </div>
            );
          })}

          {/* Circles */}
          {circles.map((circle) => {
            const isSelected = selectedItems.circles.includes(circle.id);
            return (
            <div
              key={circle.id}
              data-circle={circle.id}
              className={`absolute transform -translate-x-1/2 -translate-y-1/2 ${
                mode === 'erase' ? 'cursor-pointer' : 'cursor-move'
              }`}
              style={{
                left: circle.x,
                top: circle.y,
                width: `${circle.radius * 2}px`,
                height: `${circle.radius * 2}px`,
                zIndex: 3,
                touchAction: selectedRouteStyle ? 'auto' : 'none',
                WebkitTouchCallout: 'none',
                WebkitUserSelect: 'none',
                userSelect: 'none'
              }}
              onMouseDown={(e) => handleCircleMouseDown(e, circle.id)}
              onTouchStart={(e) => {
                // If route drawing is active, don't handle circle touch
                if (selectedRouteStyle) {
                  return;
                }
                e.stopPropagation();
                e.preventDefault();
                handleCircleMouseDown(e, circle.id);
              }}
              onTouchMove={(e) => {
                if (draggedCircle === circle.id) {
                  e.preventDefault();
                }
              }}
            >
              <div
                className={`relative rounded-full ${
                  isSelected ? 'ring-4 ring-blue-300' : ''
                }`}
                style={{
                  width: '100%',
                  height: '100%',
                  backgroundColor: circle.color,
                  border: isSelected ? '3px solid blue' : 'none'
                }}
              >
                {/* Delete button for selected circles */}
                {isSelected && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      deleteSingleItem('circle', circle.id);
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                    }}
                    onTouchStart={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      deleteSingleItem('circle', circle.id);
                    }}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg z-50 pointer-events-auto"
                    title="Delete circle"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
            );
          })}

          {/* Footballs */}
          {footballs && footballs.map((football) => {
            const isSelected = selectedItems.footballs.includes(football.id);
            return (
            <div
              key={football.id}
              data-football={football.id}
              className={`absolute transform -translate-x-1/2 -translate-y-1/2 ${
                mode === 'erase' ? 'cursor-pointer' : 'cursor-move'
              }`}
              style={{
                left: football.x,
                top: football.y,
                width: `${football.size}px`,
                height: `${football.size}px`,
                zIndex: 3,
                touchAction: selectedRouteStyle ? 'auto' : 'none',
                WebkitTouchCallout: 'none',
                WebkitUserSelect: 'none',
                userSelect: 'none'
              }}
              onMouseDown={(e) => handleFootballMouseDown(e, football.id)}
              onTouchStart={(e) => {
                // If route drawing is active, don't handle football touch
                if (selectedRouteStyle) {
                  return;
                }
                e.stopPropagation();
                e.preventDefault();
                handleFootballMouseDown(e, football.id);
              }}
              onTouchMove={(e) => {
                if (draggedFootball === football.id) {
                  e.preventDefault();
                }
              }}
            >
              <div className="relative">
                <img
                  src="/svgs/american-football.svg"
                  alt="Football"
                  width={football.size}
                  height={football.size}
                  className={isSelected ? 'ring-4 ring-blue-300' : ''}
                  style={{
                    objectFit: 'contain'
                  }}
                />
                {/* Delete button for selected footballs */}
                {isSelected && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      deleteSingleItem('football', football.id);
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                    }}
                    onTouchStart={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      deleteSingleItem('football', football.id);
                    }}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg z-50 pointer-events-auto"
                    title="Delete football"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
            );
          })}

        </div>
          </div>

          {/* Bottom Toolbar: Player Icons (left) and Route Tools (right) */}
          <div className="bg-white border-t border-gray-200 flex flex-row flex-shrink-0 px-6 py-4">
            {/* Left Side: Player Icons in 2 rows */}
            <div className="flex-1 flex flex-col justify-center items-center gap-1.5">
              <div className="flex justify-between items-center w-full px-8">
                {colors.slice(0, Math.ceil(colors.length / 2)).map((colorOption) => (
                  <div
                    key={colorOption.name}
                    className={`w-12 h-12 rounded-full ${colorOption.color} cursor-pointer hover:scale-105 transition-transform flex items-center justify-center relative flex-shrink-0 border-0`}
                    onClick={() => {
                      setSelectedColor(colorOption.name);
                      addPlayerToCanvas(colorOption.name);
                    }}
                  >
                    {colorOption.label && (
                      <span className="text-white text-xs font-bold">
                        {colorOption.label}
                      </span>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center w-full px-8">
                {colors.slice(Math.ceil(colors.length / 2)).map((colorOption) => (
                  <div
                    key={colorOption.name}
                    className={`w-12 h-12 rounded-full ${colorOption.color} cursor-pointer hover:scale-105 transition-transform flex items-center justify-center relative flex-shrink-0 border-0`}
                    onClick={() => {
                      setSelectedColor(colorOption.name);
                      addPlayerToCanvas(colorOption.name);
                    }}
                  >
                    {colorOption.label && (
                      <span className="text-white text-xs font-bold">
                        {colorOption.label}
                      </span>
                    )}
                  </div>
                ))}
                <button
                  onClick={addAllPlayersToCanvas}
                  disabled={players.length > 0}
                  className={`w-12 h-12 rounded flex items-center justify-center text-xs font-medium transition-transform border-0 ${
                    players.length > 0
                      ? 'bg-gray-50 text-gray-400 cursor-not-allowed opacity-50'
                      : 'bg-blue-500 hover:bg-blue-600 cursor-pointer text-white hover:scale-105'
                  }`}
                  title={players.length > 0 ? "Clear canvas first to add all positions" : "Add All Positions"}
                >
                  <span className="text-[10px] leading-tight">Add All</span>
                </button>
              </div>
            </div>

            {/* Right Side: Route Tools (1/3 width) */}
            <div className="w-1/3 border-l border-gray-200 pl-6">
              <div className="flex flex-col gap-1">
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    className={`w-12 h-12 rounded flex items-center justify-center transition-colors flex-shrink-0 border-0 ${
                      selectedRouteStyle === 'solid' && selectedLineBreakType === 'rigid'
                        ? 'bg-gray-50'
                        : ''
                    }`}
                    onClick={() => {
                      setSelectedRouteStyle('solid');
                      setSelectedLineBreakType('rigid');
                    }}
                    title="Solid Line - Sharp Turns"
                  >
                    <svg className="w-10 h-10" viewBox="0 0 50 50" fill="none">
                      {renderRouteButtonIcon(routeButtonIcons['solid-rigid'])}
                    </svg>
                  </button>
                  <button
                    className={`w-12 h-12 rounded flex items-center justify-center transition-colors flex-shrink-0 border-0 ${
                      selectedRouteStyle === 'solid' && selectedLineBreakType === 'smooth'
                        ? 'bg-gray-50'
                        : ''
                    }`}
                    onClick={() => {
                      setSelectedRouteStyle('solid');
                      setSelectedLineBreakType('smooth');
                    }}
                    title="Solid Line - Curved Turns"
                  >
                    <svg className="w-10 h-10" viewBox="0 0 50 50" fill="none">
                      {renderRouteButtonIcon(routeButtonIcons['solid-smooth'])}
                    </svg>
                  </button>
                  <button
                    className={`w-12 h-12 rounded flex items-center justify-center transition-colors flex-shrink-0 border-0 ${
                      selectedRouteStyle === 'dashed' && selectedLineBreakType === 'rigid'
                        ? 'bg-gray-50'
                        : ''
                    }`}
                    onClick={() => {
                      setSelectedRouteStyle('dashed');
                      setSelectedLineBreakType('rigid');
                    }}
                    title="Dashed Line - Sharp Turns"
                  >
                    <svg className="w-10 h-10" viewBox="0 0 50 50" fill="none">
                      {renderRouteButtonIcon(routeButtonIcons['dashed-rigid'])}
                    </svg>
                  </button>
                  <button
                    className={`w-12 h-12 rounded flex items-center justify-center transition-colors flex-shrink-0 border-0 ${
                      selectedRouteStyle === 'dashed' && selectedLineBreakType === 'smooth'
                        ? 'bg-gray-50'
                        : ''
                    }`}
                    onClick={() => {
                      setSelectedRouteStyle('dashed');
                      setSelectedLineBreakType('smooth');
                    }}
                    title="Dashed Line - Curved Turns"
                  >
                    <svg className="w-10 h-10" viewBox="0 0 50 50" fill="none">
                      {renderRouteButtonIcon(routeButtonIcons['dashed-smooth'])}
                    </svg>
                  </button>
                  <button
                    className={`w-12 h-12 rounded flex items-center justify-center transition-colors flex-shrink-0 border-0 ${
                      selectedRouteStyle === 'dashed' && selectedLineBreakType === 'none'
                        ? 'bg-gray-50'
                        : ''
                    }`}
                    onClick={() => {
                      setSelectedRouteStyle('dashed');
                      setSelectedLineBreakType('none');
                    }}
                    title="Dashed Line - Straight, No Arrow (Pre-play Motion)"
                  >
                    <svg className="w-10 h-10" viewBox="0 0 50 50" fill="none">
                      <path d="M10 25 L40 25" stroke="black" strokeWidth="4" strokeDasharray="5,5" fill="none"/>
                    </svg>
                  </button>
                  <button
                    className={`w-12 h-12 rounded flex items-center justify-center transition-colors flex-shrink-0 border-0 ${
                      selectedRouteStyle === 'dashed' && selectedLineBreakType === 'smooth-none'
                        ? 'bg-gray-50'
                        : ''
                    }`}
                    onClick={() => {
                      setSelectedRouteStyle('dashed');
                      setSelectedLineBreakType('smooth-none');
                    }}
                    title="Dashed Line - Smooth Curves, No Arrow"
                  >
                    <svg className="w-10 h-10" viewBox="0 0 50 50" fill="none">
                      <path d="M10 35 L20 35 Q25 35 25 30 Q25 25 30 20" stroke="black" strokeWidth="4" strokeDasharray="5,5" fill="none"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Play Notes Section - Mobile Only (Below Canvas) */}
      <div className="md:hidden bg-white border-t border-gray-200 p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Play Notes
        </label>
        <textarea
          value={playNotes}
          onChange={(e) => setPlayNotes(e.target.value)}
          placeholder="QB fakes handoff to Y..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm text-gray-900 placeholder:text-gray-500"
          rows={4}
        />
      </div>
      </div>

      {/* Right Sidebar - Quick Adds Only */}
      <div className="hidden md:flex bg-white flex-col flex-shrink-0 min-h-0 overflow-y-auto" style={{ width: '25%' }}>
        {/* Quick Adds Section */}
        <div className="px-4 py-3 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Quick adds</h2>
          <div className="grid grid-cols-2 gap-0" style={{ gridTemplateRows: 'repeat(4, 1fr)' }}>
            {/* Slant Route */}
            <button
              onClick={() => addStandardRoute('slant')}
              className="border border-gray-300 bg-white hover:bg-gray-50 transition-colors cursor-pointer flex items-center justify-center aspect-square"
              title="Slant Route"
            >
              <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
                {(() => {
                  const routeData = defaultRouteData.slant;
                  // Normalize route points to fit in 0-100 viewBox
                  const allX = routeData.points.map(p => p.x);
                  const allY = routeData.points.map(p => p.y);
                  const minX = Math.min(...allX);
                  const maxX = Math.max(...allX);
                  const minY = Math.min(...allY);
                  const maxY = Math.max(...allY);
                  const width = maxX - minX || 1;
                  const height = maxY - minY || 1;
                  const padding = 10;
                  const scaleX = (100 - padding * 2) / width;
                  const scaleY = (100 - padding * 2) / height;
                  const scale = Math.min(scaleX, scaleY);
                  const offsetX = (100 - width * scale) / 2 - minX * scale;
                  const offsetY = (100 - height * scale) / 2 - minY * scale;
                  
                  const normalizedPoints = routeData.points.map(p => ({
                    x: p.x * scale + offsetX,
                    y: p.y * scale + offsetY
                  }));
                  
                  // Check if we should show arrow and calculate stop point
                  const shouldShowArrow = routeData.lineBreakType !== 'none' && routeData.lineBreakType !== 'smooth-none';
                  let pathPoints = normalizedPoints;
                  
                  if (shouldShowArrow && normalizedPoints.length >= 2) {
                    const lastPoint = normalizedPoints[normalizedPoints.length - 1];
                    const secondLastPoint = normalizedPoints[normalizedPoints.length - 2];
                    const dx = lastPoint.x - secondLastPoint.x;
                    const dy = lastPoint.y - secondLastPoint.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    const arrowGap = 6;
                    const stopDistance = Math.max(0, distance - arrowGap);
                    const stopRatio = distance > 0 ? stopDistance / distance : 0;
                    
                    const arrowStopPoint = {
                      x: secondLastPoint.x + dx * stopRatio,
                      y: secondLastPoint.y + dy * stopRatio
                    };
                    
                    pathPoints = normalizedPoints.slice(0, -1);
                    pathPoints.push(arrowStopPoint);
                  }
                  
                  return (
                    <>
                      <path
                        d={(() => {
                          if (routeData.lineBreakType === 'smooth' || routeData.lineBreakType === 'smooth-none') {
                            if (pathPoints.length < 2) return '';
                            if (pathPoints.length === 2) {
                              return `M ${pathPoints[0].x} ${pathPoints[0].y} L ${pathPoints[1].x} ${pathPoints[1].y}`;
                            }
                            let path = `M ${pathPoints[0].x} ${pathPoints[0].y}`;
                            for (let i = 1; i < pathPoints.length; i++) {
                              if (i < pathPoints.length - 1) {
                                const curr = pathPoints[i];
                                const next = pathPoints[i + 1];
                                const controlX = (curr.x + next.x) / 2;
                                const controlY = (curr.y + next.y) / 2;
                                path += ` Q ${curr.x} ${curr.y} ${controlX} ${controlY}`;
                              } else {
                                path += ` L ${pathPoints[i].x} ${pathPoints[i].y}`;
                              }
                            }
                            return path;
                          } else {
                            return `M ${pathPoints.map(p => `${p.x},${p.y}`).join(' L ')}`;
                          }
                        })()}
                        stroke="black"
                        strokeWidth="2"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeDasharray={routeData.style === 'dashed' ? '4,2' : 'none'}
                      />
                      {shouldShowArrow && normalizedPoints.length >= 2 && (
                        (() => {
                          const lastPoint = normalizedPoints[normalizedPoints.length - 1];
                          const secondLastPoint = normalizedPoints[normalizedPoints.length - 2];
                          const dx = lastPoint.x - secondLastPoint.x;
                          const dy = lastPoint.y - secondLastPoint.y;
                          const angle = Math.atan2(dy, dx);
                          const arrowLength = 8;
                          const arrowWidth = 4;
                          const arrowX = lastPoint.x - Math.cos(angle) * arrowLength;
                          const arrowY = lastPoint.y - Math.sin(angle) * arrowLength;
                          return (
                            <polygon
                              points={`${lastPoint.x},${lastPoint.y} ${arrowX - Math.cos(angle - Math.PI / 2) * arrowWidth},${arrowY - Math.sin(angle - Math.PI / 2) * arrowWidth} ${arrowX - Math.cos(angle + Math.PI / 2) * arrowWidth},${arrowY - Math.sin(angle + Math.PI / 2) * arrowWidth}`}
                              fill="black"
                            />
                          );
                        })()
                      )}
                    </>
                  );
                })()}
              </svg>
            </button>
            
            {/* Post Route */}
            <button
              onClick={() => addStandardRoute('post')}
              className="border border-gray-300 bg-white hover:bg-gray-50 transition-colors cursor-pointer flex items-center justify-center aspect-square"
              title="Post Route"
            >
              <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
                {(() => {
                  const routeData = defaultRouteData.post;
                  // Normalize route points to fit in 0-100 viewBox
                  const allX = routeData.points.map(p => p.x);
                  const allY = routeData.points.map(p => p.y);
                  const minX = Math.min(...allX);
                  const maxX = Math.max(...allX);
                  const minY = Math.min(...allY);
                  const maxY = Math.max(...allY);
                  const width = maxX - minX || 1;
                  const height = maxY - minY || 1;
                  const padding = 10;
                  const scaleX = (100 - padding * 2) / width;
                  const scaleY = (100 - padding * 2) / height;
                  const scale = Math.min(scaleX, scaleY);
                  const offsetX = (100 - width * scale) / 2 - minX * scale;
                  const offsetY = (100 - height * scale) / 2 - minY * scale;
                  
                  const normalizedPoints = routeData.points.map(p => ({
                    x: p.x * scale + offsetX,
                    y: p.y * scale + offsetY
                  }));
                  
                  // Check if we should show arrow and calculate stop point
                  const shouldShowArrow = routeData.lineBreakType !== 'none' && routeData.lineBreakType !== 'smooth-none';
                  let pathPoints = normalizedPoints;
                  
                  if (shouldShowArrow && normalizedPoints.length >= 2) {
                    const lastPoint = normalizedPoints[normalizedPoints.length - 1];
                    const secondLastPoint = normalizedPoints[normalizedPoints.length - 2];
                    const dx = lastPoint.x - secondLastPoint.x;
                    const dy = lastPoint.y - secondLastPoint.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    const arrowGap = 6;
                    const stopDistance = Math.max(0, distance - arrowGap);
                    const stopRatio = distance > 0 ? stopDistance / distance : 0;
                    
                    const arrowStopPoint = {
                      x: secondLastPoint.x + dx * stopRatio,
                      y: secondLastPoint.y + dy * stopRatio
                    };
                    
                    pathPoints = normalizedPoints.slice(0, -1);
                    pathPoints.push(arrowStopPoint);
                  }
                  
                  return (
                    <>
                      <path
                        d={(() => {
                          if (routeData.lineBreakType === 'smooth' || routeData.lineBreakType === 'smooth-none') {
                            if (pathPoints.length < 2) return '';
                            if (pathPoints.length === 2) {
                              return `M ${pathPoints[0].x} ${pathPoints[0].y} L ${pathPoints[1].x} ${pathPoints[1].y}`;
                            }
                            let path = `M ${pathPoints[0].x} ${pathPoints[0].y}`;
                            for (let i = 1; i < pathPoints.length; i++) {
                              if (i < pathPoints.length - 1) {
                                const curr = pathPoints[i];
                                const next = pathPoints[i + 1];
                                const controlX = (curr.x + next.x) / 2;
                                const controlY = (curr.y + next.y) / 2;
                                path += ` Q ${curr.x} ${curr.y} ${controlX} ${controlY}`;
                              } else {
                                path += ` L ${pathPoints[i].x} ${pathPoints[i].y}`;
                              }
                            }
                            return path;
                          } else {
                            return `M ${pathPoints.map(p => `${p.x},${p.y}`).join(' L ')}`;
                          }
                        })()}
                        stroke="black"
                        strokeWidth="2"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeDasharray={routeData.style === 'dashed' ? '4,2' : 'none'}
                      />
                      {shouldShowArrow && normalizedPoints.length >= 2 && (
                        (() => {
                          const lastPoint = normalizedPoints[normalizedPoints.length - 1];
                          const secondLastPoint = normalizedPoints[normalizedPoints.length - 2];
                          const dx = lastPoint.x - secondLastPoint.x;
                          const dy = lastPoint.y - secondLastPoint.y;
                          const angle = Math.atan2(dy, dx);
                          const arrowLength = 8;
                          const arrowWidth = 4;
                          const arrowX = lastPoint.x - Math.cos(angle) * arrowLength;
                          const arrowY = lastPoint.y - Math.sin(angle) * arrowLength;
                          return (
                            <polygon
                              points={`${lastPoint.x},${lastPoint.y} ${arrowX - Math.cos(angle - Math.PI / 2) * arrowWidth},${arrowY - Math.sin(angle - Math.PI / 2) * arrowWidth} ${arrowX - Math.cos(angle + Math.PI / 2) * arrowWidth},${arrowY - Math.sin(angle + Math.PI / 2) * arrowWidth}`}
                              fill="black"
                            />
                          );
                        })()
                      )}
                    </>
                  );
                })()}
              </svg>
            </button>
            
            {/* Hitch Route */}
            <button
              onClick={() => addStandardRoute('hitch')}
              className="border border-gray-300 bg-white hover:bg-gray-50 transition-colors cursor-pointer flex items-center justify-center aspect-square"
              title="Hitch Route"
            >
              <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
                {(() => {
                  const routeData = defaultRouteData['hitch'];
                  if (!routeData || routeData.points.length < 2) return null;
                  
                  // Normalize route points to fit in 0-100 viewBox
                  const allX = routeData.points.map(p => p.x);
                  const allY = routeData.points.map(p => p.y);
                  const minX = Math.min(...allX);
                  const maxX = Math.max(...allX);
                  const minY = Math.min(...allY);
                  const maxY = Math.max(...allY);
                  const width = maxX - minX || 1;
                  const height = maxY - minY || 1;
                  const padding = 10;
                  const scaleX = (100 - padding * 2) / width;
                  const scaleY = (100 - padding * 2) / height;
                  const scale = Math.min(scaleX, scaleY);
                  const offsetX = (100 - width * scale) / 2 - minX * scale;
                  const offsetY = (100 - height * scale) / 2 - minY * scale;
                  
                  const normalizedPoints = routeData.points.map(p => ({
                    x: p.x * scale + offsetX,
                    y: p.y * scale + offsetY
                  }));
                  
                  // Check if we should show arrow and calculate stop point
                  const shouldShowArrow = routeData.lineBreakType !== 'none' && routeData.lineBreakType !== 'smooth-none';
                  let pathPoints = normalizedPoints;
                  let arrowStopPoint = normalizedPoints[normalizedPoints.length - 1];
                  
                  if (shouldShowArrow && normalizedPoints.length >= 2) {
                    const lastPoint = normalizedPoints[normalizedPoints.length - 1];
                    const secondLastPoint = normalizedPoints[normalizedPoints.length - 2];
                    const dx = lastPoint.x - secondLastPoint.x;
                    const dy = lastPoint.y - secondLastPoint.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    // Stop the line before the arrow (scaled for 100x100 viewBox)
                    const arrowGap = 6; // Gap before arrow in viewBox units
                    const stopDistance = Math.max(0, distance - arrowGap);
                    const stopRatio = distance > 0 ? stopDistance / distance : 0;
                    
                    arrowStopPoint = {
                      x: secondLastPoint.x + dx * stopRatio,
                      y: secondLastPoint.y + dy * stopRatio
                    };
                    
                    // Create path points with shortened last segment
                    pathPoints = normalizedPoints.slice(0, -1);
                    pathPoints.push(arrowStopPoint);
                  }
                  
                  return (
                    <>
                      <path
                        d={(() => {
                          if (routeData.lineBreakType === 'smooth' || routeData.lineBreakType === 'smooth-none') {
                            // Generate smooth path
                            if (pathPoints.length < 2) return '';
                            if (pathPoints.length === 2) {
                              return `M ${pathPoints[0].x} ${pathPoints[0].y} L ${pathPoints[1].x} ${pathPoints[1].y}`;
                            }
                            let path = `M ${pathPoints[0].x} ${pathPoints[0].y}`;
                            for (let i = 1; i < pathPoints.length; i++) {
                              if (i < pathPoints.length - 1) {
                                const curr = pathPoints[i];
                                const next = pathPoints[i + 1];
                                const controlX = (curr.x + next.x) / 2;
                                const controlY = (curr.y + next.y) / 2;
                                path += ` Q ${curr.x} ${curr.y} ${controlX} ${controlY}`;
                              } else {
                                path += ` L ${pathPoints[i].x} ${pathPoints[i].y}`;
                              }
                            }
                            return path;
                          } else {
                            // Rigid path
                            if (pathPoints.length < 2) return '';
                            return `M ${pathPoints.map(p => `${p.x} ${p.y}`).join(' L ')}`;
                          }
                        })()}
                        stroke={routeData.color || 'black'}
                        strokeWidth="4"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeDasharray={routeData.style === 'dashed' ? '4,4' : 'none'}
                      />
                      {shouldShowArrow && normalizedPoints.length >= 2 && (() => {
                        const lastPoint = normalizedPoints[normalizedPoints.length - 1];
                        const secondLastPoint = normalizedPoints[normalizedPoints.length - 2];
                        const dx = lastPoint.x - secondLastPoint.x;
                        const dy = lastPoint.y - secondLastPoint.y;
                        const angle = Math.atan2(dy, dx);
                        const arrowLength = 8;
                        const arrowWidth = 4;
                        const arrowX = lastPoint.x - Math.cos(angle) * arrowLength;
                        const arrowY = lastPoint.y - Math.sin(angle) * arrowLength;
                        return (
                          <polygon
                            points={`${lastPoint.x},${lastPoint.y} ${arrowX - Math.cos(angle - Math.PI / 2) * arrowWidth},${arrowY - Math.sin(angle - Math.PI / 2) * arrowWidth} ${arrowX - Math.cos(angle + Math.PI / 2) * arrowWidth},${arrowY - Math.sin(angle + Math.PI / 2) * arrowWidth}`}
                            fill={routeData.color || 'black'}
                          />
                        );
                      })()}
                    </>
                  );
                })()}
              </svg>
            </button>
            
            {/* Corner Route */}
            <button
              onClick={() => addStandardRoute('corner')}
              className="border border-gray-300 bg-white hover:bg-gray-50 transition-colors cursor-pointer flex items-center justify-center aspect-square"
              title="Corner Route"
            >
              <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
                {(() => {
                  const routeData = defaultRouteData['corner'];
                  if (!routeData || routeData.points.length < 2) return null;
                  
                  // Normalize route points to fit in 0-100 viewBox
                  const allX = routeData.points.map(p => p.x);
                  const allY = routeData.points.map(p => p.y);
                  const minX = Math.min(...allX);
                  const maxX = Math.max(...allX);
                  const minY = Math.min(...allY);
                  const maxY = Math.max(...allY);
                  const width = maxX - minX || 1;
                  const height = maxY - minY || 1;
                  const padding = 10;
                  const scaleX = (100 - padding * 2) / width;
                  const scaleY = (100 - padding * 2) / height;
                  const scale = Math.min(scaleX, scaleY);
                  const offsetX = (100 - width * scale) / 2 - minX * scale;
                  const offsetY = (100 - height * scale) / 2 - minY * scale;
                  
                  const normalizedPoints = routeData.points.map(p => ({
                    x: p.x * scale + offsetX,
                    y: p.y * scale + offsetY
                  }));
                  
                  // Check if we should show arrow and calculate stop point
                  const shouldShowArrow = routeData.lineBreakType !== 'none' && routeData.lineBreakType !== 'smooth-none';
                  let pathPoints = normalizedPoints;
                  let arrowStopPoint = normalizedPoints[normalizedPoints.length - 1];
                  
                  if (shouldShowArrow && normalizedPoints.length >= 2) {
                    const lastPoint = normalizedPoints[normalizedPoints.length - 1];
                    const secondLastPoint = normalizedPoints[normalizedPoints.length - 2];
                    const dx = lastPoint.x - secondLastPoint.x;
                    const dy = lastPoint.y - secondLastPoint.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    // Stop the line before the arrow (scaled for 100x100 viewBox)
                    const arrowGap = 6; // Gap before arrow in viewBox units
                    const stopDistance = Math.max(0, distance - arrowGap);
                    const stopRatio = distance > 0 ? stopDistance / distance : 0;
                    
                    arrowStopPoint = {
                      x: secondLastPoint.x + dx * stopRatio,
                      y: secondLastPoint.y + dy * stopRatio
                    };
                    
                    // Create path points with shortened last segment
                    pathPoints = normalizedPoints.slice(0, -1);
                    pathPoints.push(arrowStopPoint);
                  }
                  
                  return (
                    <>
                      <path
                        d={(() => {
                          if (routeData.lineBreakType === 'smooth' || routeData.lineBreakType === 'smooth-none') {
                            // Generate smooth path
                            if (pathPoints.length < 2) return '';
                            if (pathPoints.length === 2) {
                              return `M ${pathPoints[0].x} ${pathPoints[0].y} L ${pathPoints[1].x} ${pathPoints[1].y}`;
                            }
                            let path = `M ${pathPoints[0].x} ${pathPoints[0].y}`;
                            for (let i = 1; i < pathPoints.length; i++) {
                              if (i < pathPoints.length - 1) {
                                const curr = pathPoints[i];
                                const next = pathPoints[i + 1];
                                const controlX = (curr.x + next.x) / 2;
                                const controlY = (curr.y + next.y) / 2;
                                path += ` Q ${curr.x} ${curr.y} ${controlX} ${controlY}`;
                              } else {
                                path += ` L ${pathPoints[i].x} ${pathPoints[i].y}`;
                              }
                            }
                            return path;
                          } else {
                            // Rigid path
                            if (pathPoints.length < 2) return '';
                            return `M ${pathPoints.map(p => `${p.x} ${p.y}`).join(' L ')}`;
                          }
                        })()}
                        stroke={routeData.color || 'black'}
                        strokeWidth="4"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeDasharray={routeData.style === 'dashed' ? '4,4' : 'none'}
                      />
                      {shouldShowArrow && normalizedPoints.length >= 2 && (() => {
                        const lastPoint = normalizedPoints[normalizedPoints.length - 1];
                        const secondLastPoint = normalizedPoints[normalizedPoints.length - 2];
                        const dx = lastPoint.x - secondLastPoint.x;
                        const dy = lastPoint.y - secondLastPoint.y;
                        const angle = Math.atan2(dy, dx);
                        const arrowLength = 8;
                        const arrowWidth = 4;
                        const arrowX = lastPoint.x - Math.cos(angle) * arrowLength;
                        const arrowY = lastPoint.y - Math.sin(angle) * arrowLength;
                        return (
                          <polygon
                            points={`${lastPoint.x},${lastPoint.y} ${arrowX - Math.cos(angle - Math.PI / 2) * arrowWidth},${arrowY - Math.sin(angle - Math.PI / 2) * arrowWidth} ${arrowX - Math.cos(angle + Math.PI / 2) * arrowWidth},${arrowY - Math.sin(angle + Math.PI / 2) * arrowWidth}`}
                            fill={routeData.color || 'black'}
                          />
                        );
                      })()}
                    </>
                  );
                })()}
              </svg>
            </button>
            
            {/* Custom route slots */}
            {customQuickAddRoutes.slice(4, 8).map((customRoute, index) => (
              <button
                key={index + 4}
                onClick={() => customRoute && addCustomRouteFromQuickAdds(index + 4)}
                className={`border border-gray-300 bg-white hover:bg-gray-50 transition-colors cursor-pointer flex items-center justify-center aspect-square ${
                  customRoute ? '' : 'opacity-50'
                }`}
                title={customRoute ? 'Click to add route' : 'Empty slot'}
                disabled={!customRoute}
              >
                {customRoute ? (
                  <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
                    {customRoute.points.length >= 2 && (() => {
                      // Normalize route points to fit in 0-100 viewBox
                      const allX = customRoute.points.map(p => p.x);
                      const allY = customRoute.points.map(p => p.y);
                      const minX = Math.min(...allX);
                      const maxX = Math.max(...allX);
                      const minY = Math.min(...allY);
                      const maxY = Math.max(...allY);
                      const width = maxX - minX || 1;
                      const height = maxY - minY || 1;
                      const padding = 10;
                      const scaleX = (100 - padding * 2) / width;
                      const scaleY = (100 - padding * 2) / height;
                      const scale = Math.min(scaleX, scaleY);
                      const offsetX = (100 - width * scale) / 2 - minX * scale;
                      const offsetY = (100 - height * scale) / 2 - minY * scale;
                      
                      const normalizedPoints = customRoute.points.map(p => ({
                        x: p.x * scale + offsetX,
                        y: p.y * scale + offsetY
                      }));
                      
                      // Check if we should show arrow and calculate stop point
                      const shouldShowArrow = customRoute.lineBreakType !== 'none' && customRoute.lineBreakType !== 'smooth-none';
                      let pathPoints = normalizedPoints;
                      let arrowStopPoint = normalizedPoints[normalizedPoints.length - 1];
                      
                      if (shouldShowArrow && normalizedPoints.length >= 2) {
                        const lastPoint = normalizedPoints[normalizedPoints.length - 1];
                        const secondLastPoint = normalizedPoints[normalizedPoints.length - 2];
                        const dx = lastPoint.x - secondLastPoint.x;
                        const dy = lastPoint.y - secondLastPoint.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        
                        // Stop the line before the arrow (scaled for 100x100 viewBox)
                        const arrowGap = 6; // Gap before arrow in viewBox units
                        const stopDistance = Math.max(0, distance - arrowGap);
                        const stopRatio = distance > 0 ? stopDistance / distance : 0;
                        
                        arrowStopPoint = {
                          x: secondLastPoint.x + dx * stopRatio,
                          y: secondLastPoint.y + dy * stopRatio
                        };
                        
                        // Create path points with shortened last segment
                        pathPoints = normalizedPoints.slice(0, -1);
                        pathPoints.push(arrowStopPoint);
                      }
                      
                      return (
                        <>
                          <path
                            d={(() => {
                              if (customRoute.lineBreakType === 'smooth' || customRoute.lineBreakType === 'smooth-none') {
                                // Generate smooth path
                                if (pathPoints.length < 2) return '';
                                if (pathPoints.length === 2) {
                                  return `M ${pathPoints[0].x} ${pathPoints[0].y} L ${pathPoints[1].x} ${pathPoints[1].y}`;
                                }
                                let path = `M ${pathPoints[0].x} ${pathPoints[0].y}`;
                                for (let i = 1; i < pathPoints.length; i++) {
                                  if (i < pathPoints.length - 1) {
                                    const curr = pathPoints[i];
                                    const next = pathPoints[i + 1];
                                    const controlX = (curr.x + next.x) / 2;
                                    const controlY = (curr.y + next.y) / 2;
                                    path += ` Q ${curr.x} ${curr.y} ${controlX} ${controlY}`;
                                  } else {
                                    path += ` L ${pathPoints[i].x} ${pathPoints[i].y}`;
                                  }
                                }
                                return path;
                              } else {
                                // Generate polyline path
                                return `M ${pathPoints.map(p => `${p.x},${p.y}`).join(' L ')}`;
                              }
                            })()}
                            stroke="black"
                            strokeWidth="2"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeDasharray={customRoute.style === 'dashed' ? '4,2' : 'none'}
                          />
                          {/* Arrow at the end if not 'none' or 'smooth-none' */}
                          {shouldShowArrow && normalizedPoints.length >= 2 && (
                            (() => {
                              const lastPoint = normalizedPoints[normalizedPoints.length - 1];
                              const secondLastPoint = normalizedPoints[normalizedPoints.length - 2];
                              // Calculate angle from second-to-last to last point (direction of travel)
                              const dx = lastPoint.x - secondLastPoint.x;
                              const dy = lastPoint.y - secondLastPoint.y;
                              const angle = Math.atan2(dy, dx);
                              // Arrow size scaled to viewBox (100x100)
                              const arrowLength = 8;
                              const arrowWidth = 4;
                              const arrowX = lastPoint.x - Math.cos(angle) * arrowLength;
                              const arrowY = lastPoint.y - Math.sin(angle) * arrowLength;
                              return (
                                <polygon
                                  points={`${lastPoint.x},${lastPoint.y} ${arrowX - Math.cos(angle - Math.PI / 2) * arrowWidth},${arrowY - Math.sin(angle - Math.PI / 2) * arrowWidth} ${arrowX - Math.cos(angle + Math.PI / 2) * arrowWidth},${arrowY - Math.sin(angle + Math.PI / 2) * arrowWidth}`}
                                  fill="black"
                                />
                              );
                            })()
                          )}
                        </>
                      );
                    })()}
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
      </div>

      {/* Color Picker */}
      {showColorPicker && colorPickerPosition && (
        <div
          className="fixed bg-white border border-gray-300 rounded-lg shadow-lg p-2 z-50"
          style={{
            left: `${colorPickerPosition.x}px`,
            top: `${colorPickerPosition.y}px`
          }}
        >
          <div className="grid grid-cols-3 gap-2">
            {colors.filter(c => c.name !== 'qb').map((colorOption) => (
              <button
                key={colorOption.name}
                onClick={() => {
                  if (selectedPlayerForColor) {
                    changePlayerColor(selectedPlayerForColor, colorOption.name);
                  }
                }}
                className={`w-10 h-10 rounded-full ${colorOption.color} border-2 border-gray-300 hover:scale-110 transition-transform flex items-center justify-center`}
                title={colorOption.name}
              >
                {colorOption.label && (
                  <span className="text-white text-xs font-bold">
                    {colorOption.label}
                  </span>
                )}
              </button>
            ))}
            {/* Trash Can Icon */}
            <button
              onClick={() => {
                if (selectedPlayerForColor) {
                  deletePlayerAndRoutes(selectedPlayerForColor);
                }
              }}
              className="w-10 h-10 rounded-full bg-red-500 border-2 border-red-600 hover:bg-red-600 hover:scale-110 transition-transform flex items-center justify-center"
              title="Delete player and routes"
            >
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
            {/* Add to Quick Adds Button - Show only if player has a route */}
            {selectedPlayerForColor && (playerRouteAssociations.get(selectedPlayerForColor) || []).length > 0 && (
              <>
                <button
                  onClick={() => {
                    if (selectedPlayerForColor) {
                      copyRouteToQuickAdds(selectedPlayerForColor);
                    }
                  }}
                  className="w-10 h-10 rounded-full bg-green-500 border-2 border-green-600 hover:bg-green-600 hover:scale-110 transition-transform flex items-center justify-center"
                  title="Add route to quick adds"
                >
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Click outside to close color picker */}
      {showColorPicker && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowColorPicker(false);
            setSelectedPlayerForColor(null);
          }}
        />
      )}

      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          {/* Subtle blur overlay - transparent background with just blur */}
          <div 
            className="absolute inset-0 backdrop-blur-sm"
            onClick={closeSaveDialog}
          ></div>
          {/* Modal content */}
          <div 
            className="relative bg-white rounded-lg shadow-xl p-6 w-96 max-w-md mx-4 border border-gray-200"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold mb-4 text-gray-900">
              {editingPlayId ? 'Update Play' : 'Save Play'}
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Play Name
                </label>
                <input
                  type="text"
                  value={playName}
                  onChange={(e) => setPlayName(e.target.value)}
                  placeholder="Enter play name..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder:text-gray-400"
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Folder
                </label>
                <select
                  value={selectedFolder}
                  onChange={(e) => {
                    if (e.target.value === 'CREATE_FOLDER') {
                      setShowCreateFolderInput(true);
                      setSelectedFolder('');
                    } else {
                      setSelectedFolder(e.target.value);
                      setShowCreateFolderInput(false);
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2 text-gray-900 bg-white"
                >
                  <option value="CREATE_FOLDER">Create Folder +</option>
                  <option value="">None (All Plays)</option>
                  {folders.map((folder) => (
                    <option key={folder.id} value={folder.id}>
                      {folder.name}
                    </option>
                  ))}
                </select>
                {showCreateFolderInput && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (newFolderName.trim()) {
                            const newFolder: Folder = {
                              id: Date.now().toString(),
                              name: newFolderName.trim(),
                              createdAt: new Date().toISOString()
                            };
                            const updatedFolders = [...folders, newFolder];
                            setFolders(updatedFolders);
                            const savedPlays = JSON.parse(localStorage.getItem('savedPlays') || '[]');
                            // Cloud-first: Save to Firestore if logged in, then localStorage
                            if (user) {
                              syncToCloud(savedPlays, updatedFolders).catch(console.error);
                            }
                            localStorage.setItem('playFolders', JSON.stringify(updatedFolders));
                            setSelectedFolder(newFolder.id);
                            setNewFolderName('');
                            setShowCreateFolderInput(false);
                          }
                        }
                      }}
                      placeholder="Enter folder name..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 placeholder:text-gray-400"
                      autoFocus
                    />
                    <button
                      onClick={() => {
                        if (newFolderName.trim()) {
                          const newFolder: Folder = {
                            id: Date.now().toString(),
                            name: newFolderName.trim(),
                            createdAt: new Date().toISOString()
                          };
                          const updatedFolders = [...folders, newFolder];
                          setFolders(updatedFolders);
                          const savedPlays = JSON.parse(localStorage.getItem('savedPlays') || '[]');
                          // Cloud-first: Save to Firestore if logged in, then localStorage
                          if (user) {
                            syncToCloud(savedPlays, updatedFolders).catch(console.error);
                          }
                          localStorage.setItem('playFolders', JSON.stringify(updatedFolders));
                          setSelectedFolder(newFolder.id);
                          setNewFolderName('');
                          setShowCreateFolderInput(false);
                        }
                      }}
                      className="px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors text-sm font-medium whitespace-nowrap"
                    >
                      Create
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={closeSaveDialog}
                className="px-4 py-2 text-sm font-medium text-gray-900 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={savePlay}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600 transition-colors"
              >
                {editingPlayId ? 'Update Play' : 'Save Play'}
              </button>
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
            <form className="space-y-4" onSubmit={handleLoginSubmit}>
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
      )}

      {/* Custom Alert */}
      {showAlert && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-right duration-300">
          <div className="bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-3 max-w-sm">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span className="text-sm font-medium">{alertMessage}</span>
            <button
              onClick={() => setShowAlert(false)}
              className="ml-2 text-white hover:text-gray-200 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Delete Folder Confirmation Modal */}
      {showDeleteFolderConfirm && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div 
            className="absolute inset-0 backdrop-blur-sm"
            onClick={() => setShowDeleteFolderConfirm(null)}
          ></div>
          <div 
            className="relative bg-white rounded-lg shadow-xl p-6 w-96 max-w-md mx-4 border border-gray-200"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold mb-4 text-gray-900">
              Delete Folder
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete this folder? All plays in this folder will be moved to &quot;All Plays&quot;.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteFolderConfirm(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (showDeleteFolderConfirm) {
                    deleteFolder(showDeleteFolderConfirm);
                  }
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
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
