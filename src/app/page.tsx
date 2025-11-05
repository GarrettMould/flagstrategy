'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

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

interface Folder {
  id: string;
  name: string;
  createdAt: string;
}

export default function Home() {
  const [selectedColor, setSelectedColor] = useState<string>('blue');
  const [players, setPlayers] = useState<Player[]>([]);
  const [mode, setMode] = useState<'add' | 'select' | 'route' | 'erase'>('add');
  const [draggedPlayer, setDraggedPlayer] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [showSaveDialog, setShowSaveDialog] = useState<boolean>(false);
  const [playName, setPlayName] = useState<string>('');
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
  const [animationSpeed] = useState<number>(200); // pixels per second
  const [showAlert, setShowAlert] = useState<boolean>(false);
  const [alertMessage, setAlertMessage] = useState<string>('');
  const [lastMouseMoveTime, setLastMouseMoveTime] = useState<number>(0);
  const [pauseThreshold] = useState<number>(500); // milliseconds to detect pause
  const [showTrashCan, setShowTrashCan] = useState<boolean>(false);
  const [draggedElement, setDraggedElement] = useState<{ type: 'player' | 'route' | 'textbox' | 'circle', id: string } | null>(null);
  const [playerRouteAssociations, setPlayerRouteAssociations] = useState<Map<string, string[]>>(new Map());
  const [defensiveFormation, setDefensiveFormation] = useState<'zone' | null>(null);
  const [defensivePlayers, setDefensivePlayers] = useState<Player[]>([]);
  const [originalPlayerPosition, setOriginalPlayerPosition] = useState<{ x: number; y: number } | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);
  const [originalPlayerRoutePositions, setOriginalPlayerRoutePositions] = useState<Map<string, { x: number; y: number }[]>>(new Map());
  const [lastPoint, setLastPoint] = useState<{ x: number; y: number } | null>(null);
  const [textBoxes, setTextBoxes] = useState<TextBox[]>([]);
  const [draggedTextBox, setDraggedTextBox] = useState<string | null>(null);
  const [editingTextBox, setEditingTextBox] = useState<string | null>(null);
  const [circles, setCircles] = useState<Circle[]>([]);
  const [draggedCircle, setDraggedCircle] = useState<string | null>(null);
  const [showColorPicker, setShowColorPicker] = useState<boolean>(false);
  const [selectedPlayerForColor, setSelectedPlayerForColor] = useState<string | null>(null);
  const [colorPickerPosition, setColorPickerPosition] = useState<{ x: number; y: number } | null>(null);
  const [hasDragged, setHasDragged] = useState<boolean>(false);
  const [history, setHistory] = useState<{ players: Player[], routes: Route[], textBoxes: TextBox[], circles: Circle[], playerRouteAssociations: Map<string, string[]> }[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [saveAnimation, setSaveAnimation] = useState<{ active: boolean; folderId: string | null; startX: number; startY: number; endX: number; endY: number } | null>(null);
  const [showDownloadDropdown, setShowDownloadDropdown] = useState<boolean>(false);
  const [openFolderMenu, setOpenFolderMenu] = useState<string | null>(null);
  const [showDeleteFolderConfirm, setShowDeleteFolderConfirm] = useState<string | null>(null);

  const showCustomAlert = (message: string) => {
    setAlertMessage(message);
    setShowAlert(true);
    setTimeout(() => {
      setShowAlert(false);
    }, 3000); // Auto-hide after 3 seconds
  };

  const saveToHistory = () => {
    const currentState = {
      players: [...players],
      routes: [...routes],
      textBoxes: [...textBoxes],
      circles: [...circles],
      playerRouteAssociations: new Map(playerRouteAssociations)
    };
    
    // Remove any history after current index
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(currentState);
    
    // Limit history to 50 states to prevent memory issues
    if (newHistory.length > 50) {
      newHistory.shift();
    } else {
      setHistoryIndex(historyIndex + 1);
    }
    
    setHistory(newHistory);
  };

  const undo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const state = history[newIndex];
      
      setPlayers([...state.players]);
      setRoutes([...state.routes]);
      setTextBoxes([...state.textBoxes]);
      setCircles([...(state.circles || [])]);
      setPlayerRouteAssociations(new Map(state.playerRouteAssociations));
      setHistoryIndex(newIndex);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      const state = history[newIndex];
      
      setPlayers([...state.players]);
      setRoutes([...state.routes]);
      setTextBoxes([...state.textBoxes]);
      setCircles([...(state.circles || [])]);
      setPlayerRouteAssociations(new Map(state.playerRouteAssociations));
      setHistoryIndex(newIndex);
    }
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
    const fieldWidth = window.innerWidth * 0.75 * 0.6; // 60% of the canvas area (75% of screen)
    const fieldHeight = fieldWidth / 0.92; // Height based on aspect ratio (slightly taller than wide)
    
    // Get offensive players to position defense against
    const offensivePlayers = players.filter(p => p.type === 'offense');
    
    if (offensivePlayers.length === 0) {
      showCustomAlert('Please add offensive players before creating defense!');
      return;
    }
    
    // Zone: Defensive players spread across the field
    const zonePositions = [
      { x: fieldWidth * 0.2, y: fieldHeight * 0.3 }, // Left side
      { x: fieldWidth * 0.4, y: fieldHeight * 0.2 }, // Left middle
      { x: fieldWidth * 0.6, y: fieldHeight * 0.2 }, // Right middle
      { x: fieldWidth * 0.8, y: fieldHeight * 0.3 }, // Right side
      { x: fieldWidth * 0.5, y: fieldHeight * 0.4 }  // Deep middle
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
      setPlayName(play.name);
      setSelectedFolder(play.folderId || '');
      setEditingPlayId(play.id);
      setMode('select');
      
      // Rebuild player-route associations for loaded play
      let associations: Map<string, string[]>;
      if (play.playerRouteAssociations) {
        // New format with saved associations
        associations = new Map(play.playerRouteAssociations);
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
      if (showDownloadDropdown && !target.closest('[data-download-dropdown]')) {
        setShowDownloadDropdown(false);
      }
      if (openFolderMenu && !target.closest('[data-folder-menu]')) {
        setOpenFolderMenu(null);
      }
    };

    if (showDownloadDropdown || openFolderMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showDownloadDropdown, openFolderMenu]);

  const colors = [
    { name: 'blue', color: 'bg-blue-500', label: 'X' },
    { name: 'red', color: 'bg-red-500', label: 'Z' },
    { name: 'green', color: 'bg-green-500', label: 'Y' },
    { name: 'yellow', color: 'bg-yellow-500', label: 'C' },
    { name: 'qb', color: 'bg-black', label: 'QB' },
  ];

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Deselect route if clicking on empty space
      setSelectedRoute(null);
      setDraggedElement(null);
      setShowTrashCan(false);
    
    // Only handle route drawing if route style is selected
    if (selectedRouteStyle) {
      console.log('Starting route drawing, selectedRouteStyle:', selectedRouteStyle);
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
        // Start a new route
        setCurrentRoute([{ x, y }]);
      setLastPoint({ x, y });
        setIsDrawingRoute(true);
        setLastMouseMoveTime(Date.now());
      console.log('Route started at:', x, y);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only handle route drawing if route is being drawn
    if (selectedRouteStyle && isDrawingRoute && currentRoute.length > 0) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
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

  const handleCanvasMouseUp = () => {
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

  const addPlayerToCanvas = (color: string) => {
    // Deselect route drawing if active
    if (selectedRouteStyle) {
      setSelectedRouteStyle(null);
      setSelectedLineBreakType(null);
      setIsDrawingRoute(false);
      setCurrentRoute([]);
    }
    
    // Calculate middle of field (50% width, 50% height for 50-yard line)
    const fieldWidth = window.innerWidth * 0.75 * 0.6; // 60% of the canvas area (75% of screen)
    const fieldHeight = fieldWidth / 0.92; // Height based on aspect ratio (slightly taller than wide)
    
    let middleY = fieldHeight / 2;
    
    // QB goes one line behind (one yard line back)
    if (color === 'qb') {
      middleY = fieldHeight / 2 + (fieldHeight * 0.1); // 10% of field height = 1 yard line
    }
    
    // Position based on color
    let positionX: number;
    switch (color) {
      case 'blue':
        positionX = fieldWidth * 0.2; // Left part
        break;
      case 'yellow':
        positionX = fieldWidth * 0.5; // Middle
        break;
      case 'green':
        positionX = fieldWidth * 0.65; // Right of middle
        break;
      case 'red':
        positionX = fieldWidth * 0.85; // Far right
        break;
      default:
        // For QB and other colors, use default spacing logic
    const existingPlayersOnSameLine = players.filter(p => 
      Math.abs(p.y - middleY) < fieldHeight * 0.05 // Within 5% of the same yard line
    );
    const spacing = 80; // 80px spacing between players
    const startX = fieldWidth / 2 - (existingPlayersOnSameLine.length * spacing) / 2;
        positionX = startX + (existingPlayersOnSameLine.length * spacing);
        break;
    }
    
    const newPlayer: Player = {
      id: Date.now().toString(),
      x: positionX,
      y: middleY,
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
    
    // Calculate field dimensions
    const fieldWidth = window.innerWidth * 0.75 * 0.6; // 60% of the canvas area (75% of screen)
    const fieldHeight = fieldWidth / 0.92; // Height based on aspect ratio
    
    const middleY = fieldHeight / 2;
    const qbY = fieldHeight / 2 + (fieldHeight * 0.1); // QB goes one line behind
    
    // Create all players at their default positions
    const newPlayers: Player[] = colors.map((colorOption, index) => {
      let positionX: number;
      let y: number;
      
      switch (colorOption.name) {
        case 'blue':
          positionX = fieldWidth * 0.2; // Left part
          y = middleY;
          break;
        case 'yellow':
          positionX = fieldWidth * 0.5; // Middle
          y = middleY;
          break;
        case 'green':
          positionX = fieldWidth * 0.65; // Right of middle
          y = middleY;
          break;
        case 'red':
          positionX = fieldWidth * 0.85; // Far right
          y = middleY;
          break;
        case 'qb':
          positionX = fieldWidth * 0.5; // Center
          y = qbY;
          break;
        default:
          positionX = fieldWidth * 0.5;
          y = middleY;
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

  const addStandardRoute = (routeType: 'slant' | 'post' | 'hitch' | 'corner') => {
    const fieldContainer = document.querySelector('.bg-white.relative.overflow-hidden');
    if (!fieldContainer) return;
    
    const rect = fieldContainer.getBoundingClientRect();
    const fieldWidth = rect.width;
    const fieldHeight = rect.height;
    
    // Calculate start position (far right for red player, at 50-yard line)
    const startX = fieldWidth * 0.85; // Far right, same as red positioning
    const startY = fieldHeight / 2;
    
    // Create red player at start position
    const newPlayer: Player = {
      id: Date.now().toString(),
      x: startX,
      y: startY,
      color: 'red',
      type: 'offense'
    };
    
    // Define route points based on route type
    let routePoints: { x: number; y: number }[] = [];
    const routeLength = 200; // Base route length
    
    switch (routeType) {
      case 'slant':
        // Slant: short diagonal forward
        routePoints = [
          { x: startX, y: startY },
          { x: startX + routeLength * 0.7, y: startY - routeLength * 0.6 }
        ];
        break;
      case 'post':
        // Post: forward then deep diagonal
        routePoints = [
          { x: startX, y: startY },
          { x: startX + routeLength * 0.3, y: startY - routeLength * 0.5 },
          { x: startX + routeLength * 0.9, y: startY - routeLength * 1.2 }
        ];
        break;
      case 'hitch':
        // Hitch: forward then back
        routePoints = [
          { x: startX, y: startY },
          { x: startX + routeLength * 0.5, y: startY - routeLength * 0.4 },
          { x: startX + routeLength * 0.5, y: startY - routeLength * 0.2 }
        ];
        break;
      case 'corner':
        // Corner: forward then sharp angle
        routePoints = [
          { x: startX, y: startY },
          { x: startX + routeLength * 0.6, y: startY - routeLength * 0.7 },
          { x: startX + routeLength, y: startY - routeLength * 0.4 }
        ];
        break;
    }
    
    // Create route
    const newRoute: Route = {
      id: Date.now().toString(),
      points: routePoints,
      style: 'solid',
      lineBreakType: routeType === 'hitch' ? 'smooth' : 'rigid',
      color: 'black',
      showArrow: true // Standard routes always have arrows
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

  const handleTextBoxMouseDown = (e: React.MouseEvent<HTMLDivElement>, textBoxId: string) => {
    if (mode === 'erase') {
      e.stopPropagation();
      setTextBoxes(prev => prev.filter(tb => tb.id !== textBoxId));
      setTimeout(() => saveToHistory(), 0);
    } else {
      e.stopPropagation();
      setDraggedTextBox(textBoxId);
      setDraggedElement({ type: 'textbox', id: textBoxId });
      setShowTrashCan(true);
      
      const rect = e.currentTarget.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left - 24,
        y: e.clientY - rect.top - 12
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
    
    // If we just dragged, don't show color picker
    if (hasDragged) {
      setHasDragged(false);
      return;
    }
    
    const player = players.find(p => p.id === playerId);
    if (!player) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    setColorPickerPosition({
      x: rect.right + 10,
      y: rect.top
    });
    setSelectedPlayerForColor(playerId);
    setShowColorPicker(true);
  };

  const handleCircleMouseDown = (e: React.MouseEvent<HTMLDivElement>, circleId: string) => {
    if (mode === 'erase') {
      e.stopPropagation();
      setCircles(prev => prev.filter(c => c.id !== circleId));
      setTimeout(() => saveToHistory(), 0);
    } else {
      e.stopPropagation();
      setDraggedCircle(circleId);
      setDraggedElement({ type: 'circle', id: circleId });
      setShowTrashCan(true);
      
      const rect = e.currentTarget.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left - 8,
        y: e.clientY - rect.top - 8
      });
    }
  };

  const handlePlayerMouseDown = (e: React.MouseEvent<HTMLDivElement>, playerId: string) => {
    if (mode === 'erase') {
      e.stopPropagation();
      // Delete the player and its associated routes
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
      
      // Save state after deleting player (use setTimeout to ensure state is updated)
      setTimeout(() => saveToHistory(), 0);
    } else {
      // Always allow dragging when not in erase mode
      e.stopPropagation();
      setHasDragged(false); // Reset drag flag
      setDraggedPlayer(playerId);
      setDraggedElement({ type: 'player', id: playerId });
      setShowTrashCan(true);
      
      // Store original position for route movement calculation
      const player = players.find(p => p.id === playerId);
      if (player) {
        setOriginalPlayerPosition({ x: player.x, y: player.y });
        
        // Store original positions of associated routes
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
      
      const rect = e.currentTarget.getBoundingClientRect();
      // Calculate offset from the center of the player icon (24px is half of 48px)
      setDragOffset({
        x: e.clientX - rect.left - 24,
        y: e.clientY - rect.top - 24
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (draggedPlayer) {
      setHasDragged(true); // Mark that we're dragging
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left - dragOffset.x;
      const y = e.clientY - rect.top - dragOffset.y;
      
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
    } else if (draggedTextBox) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left - dragOffset.x;
      const y = e.clientY - rect.top - dragOffset.y;
      
      setTextBoxes(prevTextBoxes => 
        prevTextBoxes.map(textBox => 
          textBox.id === draggedTextBox 
            ? { ...textBox, x, y }
            : textBox
        )
      );
    } else if (draggedCircle) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left - dragOffset.x;
      const y = e.clientY - rect.top - dragOffset.y;
      
      setCircles(prevCircles => 
        prevCircles.map(circle => 
          circle.id === draggedCircle 
            ? { ...circle, x, y }
            : circle
        )
      );
    } else {
      // Handle route drawing mouse move only if not dragging
    handleCanvasMouseMove(e);
    }
  };

  const handleMouseUp = () => {
    // Check if we're over the trash can
    if (draggedElement && showTrashCan) {
      const trashCan = document.getElementById('trash-can');
      if (trashCan) {
        const rect = trashCan.getBoundingClientRect();
        const mouseX = window.event ? (window.event as MouseEvent).clientX : 0;
        const mouseY = window.event ? (window.event as MouseEvent).clientY : 0;
        
        if (mouseX >= rect.left && mouseX <= rect.right && mouseY >= rect.top && mouseY <= rect.bottom) {
          // Delete the element
          if (draggedElement.type === 'player') {
            setPlayers(prev => prev.filter(p => p.id !== draggedElement.id));
            // Clean up the association (but don't delete the route)
            setPlayerRouteAssociations(prev => {
              const newMap = new Map(prev);
              newMap.delete(draggedElement.id);
              return newMap;
            });
          } else if (draggedElement.type === 'route') {
            setRoutes(prev => prev.filter(r => r.id !== draggedElement.id));
            // Clean up the association
            setPlayerRouteAssociations(prev => {
              const newMap = new Map(prev);
              for (const [playerId, routeIds] of newMap.entries()) {
                const filteredRouteIds = routeIds.filter(routeId => routeId !== draggedElement.id);
                if (filteredRouteIds.length === 0) {
                  newMap.delete(playerId);
                } else {
                  newMap.set(playerId, filteredRouteIds);
                }
              }
              return newMap;
            });
          } else if (draggedElement.type === 'textbox') {
            setTextBoxes(prev => prev.filter(tb => tb.id !== draggedElement.id));
          } else if (draggedElement.type === 'circle') {
            setCircles(prev => prev.filter(c => c.id !== draggedElement.id));
          }
        }
      }
    }
    
    setDraggedPlayer(null);
    setDraggedTextBox(null);
    setDraggedCircle(null);
    setDraggedElement(null);
    setOriginalPlayerPosition(null);
    setOriginalPlayerRoutePositions(new Map());
    setSelectedRoute(null);
    setShowTrashCan(false);
    
    // Save state after moving if a player, text box, or circle was dragged (use setTimeout to ensure state is updated)
    if (draggedPlayer || draggedTextBox || draggedCircle) {
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
    setCurrentRoute([]);
    setIsDrawingRoute(false);
    setIsAnimating(false);
    setAnimationProgress(0);
    setLastMouseMoveTime(0);
    setShowTrashCan(false);
    setDraggedElement(null);
    setDraggedTextBox(null);
    setDraggedCircle(null);
    setEditingTextBox(null);
    setPlayerRouteAssociations(new Map());
    setDefensiveFormation(null);
    setDefensivePlayers([]);
    setOriginalPlayerPosition(null);
    setOriginalPlayerRoutePositions(new Map());
    setLastPoint(null);
    setSelectedRoute(null);
    setMode('add');
    
    // Reset history
    const initialState = {
      players: [],
      routes: [],
      textBoxes: [],
      circles: [],
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
    
    // Calculate total distance for all routes
    const totalDistance = routes.reduce((total, route) => {
      if (!route || !route.points || !Array.isArray(route.points) || route.points.length < 2) return total;
      let distance = 0;
      for (let i = 1; i < route.points.length; i++) {
        const dx = route.points[i].x - route.points[i - 1].x;
        const dy = route.points[i].y - route.points[i - 1].y;
        distance += Math.sqrt(dx * dx + dy * dy);
      }
      return total + distance;
    }, 0);
    
    // Calculate duration based on speed (pixels per second)
    const duration = (totalDistance / animationSpeed) * 1000; // Convert to milliseconds
    
    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      setAnimationProgress(progress);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
        setAnimationProgress(0);
      }
    };
    
    requestAnimationFrame(animate);
  };

  const stopAnimation = () => {
    setIsAnimating(false);
    setAnimationProgress(0);
  };


  const getAnimatedPlayerPosition = (player: Player): { x: number; y: number } => {
    if (!isAnimating) return { x: player.x, y: player.y };
    
    // Handle defensive players (zone coverage only)
    if (player.type === 'defense') {
      // Zone: Move towards nearest offensive player
      const offensivePlayers = players.filter(p => p.type === 'offense');
      let nearestPlayer: { x: number; y: number } | null = null;
      let nearestDistance = Infinity;
      
      for (const offensivePlayer of offensivePlayers) {
        const offensivePosition: { x: number; y: number } = getAnimatedPlayerPosition(offensivePlayer);
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
    
    // Calculate current distance based on animation progress
    const currentDistance = animationProgress * totalDistance;
    
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

  const openSaveDialog = () => {
    if (players.length === 0) {
      alert('Please add some players before saving the play.');
      return;
    }
    setShowSaveDialog(true);
    setShowCreateFolderInput(false);
    setNewFolderName('');
    // Load existing folders
    const savedFolders = JSON.parse(localStorage.getItem('playFolders') || '[]');
    setFolders(savedFolders);
  };

  const savePlay = () => {
    if (!playName.trim()) {
      alert('Please enter a name for the play.');
      return;
    }

    const savedPlays = JSON.parse(localStorage.getItem('savedPlays') || '[]');
    
    if (editingPlayId) {
      // Update existing play
      const playIndex = savedPlays.findIndex((play: { id: string }) => play.id === editingPlayId);
      if (playIndex !== -1) {
        savedPlays[playIndex] = {
          ...savedPlays[playIndex],
          name: playName.trim(),
          folderId: selectedFolder || undefined,
          players: players,
          routes: routes,
          textBoxes: textBoxes,
          circles: circles,
          playerRouteAssociations: Array.from(playerRouteAssociations.entries()),
          updatedAt: new Date().toISOString()
        };
        alert(`Play "${playName}" updated successfully!`);
      }
    } else {
      // Create new play
      const newPlay = {
        id: Date.now().toString(),
        name: playName.trim(),
        folderId: selectedFolder || undefined,
        players: players,
        routes: routes,
        textBoxes: textBoxes,
        circles: circles,
        playerRouteAssociations: Array.from(playerRouteAssociations.entries()),
        createdAt: new Date().toISOString()
      };
      savedPlays.push(newPlay);
      alert(`Play "${playName}" saved successfully!`);
    }
    
    localStorage.setItem('savedPlays', JSON.stringify(savedPlays));
    
    // Trigger save animation if saving to a folder
    if (selectedFolder && selectedFolder.trim()) {
      // Use setTimeout to ensure DOM is updated and save dialog is closed
      setTimeout(() => {
        // Get the save button position (center of canvas as start)
        const canvasArea = document.querySelector('.bg-white.relative.overflow-hidden');
        const folderButton = document.querySelector(`[data-folder-id="${selectedFolder}"]`);
        
        if (canvasArea && folderButton) {
          const canvasRect = canvasArea.getBoundingClientRect();
          const folderRect = folderButton.getBoundingClientRect();
          
          const startX = canvasRect.left + canvasRect.width / 2;
          const startY = canvasRect.top + canvasRect.height / 2;
          const endX = folderRect.left + folderRect.width / 2;
          const endY = folderRect.top + folderRect.height / 2;
          
          setSaveAnimation({
            active: true,
            folderId: selectedFolder,
            startX,
            startY,
            endX,
            endY
          });
          
          // Clear animation after it completes
          setTimeout(() => {
            setSaveAnimation(null);
          }, 1000);
        }
      }, 100);
    }
    
    setPlayName('');
    setSelectedFolder('');
    setNewFolderName('');
    setEditingPlayId(null);
    setShowSaveDialog(false);
  };

  const closeSaveDialog = () => {
    setShowSaveDialog(false);
    setPlayName('');
    setSelectedFolder('');
    setNewFolderName('');
    setShowCreateFolderInput(false);
    setEditingPlayId(null);
  };

  const deleteFolder = (folderId: string) => {
    // Remove folder from folders list
    const updatedFolders = folders.filter(f => f.id !== folderId);
    setFolders(updatedFolders);
    localStorage.setItem('playFolders', JSON.stringify(updatedFolders));
    
    // Unassign plays from deleted folder
    const savedPlays = JSON.parse(localStorage.getItem('savedPlays') || '[]');
    const updatedPlays = savedPlays.map((play: { folderId?: string }) => 
      play.folderId === folderId ? { ...play, folderId: undefined } : play
    );
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
        playerColor = '#6b7280';
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
        ctx.font = `${baseSize * 0.02}px Arial`; // Slightly smaller to match reduced icon size
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
      ctx.font = `${baseSize * 0.012}px Arial`;
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
      const gif = new GIF({
        workers: 2,
        quality: 10,
        width: size,
        height: size,
        workerScript: 'https://cdn.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.worker.js',
        repeat: 0 // Loop forever
      });

      // Calculate total distance and duration
      const totalDistance = routes.reduce((total, route) => {
        let distance = 0;
        for (let i = 1; i < route.points.length; i++) {
          const dx = route.points[i].x - route.points[i - 1].x;
          const dy = route.points[i].y - route.points[i - 1].y;
          distance += Math.sqrt(dx * dx + dy * dy);
        }
        return total + distance;
      }, 0);

      const duration = (totalDistance / animationSpeed) * 1000;
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

      // Function to render a frame at a specific progress
      const renderFrame = (progress: number) => {
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

        // Draw players at animated positions
        const animatedPlayers = players.map(player => {
          if (player.type === 'offense') {
            // Find route for this player
            const associatedRouteIds = playerRouteAssociations.get(player.id) || [];
            const route = routes.find(r => associatedRouteIds.includes(r.id));
            if (route && route.points.length >= 2) {
              const routeDistance = route.points.reduce((total, point, index) => {
                if (index === 0) return 0;
                const dx = point.x - route.points[index - 1].x;
                const dy = point.y - route.points[index - 1].y;
                return total + Math.sqrt(dx * dx + dy * dy);
              }, 0);

              const currentDistance = routeDistance * progress;
              let accumulated = 0;
              for (let i = 1; i < route.points.length; i++) {
                const segmentDistance = Math.sqrt(
                  Math.pow(route.points[i].x - route.points[i - 1].x, 2) +
                  Math.pow(route.points[i].y - route.points[i - 1].y, 2)
                );
                if (accumulated + segmentDistance >= currentDistance) {
                  const segmentProgress = (currentDistance - accumulated) / segmentDistance;
                  const x = route.points[i - 1].x + (route.points[i].x - route.points[i - 1].x) * segmentProgress;
                  const y = route.points[i - 1].y + (route.points[i].y - route.points[i - 1].y) * segmentProgress;
                  return { ...player, x, y };
                }
                accumulated += segmentDistance;
              }
            }
          }
          return player;
        });

        // Draw defensive players (move towards nearest offensive player at animated positions)
        animatedPlayers.forEach(player => {
          let x = (player.x / rect.width) * baseSize;
          let y = (player.y / rect.height) * baseSize;
          
          // Handle defensive player animation
          if (player.type === 'defense') {
            const offensivePlayers = animatedPlayers.filter(p => p.type === 'offense');
            let nearestPlayer: Player | null = null;
            let nearestDistance = Infinity;
            
            for (const offensivePlayer of offensivePlayers) {
              const distance = Math.sqrt(
                Math.pow(offensivePlayer.x - player.x, 2) + 
                Math.pow(offensivePlayer.y - player.y, 2)
              );
              if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestPlayer = offensivePlayer;
              }
            }
            
            if (nearestPlayer) {
              const dx = nearestPlayer.x - player.x;
              const dy = nearestPlayer.y - player.y;
              const distance = Math.sqrt(dx * dx + dy * dy);
              const moveDistance = Math.min(distance * progress, distance * 0.7); // Move 70% of the way
              if (distance > 0) {
                x = ((player.x + (dx / distance) * moveDistance) / rect.width) * baseSize;
                y = ((player.y + (dy / distance) * moveDistance) / rect.height) * baseSize;
              }
            }
          } else {
            x = (player.x / rect.width) * baseSize;
            y = (player.y / rect.height) * baseSize;
          }
          
          const radius = baseSize * 0.015;
          ctx.fillStyle = player.color === 'blue' ? '#3b82f6' :
                         player.color === 'red' ? '#ef4444' :
                         player.color === 'green' ? '#22c55e' :
                         player.color === 'yellow' ? '#eab308' :
                         player.color === 'qb' ? '#000000' : '#6b7280';
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
            ctx.font = `${baseSize * 0.012}px Arial`;
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
        const progress = i / frameCount;
        renderFrame(progress);
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

  return (
    <div className="h-screen flex flex-col">
      {/* Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-8 py-4 flex justify-between items-center">
          {/* Left Side: Logo */}
          <div className="flex items-center">
            <h1 className="text-lg font-bold text-gray-900">
              Flag Football Play Builder
            </h1>
      </div>
      
          {/* Center: Toolbar - Animation, Tools, Play Options */}
          <div className="flex items-center justify-center gap-6 flex-1">
            {/* Animation Section */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700">Animation:</span>
            <button
                className={`w-10 h-10 rounded flex items-center justify-center transition-colors ${
                  isAnimating 
                    ? 'bg-red-500 text-white hover:bg-red-600' 
                    : 'bg-yellow-500 text-white hover:bg-yellow-600'
                }`}
                onClick={isAnimating ? stopAnimation : startAnimation}
                title={isAnimating ? "Stop Animation" : "Play Animation"}
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
            <button
                className={`w-10 h-10 rounded flex items-center justify-center transition-colors ${
                defensiveFormation === 'zone'
                    ? 'bg-gray-50'
                    : ''
              }`}
              onClick={() => {
                setDefensiveFormation('zone');
                createDefensivePlayers();
              }}
              title="Zone Defense"
            >
                <div className="text-xs font-bold text-gray-700">Zone</div>
            </button>
        </div>
        
            {/* Divider */}
            <div className="h-10 w-px bg-gray-300"></div>
          
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
                  className={`w-10 h-10 rounded flex items-center justify-center transition-colors text-black ${
                mode === 'erase'
                  ? 'bg-red-50'
                  : ''
              }`}
              onClick={() => setMode('erase')}
              title="Erase Players and Routes"
            >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 256 256">
                <path d="M225,80.4,183.6,39a24,24,0,0,0-33.94,0L31,157.66a24,24,0,0,0,0,33.94l30.06,30.06A8,8,0,0,0,66.74,224H216a8,8,0,0,0,0-16h-84.7L225,114.34A24,24,0,0,0,225,80.4ZM108.68,208H70.05L42.33,180.28a8,8,0,0,1,0-11.31L96,115.31,148.69,168Zm105-105L160,156.69,107.31,104,161,50.34a8,8,0,0,1,11.32,0l41.38,41.38a8,8,0,0,1,0,11.31Z"></path>
              </svg>
            </button>
          </div>
        </div>

            {/* Divider */}
            <div className="h-10 w-px bg-gray-300"></div>
          
            {/* Play Options Section */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700">Play Options:</span>
          <div className="flex space-x-2">
            <button
                  className="w-10 h-10 bg-green-500 text-white rounded hover:bg-green-600 transition-colors flex items-center justify-center"
              onClick={openSaveDialog}
              title="Save Play"
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
          
          {/* Right Side: Nav Links */}
          <div className="flex items-center space-x-8">
            <Link 
              href="/" 
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Play Builder
            </Link>
            <Link 
              href="/my-plays" 
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              My Plays
            </Link>
            </div>
            </div>
        </div>

      <div className="flex flex-1 min-h-0">
      {/* Left Sidebar - Folder List */}
      <div className="w-1/4 bg-white border-r border-gray-200 flex flex-col overflow-y-auto">
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
                  className="flex-1 px-4 py-3 text-left flex items-center gap-3 rounded-lg hover:bg-gray-100 transition-colors"
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
                          // Get all plays in this folder
                          const savedPlays = JSON.parse(localStorage.getItem('savedPlays') || '[]');
                          const folderPlays = savedPlays.filter((play: { folderId?: string }) => play.folderId === folder.id);
                          
                          try {
                            const { createShareableLink } = await import('./firebase');
                            const shareLink = await createShareableLink(folder.id, folder.name, folderPlays);
                            
                            // Copy to clipboard
                            navigator.clipboard.writeText(shareLink);
                            alert(`Share link copied to clipboard!\n\n${shareLink}`);
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
      </div>

      {/* Canvas Container with Button Row */}
      <div className="flex-1 bg-gray-50 flex flex-col min-h-0 border-r border-gray-200">
        {/* Canvas Container - left-aligned field with border */}
        <div className="flex-1 bg-gray-50 relative overflow-hidden min-h-0">
        <div className="bg-white border-r border-gray-300 flex flex-col overflow-hidden h-full w-full">
          {/* Canvas Area */}
          <div className="bg-white relative overflow-hidden flex-1 min-h-0">
        {/* Undo/Redo Buttons */}
        <div className="absolute top-16 right-6 z-10 flex space-x-2">
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
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
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
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{ zIndex: 1 }}
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
                    stroke={selectedRoute === route.id ? "red" : "black"}
                    strokeWidth={selectedRoute === route.id ? "5" : "3"}
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
                    stroke={selectedRoute === route.id ? "red" : "black"}
                    strokeWidth={selectedRoute === route.id ? "5" : "3"}
                strokeDasharray={route.style === 'dashed' ? '8,4' : 'none'}
              />
                )}
                {/* Arrow at the end - only for routes that should show arrows */}
                {shouldShowArrow && (
                  <polygon
                    points={`${lastPoint.x},${lastPoint.y} ${arrowX - Math.cos(angle - 0.6) * 12},${arrowY - Math.sin(angle - 0.6) * 12} ${arrowX - Math.cos(angle + 0.6) * 12},${arrowY - Math.sin(angle + 0.6) * 12}`}
                    fill={selectedRoute === route.id ? "red" : "black"}
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

          {/* Players */}
          {[...players, ...defensivePlayers].map((player) => {
            const colorOption = player.type === 'defense' 
              ? { name: 'grey', color: 'bg-gray-500', label: 'D' }
              : colors.find(c => c.name === player.color);
            const animatedPosition = getAnimatedPlayerPosition(player);
            
            return (
              <div
                key={player.id}
                className={`absolute w-12 h-12 rounded-full ${colorOption?.color || 'bg-gray-500'} border-2 border-white transform -translate-x-1/2 -translate-y-1/2 ${
                  mode === 'erase' && !isAnimating ? 'cursor-pointer' : 
                  !isAnimating ? 'cursor-move' : 'cursor-pointer'
                } hover:scale-110 transition-transform flex items-center justify-center`}
                style={{
                  left: animatedPosition.x,
                  top: animatedPosition.y,
                  zIndex: 3,
                  transition: isAnimating ? 'none' : 'all 0.1s ease-out'
                }}
                onMouseDown={(e) => !isAnimating && handlePlayerMouseDown(e, player.id)}
                onClick={(e) => !isAnimating && handlePlayerClick(e, player.id)}
              >
                {colorOption?.label && (
                  <span className="text-white text-xs font-bold">
                    {colorOption.label}
                  </span>
                )}
              </div>
            );
          })}

          {/* Text Boxes */}
          {textBoxes.map((textBox) => (
            <div
              key={textBox.id}
              className={`absolute transform -translate-x-1/2 -translate-y-1/2 ${
                mode === 'erase' ? 'cursor-pointer' : 'cursor-move'
              }`}
              style={{
                left: textBox.x,
                top: textBox.y,
                fontSize: textBox.fontSize,
                color: textBox.color,
                zIndex: 3
              }}
              onMouseDown={(e) => handleTextBoxMouseDown(e, textBox.id)}
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
                <div className="bg-white bg-opacity-80 px-2 py-1 rounded border border-gray-300 shadow-sm">
                  {textBox.text}
                </div>
              )}
            </div>
          ))}

          {/* Circles */}
          {circles.map((circle) => (
            <div
              key={circle.id}
              className={`absolute transform -translate-x-1/2 -translate-y-1/2 ${
                mode === 'erase' ? 'cursor-pointer' : 'cursor-move'
              }`}
              style={{
                left: circle.x,
                top: circle.y,
                width: `${circle.radius * 2}px`,
                height: `${circle.radius * 2}px`,
                zIndex: 3
              }}
              onMouseDown={(e) => handleCircleMouseDown(e, circle.id)}
            >
              <div
                className="rounded-full"
                style={{
                  width: '100%',
                  height: '100%',
                  backgroundColor: circle.color,
                  border: 'none'
                }}
              />
            </div>
          ))}

          {/* Trash Can */}
          {showTrashCan && (
            <div
              id="trash-can"
              className="fixed bottom-4 right-4 w-16 h-16 bg-red-500 rounded-full flex items-center justify-center shadow-lg"
              style={{ zIndex: 9999 }}
            >
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 256 256">
                <path d="M216,48H176V40a24,24,0,0,0-24-24H104A24,24,0,0,0,80,40v8H40a8,8,0,0,0,0,16h8V208a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V64h8a8,8,0,0,0,0-16ZM96,40a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96Zm96,168H64V64H192ZM112,104v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Zm48,0v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Z"></path>
              </svg>
            </div>
          )}
        </div>
          </div>

          {/* Bottom Toolbar: Player Icons (left) and Route Tools (right) */}
          <div className="bg-white border-t border-gray-200 flex flex-row flex-shrink-0 px-6 py-2">
            {/* Left Side: Player Icons in 2 rows */}
            <div className="flex-1">
              <h2 className="text-sm font-semibold mb-1 text-gray-900">Player Icons</h2>
              <div className="grid grid-cols-3 gap-1.5">
                {colors.map((colorOption) => (
                  <div
                    key={colorOption.name}
                    className={`w-12 h-12 rounded-full ${colorOption.color} cursor-pointer hover:scale-105 transition-transform flex items-center justify-center relative flex-shrink-0`}
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
                  className={`w-12 h-12 rounded flex items-center justify-center text-xs font-medium transition-transform ${
                    players.length > 0
                      ? 'bg-gray-50 text-gray-400 cursor-not-allowed opacity-50'
                      : 'bg-gray-100 hover:bg-gray-200 cursor-pointer text-gray-700 hover:scale-105'
                  }`}
                  title={players.length > 0 ? "Clear canvas first to add all positions" : "Add All Positions"}
                >
                  Add All
                </button>
      </div>
      </div>

            {/* Right Side: Route Tools (1/3 width) */}
            <div className="w-1/3 border-l border-gray-200 pl-6">
              <h3 className="text-sm font-medium text-gray-700 mb-1">Route Tools</h3>
              <div className="flex flex-col gap-1">
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    className={`w-12 h-12 rounded flex items-center justify-center transition-colors flex-shrink-0 ${
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
                      <path d="M10 35 L20 35 L20 20 L30 20" stroke="black" strokeWidth="4" fill="none"/>
                      <polygon points="30,20 25,15 25,25" fill="black"/>
                    </svg>
                  </button>
                  <button
                    className={`w-12 h-12 rounded flex items-center justify-center transition-colors flex-shrink-0 ${
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
                      <path d="M10 35 L20 35 Q25 35 25 30 Q25 25 30 20" stroke="black" strokeWidth="4" fill="none"/>
                      <polygon points="30,20 25,15 25,25" fill="black"/>
                    </svg>
                  </button>
                  <button
                    className={`w-12 h-12 rounded flex items-center justify-center transition-colors flex-shrink-0 ${
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
                      <path d="M10 35 L20 35 L20 20 L30 20" stroke="black" strokeWidth="4" strokeDasharray="5,5" fill="none"/>
                      <polygon points="30,20 25,15 25,25" fill="black"/>
                    </svg>
                  </button>
                  <button
                    className={`w-12 h-12 rounded flex items-center justify-center transition-colors flex-shrink-0 ${
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
                      <path d="M10 35 L20 35 Q25 35 25 30 Q25 25 30 20" stroke="black" strokeWidth="4" strokeDasharray="5,5" fill="none"/>
                      <polygon points="30,20 25,15 25,25" fill="black"/>
                    </svg>
                  </button>
                  <button
                    className={`w-12 h-12 rounded flex items-center justify-center transition-colors flex-shrink-0 ${
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
                    className={`w-12 h-12 rounded flex items-center justify-center transition-colors flex-shrink-0 ${
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
      </div>

      {/* Right Sidebar - Quick Adds Only */}
      <div className="bg-white flex flex-col flex-shrink-0 min-h-0 overflow-y-auto" style={{ width: '25%' }}>
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
                <path d="M20 80 L50 60 L70 40" stroke="black" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                <polygon points="70,40 65,35 65,45" fill="black"/>
              </svg>
            </button>
            
            {/* Post Route */}
            <button
              onClick={() => addStandardRoute('post')}
              className="border border-gray-300 bg-white hover:bg-gray-50 transition-colors cursor-pointer flex items-center justify-center aspect-square"
              title="Post Route"
            >
              <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
                <path d="M20 80 L40 60 L80 30" stroke="black" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                <polygon points="80,30 75,25 75,35" fill="black"/>
              </svg>
            </button>
            
            {/* Hitch Route */}
            <button
              onClick={() => addStandardRoute('hitch')}
              className="border border-gray-300 bg-white hover:bg-gray-50 transition-colors cursor-pointer flex items-center justify-center aspect-square"
              title="Hitch Route"
            >
              <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
                <path d="M20 80 Q50 70 50 60 Q50 50 50 65" stroke="black" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            
            {/* Corner Route */}
            <button
              onClick={() => addStandardRoute('corner')}
              className="border border-gray-300 bg-white hover:bg-gray-50 transition-colors cursor-pointer flex items-center justify-center aspect-square"
              title="Corner Route"
            >
              <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
                <path d="M20 80 L60 50 L85 30" stroke="black" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                <polygon points="85,30 80,25 80,35" fill="black"/>
              </svg>
            </button>
            
            {/* Empty slots for future routes */}
            {[...Array(4)].map((_, index) => (
              <div
                key={index}
                className="border border-gray-300 bg-white"
              />
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
                className={`w-10 h-10 rounded-full ${colorOption.color} border-2 border-gray-300 hover:scale-110 transition-transform`}
                title={colorOption.name}
              />
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

      {/* Save Animation */}
      {saveAnimation && (
        <>
          <style>{`
            @keyframes flyToFolder {
              0% {
                left: ${saveAnimation.startX}px;
                top: ${saveAnimation.startY}px;
                opacity: 1;
                transform: translate(-50%, -50%) scale(1);
              }
              50% {
                opacity: 0.8;
                transform: translate(-50%, -50%) scale(0.9);
              }
              100% {
                left: ${saveAnimation.endX}px;
                top: ${saveAnimation.endY}px;
                opacity: 0;
                transform: translate(-50%, -50%) scale(0.5);
              }
            }
            .save-animation {
              animation: flyToFolder 1s ease-out forwards;
            }
          `}</style>
          <div
            className="fixed z-50 pointer-events-none save-animation"
            style={{
              left: `${saveAnimation.startX}px`,
              top: `${saveAnimation.startY}px`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <div className="bg-blue-500 text-white rounded-lg shadow-lg p-2 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-xs font-medium">Saved!</span>
            </div>
          </div>
        </>
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
