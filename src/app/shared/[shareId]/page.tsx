'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getSharedFolder, SharedFolder } from '../../firebase';

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
  playerRouteAssociations?: [string, string[]][];
}

const colors = [
  { name: 'blue', color: 'bg-blue-500', label: '' },
  { name: 'red', color: 'bg-red-500', label: '' },
  { name: 'green', color: 'bg-green-500', label: '' },
  { name: 'yellow', color: 'bg-yellow-500', label: '' },
  { name: 'qb', color: 'bg-black', label: 'QB' },
];

export default function SharedFolderPage() {
  const params = useParams();
  const shareId = params.shareId as string;
  const [sharedFolder, setSharedFolder] = useState<SharedFolder | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState<boolean>(false);

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
      <div className="relative w-full h-full">
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
                width: `${12 * scale}px`,
                height: `${12 * scale}px`,
                minWidth: '12px',
                minHeight: '12px',
                zIndex: 3,
              }}
            >
              {colorOption?.label && (
                <span 
                  className="text-white font-bold"
                  style={{ fontSize: `${Math.max(8, 10 * scale)}px` }}
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

  const plays = sharedFolder.plays || [];

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Navigation */}
      <div className="bg-white border-b border-gray-200 flex-shrink-0">
        <div className="px-8 py-5 flex justify-between items-center max-w-full">
          <div className="flex items-center">
            <h1 className="text-lg font-bold text-gray-900">
              Shared Folder: {sharedFolder.folderName}
            </h1>
          </div>
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
            <button
              onClick={() => setShowImportModal(true)}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
            >
              Import to My Plays
            </button>
          </div>
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
    </div>
  );
}
