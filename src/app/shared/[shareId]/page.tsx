'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
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
  showArrow?: boolean;
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
  players: Player[];
  routes: Route[];
  textBoxes?: TextBox[];
  circles?: Circle[];
}

const colors = [
  { name: 'blue', color: 'bg-blue-500', label: 'X' },
  { name: 'red', color: 'bg-red-500', label: 'Z' },
  { name: 'green', color: 'bg-green-500', label: 'Y' },
  { name: 'yellow', color: 'bg-yellow-500', label: 'C' },
  { name: 'purple', color: 'bg-purple-500', label: '' },
  { name: 'qb', color: 'bg-black', label: 'QB' },
];

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
  const allPoints: { x: number; y: number }[] = [];
  
  play.players.forEach(player => {
    allPoints.push({ x: player.x, y: player.y });
  });
  
  play.routes?.forEach(route => {
    route.points.forEach(point => {
      allPoints.push(point);
    });
  });
  
  play.textBoxes?.forEach(textBox => {
    allPoints.push({ x: textBox.x, y: textBox.y });
  });
  
  play.circles?.forEach(circle => {
    allPoints.push({ x: circle.x, y: circle.y });
  });
  
  if (allPoints.length === 0) {
    return <div className="flex items-center justify-center h-full text-gray-400">No elements</div>;
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
  
  const containerWidth = 300;
  const containerHeight = 300;
  
  const scaleX = (containerWidth - padding * 2) / paddedWidth;
  const scaleY = (containerHeight - padding * 2) / paddedHeight;
  const scale = Math.min(scaleX, scaleY);
  
  const scaledWidth = paddedWidth * scale;
  const scaledHeight = paddedHeight * scale;
  const offsetX = (containerWidth - scaledWidth) / 2 - (minX - padding) * scale;
  const offsetY = (containerHeight - scaledHeight) / 2 - (minY - padding) * scale;

  return (
    <div className="relative w-full h-full">
      {/* Routes */}
      {play.routes?.map((route) => {
        if (route.points.length < 2) return null;
        
        const scaledPoints = route.points.map(point => ({
          x: point.x * scale + offsetX,
          y: point.y * scale + offsetY
        }));
        
        let startIndex = scaledPoints.length - 2;
        const lastPoint = scaledPoints[scaledPoints.length - 1];
        let secondLastPoint = scaledPoints[startIndex];
        
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
        
        let routePoints = scaledPoints;
        const shouldShowArrow = route.showArrow !== false && route.lineBreakType !== 'none' && route.lineBreakType !== 'smooth-none';
        if (shouldShowArrow && scaledPoints.length >= 2) {
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
                  if (route.lineBreakType === 'smooth' && route.points.length >= 2 && shouldShowArrow) {
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
            {shouldShowArrow && (
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

export default function SharedFolderPage() {
  const params = useParams();
  const shareId = params.shareId as string;
  const [sharedFolder, setSharedFolder] = useState<SharedFolder | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSharedFolder = async () => {
      try {
        setLoading(true);
        const folder = await getSharedFolder(shareId);
        if (folder) {
          // Ensure plays is an array BEFORE setting state
          let playsArray: SavedPlay[] = [];
          
          if (Array.isArray(folder.plays)) {
            playsArray = folder.plays;
          } else if (folder.plays && typeof folder.plays === 'object') {
            // Try to convert object to array
            try {
              const keys = Object.keys(folder.plays);
              if (keys.length > 0) {
                // Check if it's array-like (numeric keys)
                const isArrayLike = keys.every((k, i) => {
                  const numKey = parseInt(k, 10);
                  return !isNaN(numKey) && numKey === i;
                });
                if (isArrayLike) {
                  const sortedKeys = keys.sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  playsArray = sortedKeys.map(k => (folder.plays as any)[k]) as SavedPlay[];
                }
              }
            } catch (convErr) {
              console.error('Error converting plays object to array:', convErr);
            }
          }
          
          // Create new folder object with guaranteed array
          const safeFolder: SharedFolder = {
            ...folder,
            plays: playsArray
          };
          
          console.log('Setting shared folder with plays array:', Array.isArray(safeFolder.plays), safeFolder.plays.length);
          setSharedFolder(safeFolder);
        } else {
          setError('Shared folder not found or link has expired.');
        }
      } catch (err) {
        console.error('Error loading shared folder:', err);
        setError('Failed to load shared folder. Please check Firebase configuration.');
      } finally {
        setLoading(false);
      }
    };

    if (shareId) {
      loadSharedFolder();
    }
  }, [shareId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-gray-600">Loading shared folder...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-red-600 mb-4">{error}</div>
          <Link href="/" className="text-blue-600 hover:text-blue-800 underline">Go to Play Builder</Link>
        </div>
      </div>
    );
  }

  if (!sharedFolder) {
    return null;
  }

  // Ensure plays is always an array (safety check with multiple layers)
  const plays: SavedPlay[] = (() => {
    // Check if sharedFolder or plays exists first
    if (!sharedFolder || sharedFolder.plays === undefined || sharedFolder.plays === null) {
      console.warn('sharedFolder or plays is undefined/null, using empty array');
      return [];
    }
    
    const folderPlays = sharedFolder.plays;
    
    // If it's already an array, return it
    if (Array.isArray(folderPlays)) {
      return folderPlays;
    }
    
    // If not array, try to convert it
    if (typeof folderPlays === 'object') {
      try {
        // Try converting object to array if it's array-like
        const keys = Object.keys(folderPlays);
        if (keys.length > 0 && keys.every((k, i) => parseInt(k, 10) === i)) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return keys.sort((a, b) => parseInt(a, 10) - parseInt(b, 10)).map(k => (folderPlays as any)[k]) as SavedPlay[];
        }
      } catch (e) {
        console.error('Error converting plays:', e);
      }
    }
    
    // Final fallback - always return an array
    console.warn('Plays conversion failed, using empty array. Type:', typeof folderPlays, 'Value:', folderPlays);
    return [];
  })();
  
  // Double-check plays is defined and is an array before using it
  if (!plays || !Array.isArray(plays)) {
    console.error('CRITICAL: Plays is still not an array after all conversions:', plays);
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-red-600 mb-4">Error loading plays data</div>
          <Link href="/" className="text-blue-600 hover:text-blue-800 underline">Go to Play Builder</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{sharedFolder.folderName}</h1>
            <p className="text-sm text-gray-500 mt-1">Shared folder with {plays.length} play{plays.length !== 1 ? 's' : ''}</p>
          </div>
          <Link 
            href="/"
            className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
          >
            Create Your Own Play
          </Link>
        </div>
      </div>

      {/* Plays Grid */}
      <div className="p-6">
        {plays.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-lg text-gray-500">No plays in this folder</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
            {plays.map((play: SavedPlay) => (
              <div
                key={play.id}
                className="relative group bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-lg transition-all duration-200"
              >
                {/* Play Preview */}
                <div className="w-full bg-white relative" style={{ height: '300px', aspectRatio: '4/3' }}>
                  {/* Field Lines */}
                  <div className="absolute inset-0 opacity-20">
                    {/* Yard Lines */}
                    {[10, 20, 30, 40, 50, 60, 70, 80, 90].map((percent) => (
                      <div
                        key={percent}
                        className="absolute left-0 right-0 bg-gray-400"
                        style={{ top: `${percent}%`, height: '1px' }}
                      />
                    ))}
                    {/* Sidelines */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gray-400"></div>
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-400"></div>
                  </div>

                  {/* Play Content */}
                  {renderPlayPreview(play)}
                </div>

                {/* Play Name */}
                <div className="p-3">
                  <h3 className="text-sm font-medium text-gray-900 truncate">{play.name}</h3>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
