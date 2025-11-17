'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import { loadUserData, saveUserData, SavedPlay, UserData } from '../firebase';
import Header from '../components/Header';

export default function PlayViewer() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [plays, setPlays] = useState<SavedPlay[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showPlayNotes, setShowPlayNotes] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [viewMode, setViewMode] = useState<'stack' | 'grid'>('stack');
  // Responsive canvas size: smaller on mobile, full size on desktop
  const [canvasSize, setCanvasSize] = useState(600);
  const [isMobile, setIsMobile] = useState(false);

  // Update canvas size based on screen width
  useEffect(() => {
    const updateCanvasSize = () => {
      const width = window.innerWidth;
      const mobile = width < 640;
      setIsMobile(mobile);
      
      if (mobile) {
        // Mobile: use screen width minus padding
        setCanvasSize(Math.min(width - 32, 400));
      } else if (width < 768) {
        // Small tablets
        setCanvasSize(500);
      } else {
        // Desktop
        setCanvasSize(600);
      }
    };
    
    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, []);

  // Load all plays
  useEffect(() => {
    const loadPlays = async () => {
      try {
        let allPlays: SavedPlay[] = [];

        if (user && !authLoading) {
          // Load from Firebase
          const userData = await loadUserData(user.uid);
          if (userData) {
            allPlays = userData.savedPlays || [];
          }
        }

        // Also load from localStorage (includes local-only plays)
        const localPlays = JSON.parse(localStorage.getItem('savedPlays') || '[]');
        
        // Merge and deduplicate
        const playMap = new Map<string, SavedPlay>();
        [...allPlays, ...localPlays].forEach(play => {
          if (!playMap.has(play.id)) {
            playMap.set(play.id, play);
          }
        });

        const mergedPlays = Array.from(playMap.values());
        setPlays(mergedPlays);
        setLoading(false);
      } catch (error) {
        console.error('Error loading plays:', error);
        // Fallback to localStorage
        const localPlays = JSON.parse(localStorage.getItem('savedPlays') || '[]');
        setPlays(localPlays);
        setLoading(false);
      }
    };

    loadPlays();
  }, [user, authLoading]);

  const handleNext = useCallback(() => {
    if (currentIndex < plays.length - 1) {
      setIsFlipping(true);
      setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
        setIsFlipping(false);
      }, 150);
    }
  }, [currentIndex, plays.length]);

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      setIsFlipping(true);
      setTimeout(() => {
        setCurrentIndex(prev => prev - 1);
        setIsFlipping(false);
      }, 150);
    }
  }, [currentIndex]);

  // Keyboard navigation handler
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Only handle if not typing in an input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      // Left arrow for previous, right arrow for next
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (currentIndex > 0) {
          handlePrevious();
        }
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (currentIndex < plays.length - 1) {
          handleNext();
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentIndex, plays.length, handlePrevious, handleNext]);

  const handleSavePlay = async () => {
    if (!user) {
      alert('Please log in to save plays.');
      return;
    }

    setSaving(true);
    try {
      const playToSave = plays[currentIndex];
      
      // Create a copy with a new ID
      const newPlay: SavedPlay = {
        ...playToSave,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        sharedToCommunity: false
      };

      // Load existing user data
      const existingData = await loadUserData(user.uid);
      const existingPlays = existingData?.savedPlays || [];
      const folders = existingData?.folders || [];

      // Check if play already exists (by name)
      const playExists = existingPlays.some(p => p.name === newPlay.name && p.id !== playToSave.id);
      if (playExists) {
        alert('A play with this name already exists in your collection.');
        setSaving(false);
        return;
      }

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

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (error) {
      console.error('Error saving play:', error);
      alert('Failed to save play. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemixPlay = () => {
    const playToRemix = plays[currentIndex];
    // Store the play data in localStorage for the builder page to load
    localStorage.setItem('editingPlay', JSON.stringify(playToRemix));
    // Navigate to the builder page
    router.push('/');
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center h-[calc(100vh-80px)]">
          <div className="text-gray-500">Loading plays...</div>
        </div>
      </div>
    );
  }

  if (plays.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center h-[calc(100vh-80px)]">
          <div className="text-center">
            <p className="text-gray-500 mb-4">No plays found</p>
            <button
              onClick={() => router.push('/my-plays')}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
            >
              Go to My Plays
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentPlay = plays[currentIndex];

  // Calculate bounding box for all elements
  const allPoints: { x: number; y: number }[] = [];
  
  // Add player positions
  currentPlay.players?.forEach(player => {
    allPoints.push({ x: player.x, y: player.y });
  });

  // Add route points
  currentPlay.routes?.forEach(route => {
    route.points?.forEach(point => {
      allPoints.push(point);
    });
  });

  // Add text box positions
  currentPlay.textBoxes?.forEach(textBox => {
    allPoints.push({ x: textBox.x, y: textBox.y });
  });

  // Add circle positions (center + radius)
  currentPlay.circles?.forEach(circle => {
    allPoints.push({ x: circle.x - circle.radius, y: circle.y - circle.radius });
    allPoints.push({ x: circle.x + circle.radius, y: circle.y + circle.radius });
  });

  // Add football positions
  currentPlay.footballs?.forEach(football => {
    allPoints.push({ x: football.x, y: football.y });
  });

  // Calculate bounds - only use actual points, no default fallbacks
  if (allPoints.length === 0) {
    // If no elements, center at default position
    allPoints.push({ x: 400, y: 400 }); // Default center of 800x800 canvas
  }

  const minX = Math.min(...allPoints.map(p => p.x));
  const maxX = Math.max(...allPoints.map(p => p.x));
  const minY = Math.min(...allPoints.map(p => p.y));
  const maxY = Math.max(...allPoints.map(p => p.y));

  const width = maxX - minX || 800;
  const height = maxY - minY || 800;
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  // Add padding to ensure content isn't at the edge
  const padding = Math.max(width, height) * 0.1;
  const scaleX = (canvasSize * 0.9) / (width + padding * 2);
  const scaleY = (canvasSize * 0.9) / (height + padding * 2);
  const finalScale = Math.min(scaleX, scaleY, 1);

  // Center the content on the canvas
  const offsetX = canvasSize / 2 - centerX * finalScale;
  const offsetY = canvasSize / 2 - centerY * finalScale;

  return (
    <div className="min-h-screen bg-gray-50 relative overflow-x-hidden">
      <Header />
      
      {/* View Toggle Button */}
      <div className="absolute top-24 md:top-28 right-3 md:right-6 z-30">
        <button
          onClick={() => setViewMode(viewMode === 'stack' ? 'grid' : 'stack')}
          className="p-2 md:p-3 bg-white rounded-lg shadow-lg hover:shadow-xl transition-all flex items-center gap-1.5 md:gap-2 text-gray-700 hover:bg-gray-50 active:scale-95"
          aria-label={`Switch to ${viewMode === 'stack' ? 'grid' : 'stack'} view`}
        >
          {viewMode === 'stack' ? (
            <>
              <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              <span className="text-xs md:text-sm font-medium hidden sm:inline">Grid</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <span className="text-xs md:text-sm font-medium hidden sm:inline">Stack</span>
            </>
          )}
        </button>
      </div>

      {viewMode === 'stack' ? (
      <>
      <div className="flex items-center justify-center h-[calc(100vh-80px)] relative overflow-x-hidden overflow-y-auto px-4 md:px-0 pb-20 md:pb-0">
         {/* Stacked Cards Container */}
         <div className="relative" style={{ width: canvasSize, height: isMobile ? canvasSize * 1.2 : canvasSize * 1.15, maxWidth: '100%', marginBottom: isMobile ? '80px' : '0' }}>
          {/* Background Cards - Stacked Effect */}
          {plays.length > 1 && (
            <>
               {/* Third card (furthest back) */}
               {currentIndex < plays.length - 2 && (
                 <div
                   className="absolute bg-white rounded-lg shadow-lg opacity-30"
                   style={{
                     width: canvasSize,
                     height: isMobile ? canvasSize * 1.2 : canvasSize * 1.15,
                     transform: 'translate(12px, 12px) scale(0.95)',
                     zIndex: 1
                   }}
                 />
               )}
               {/* Second card (middle) */}
               {currentIndex < plays.length - 1 && (
                 <div
                   className="absolute bg-white rounded-lg shadow-xl opacity-50"
                   style={{
                     width: canvasSize,
                     height: isMobile ? canvasSize * 1.2 : canvasSize * 1.15,
                     transform: 'translate(8px, 8px) scale(0.97)',
                     zIndex: 2
                   }}
                 />
               )}
               {/* Previous card (if exists) */}
               {currentIndex > 0 && (
                 <div
                   className="absolute bg-white rounded-lg shadow-xl opacity-50"
                   style={{
                     width: canvasSize,
                     height: isMobile ? canvasSize * 1.2 : canvasSize * 1.15,
                     transform: 'translate(-8px, 8px) scale(0.97)',
                     zIndex: 2
                   }}
                 />
               )}
            </>
          )}

           {/* Main Play Card */}
           <div
             className={`relative bg-white rounded-lg shadow-2xl transition-all duration-300 ${
               isFlipping ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
             }`}
             style={{ width: canvasSize, height: isMobile ? canvasSize * 1.2 : canvasSize * 1.15, zIndex: 10, overflow: 'hidden' }}
           >
          {/* Play Name - White background overlay */}
          <div className="absolute top-0 left-0 right-0 z-20 bg-white rounded-t-lg pb-2">
            <div className="px-3 md:px-4 pt-3 md:pt-4">
              <h2 className="text-lg md:text-2xl font-bold text-gray-900 truncate">{currentPlay.name}</h2>
              <p className="text-xs md:text-sm text-gray-500 mt-0.5 md:mt-1">
                {currentIndex + 1} of {plays.length}
              </p>
            </div>
          </div>

          {/* Canvas - Show more of the play */}
          <div className="absolute left-0 right-0" style={{ top: isMobile ? '65px' : '100px', bottom: isMobile ? '35px' : '55px', overflow: 'visible' }}>
            <canvas
              width={canvasSize}
              height={canvasSize}
              style={{ display: 'block' }}
              ref={(canvas) => {
              if (!canvas) return;
              const ctx = canvas.getContext('2d');
              if (!ctx) return;

              // Clear canvas
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(0, 0, canvasSize, canvasSize);

              // Draw field lines
              ctx.strokeStyle = '#e5e7eb';
              ctx.lineWidth = 1;

              // Yard lines
              for (let i = 1; i < 10; i++) {
                const y = (canvasSize * i) / 10;
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(canvasSize, y);
                ctx.stroke();
              }

              // Hash marks
              const hashWidth = canvasSize * 0.01;
              const hashHeight = canvasSize * 0.02;
              for (let i = 0; i < 10; i++) {
                const y = (canvasSize * i) / 10;
                const leftX = canvasSize * 0.1;
                const rightX = canvasSize * 0.9;
                ctx.fillStyle = '#e5e7eb';
                ctx.fillRect(leftX, y - hashHeight / 2, hashWidth, hashHeight);
                ctx.fillRect(rightX, y - hashHeight / 2, hashWidth, hashHeight);
              }

              // Sidelines
              ctx.fillStyle = '#e5e7eb';
              ctx.fillRect(0, 0, canvasSize, 2);
              ctx.fillRect(0, canvasSize - 2, canvasSize, 2);

              // Apply transform
              ctx.save();
              ctx.translate(offsetX, offsetY);
              ctx.scale(finalScale, finalScale);

              // Draw routes first (behind players)
              currentPlay.routes?.forEach(route => {
                if (!route.points || route.points.length === 0) return;

                // Routes may not have a color property, default to black
                const routeColor = (route as { color?: string }).color || '#000000';
                ctx.strokeStyle = routeColor === 'black' ? '#000000' : routeColor;
                ctx.lineWidth = 3;
                ctx.setLineDash(route.style === 'dashed' ? [10, 5] : []);

                ctx.beginPath();
                route.points.forEach((point, idx) => {
                  if (idx === 0) {
                    ctx.moveTo(point.x, point.y);
                  } else {
                    if (route.lineBreakType === 'rigid') {
                      ctx.lineTo(point.x, point.y);
                    } else if (route.lineBreakType === 'smooth') {
                      const prevPoint = route.points[idx - 1];
                      const nextPoint = route.points[idx + 1] || point;
                      const cp1x = prevPoint.x + (point.x - prevPoint.x) * 0.5;
                      const cp1y = prevPoint.y + (point.y - prevPoint.y) * 0.5;
                      const cp2x = point.x - (nextPoint.x - point.x) * 0.5;
                      const cp2y = point.y - (nextPoint.y - point.y) * 0.5;
                      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, point.x, point.y);
                    } else {
                      ctx.lineTo(point.x, point.y);
                    }
                  }
                });
                ctx.stroke();
                ctx.setLineDash([]);

                // Draw arrow at end
                if (route.points.length > 1) {
                  const lastPoint = route.points[route.points.length - 1];
                  const secondLastPoint = route.points[route.points.length - 2];
                  const angle = Math.atan2(lastPoint.y - secondLastPoint.y, lastPoint.x - secondLastPoint.x);
                  
                  ctx.fillStyle = routeColor === 'black' ? '#000000' : routeColor;
                  ctx.beginPath();
                  ctx.moveTo(lastPoint.x, lastPoint.y);
                  ctx.lineTo(
                    lastPoint.x - 10 * Math.cos(angle - Math.PI / 6),
                    lastPoint.y - 10 * Math.sin(angle - Math.PI / 6)
                  );
                  ctx.lineTo(
                    lastPoint.x - 10 * Math.cos(angle + Math.PI / 6),
                    lastPoint.y - 10 * Math.sin(angle + Math.PI / 6)
                  );
                  ctx.closePath();
                  ctx.fill();
                }
              });

              // Draw players
              const colors = {
                qb: '#000000',
                yellow: '#eab308',
                blue: '#3b82f6',
                green: '#22c55e',
                red: '#ef4444'
              };

              const labels = {
                qb: 'QB',
                yellow: 'C',
                blue: '',
                green: '',
                red: ''
              };

              currentPlay.players?.forEach(player => {
                const color = colors[player.color as keyof typeof colors] || '#000000';
                const label = labels[player.color as keyof typeof labels] || '';

                // Draw player circle
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(player.x, player.y, 15, 0, Math.PI * 2);
                ctx.fill();

                // Draw label
                if (label) {
                  ctx.fillStyle = '#ffffff';
                  ctx.font = 'bold 12px Arial';
                  ctx.textAlign = 'center';
                  ctx.textBaseline = 'middle';
                  ctx.fillText(label, player.x, player.y);
                }
              });

              ctx.restore();
            }}
            />
          </div>

          {/* Action Buttons at Bottom */}
          <div className="absolute bottom-0 left-0 right-0 z-20 bg-white rounded-b-lg pt-1.5 pb-2 md:pb-3 px-3 md:px-4">
            <div className="flex items-center gap-2 md:gap-4">
            {/* Save Button */}
            <button
              onClick={handleSavePlay}
              disabled={saving || !user}
              className={`p-2 md:p-4 rounded-lg transition-all ${
                saving || !user
                  ? 'text-gray-300 cursor-not-allowed'
                  : saveSuccess
                  ? 'text-green-400 bg-green-50'
                  : 'text-blue-400 hover:bg-blue-50 active:scale-95'
              }`}
              title={!user ? 'Log in to save' : saveSuccess ? 'Saved!' : 'Save play'}
            >
              {saveSuccess ? (
                <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              )}
            </button>

            {/* Remix Button */}
            <button
              onClick={handleRemixPlay}
              className="p-2 md:p-4 rounded-lg text-purple-400 hover:bg-purple-50 active:scale-95 transition-all"
              title="Remix play"
            >
              <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>

            {/* Play Notes Toggle Button */}
            {currentPlay.playNotes && (
              <button
                onClick={() => setShowPlayNotes(!showPlayNotes)}
                className={`p-2 md:p-4 rounded-lg transition-all ${
                  showPlayNotes
                    ? 'text-indigo-400 bg-indigo-50'
                    : 'text-indigo-400 hover:bg-indigo-50'
                } active:scale-95`}
                title={showPlayNotes ? 'Hide notes' : 'Show notes'}
              >
                <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </button>
            )}
            </div>
          </div>

          {/* Play Notes */}
          {currentPlay.playNotes && showPlayNotes && (
            <div className="absolute bottom-24 left-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 border border-gray-200">
              <p className="text-sm text-gray-700">{currentPlay.playNotes}</p>
            </div>
          )}
          </div>

          {/* Cards beneath main card - Stacked Effect */}
          {plays.length > 1 && (
            <>
              {/* First card beneath (closest to main) */}
              {currentIndex < plays.length - 1 && (
                <div
                  className="absolute bg-white rounded-lg shadow-xl"
                  style={{
                    width: canvasSize,
                    height: isMobile ? canvasSize * 1.2 : canvasSize * 1.15,
                    top: '8px',
                    left: '8px',
                    zIndex: 9,
                    opacity: 0.6
                  }}
                />
              )}
              {/* Second card beneath (furthest) */}
              {currentIndex < plays.length - 2 && (
                <div
                  className="absolute bg-white rounded-lg shadow-lg"
                  style={{
                    width: canvasSize,
                    height: isMobile ? canvasSize * 1.2 : canvasSize * 1.15,
                    top: '16px',
                    left: '16px',
                    zIndex: 8,
                    opacity: 0.4
                  }}
                />
              )}
            </>
          )}
        </div>

        {/* Previous Button - Mobile: rectangular below card, Desktop: circular on side */}
        {isMobile ? (
          <button
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            className={`absolute z-20 h-12 rounded-lg bg-white shadow-lg flex items-center justify-center gap-2 transition-all ${
              currentIndex === 0
                ? 'text-gray-300 cursor-not-allowed opacity-50'
                : 'text-gray-700 hover:bg-gray-50 hover:shadow-xl active:scale-95'
            }`}
            style={{ 
              left: '8px',
              width: `calc(50% - 12px)`,
              top: `calc(100% + 16px)`
            }}
            aria-label="Previous play"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm font-medium">Previous</span>
          </button>
        ) : (
          <button
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            className={`absolute z-20 w-12 h-12 rounded-full bg-white shadow-lg flex items-center justify-center transition-all ${
              currentIndex === 0
                ? 'text-gray-300 cursor-not-allowed opacity-50'
                : 'text-gray-700 hover:bg-gray-50 hover:shadow-xl active:scale-95'
            }`}
            style={{ 
              left: `calc(50% - ${canvasSize / 2}px - 80px)`, 
              top: '50%', 
              transform: 'translateY(-50%)' 
            }}
            aria-label="Previous play"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}

        {/* Next Button - Mobile: rectangular below card, Desktop: circular on side */}
        {isMobile ? (
          <button
            onClick={handleNext}
            disabled={currentIndex === plays.length - 1}
            className={`absolute z-20 h-12 rounded-lg bg-white shadow-lg flex items-center justify-center gap-2 transition-all ${
              currentIndex === plays.length - 1
                ? 'text-gray-300 cursor-not-allowed opacity-50'
                : 'text-gray-700 hover:bg-gray-50 hover:shadow-xl active:scale-95'
            }`}
            style={{ 
              right: '8px',
              width: `calc(50% - 12px)`,
              top: `calc(100% + 16px)`
            }}
            aria-label="Next play"
          >
            <span className="text-sm font-medium">Next</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ) : (
          <button
            onClick={handleNext}
            disabled={currentIndex === plays.length - 1}
            className={`absolute z-20 w-12 h-12 rounded-full bg-white shadow-lg flex items-center justify-center transition-all ${
              currentIndex === plays.length - 1
                ? 'text-gray-300 cursor-not-allowed opacity-50'
                : 'text-gray-700 hover:bg-gray-50 hover:shadow-xl active:scale-95'
            }`}
            style={{ 
              right: `calc(50% - ${canvasSize / 2}px - 80px)`, 
              top: '50%', 
              transform: 'translateY(-50%)' 
            }}
            aria-label="Next play"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>

      {/* Keyboard hint */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-gray-400">
        Use ← → arrow keys to navigate
      </div>
      </>
      ) : (
        /* Grid View */
        <div className="p-6 pt-24 overflow-y-auto h-[calc(100vh-80px)]">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-7xl mx-auto">
             {plays.map((play, index) => {
               const gridCardSize = 280;
               const gridCardHeight = gridCardSize * 1.15; // 15% taller to show more of the play
              const playAllPoints: { x: number; y: number }[] = [];
              
              play.players?.forEach(player => {
                playAllPoints.push({ x: player.x, y: player.y });
              });
              
              play.routes?.forEach(route => {
                route.points?.forEach(point => {
                  playAllPoints.push(point);
                });
              });
              
              play.textBoxes?.forEach(textBox => {
                playAllPoints.push({ x: textBox.x, y: textBox.y });
              });
              
              play.circles?.forEach(circle => {
                playAllPoints.push({ x: circle.x - circle.radius, y: circle.y - circle.radius });
                playAllPoints.push({ x: circle.x + circle.radius, y: circle.y + circle.radius });
              });
              
              play.footballs?.forEach(football => {
                playAllPoints.push({ x: football.x, y: football.y });
              });
              
              if (playAllPoints.length === 0) {
                playAllPoints.push({ x: 400, y: 400 });
              }
              
              const playMinX = Math.min(...playAllPoints.map(p => p.x));
              const playMaxX = Math.max(...playAllPoints.map(p => p.x));
              const playMinY = Math.min(...playAllPoints.map(p => p.y));
              const playMaxY = Math.max(...playAllPoints.map(p => p.y));
              
              const playWidth = playMaxX - playMinX || 800;
              const playHeight = playMaxY - playMinY || 800;
              const playCenterX = (playMinX + playMaxX) / 2;
              const playCenterY = (playMinY + playMaxY) / 2;
              
              const playPadding = Math.max(playWidth, playHeight) * 0.1;
              // Use more of the available canvas space (80% instead of 70%)
              const availableHeight = gridCardHeight - 70 - 50; // top title (70px) + bottom panel (50px)
              const availableWidth = gridCardSize;
              const playScaleX = (availableWidth * 0.8) / (playWidth + playPadding * 2);
              const playScaleY = (availableHeight * 0.8) / (playHeight + playPadding * 2);
              const playFinalScale = Math.min(playScaleX, playScaleY, 1);
              
              // Center the play in the available canvas space
              const canvasCenterX = availableWidth / 2;
              const canvasCenterY = availableHeight / 2;
              const playOffsetX = canvasCenterX - playCenterX * playFinalScale;
              const playOffsetY = canvasCenterY - playCenterY * playFinalScale;
              
              return (
                 <div
                   key={play.id}
                   className="relative bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow cursor-pointer"
                   style={{ width: gridCardSize, height: gridCardHeight }}
                   onClick={() => {
                     setCurrentIndex(index);
                     setViewMode('stack');
                   }}
                 >
                  {/* Play Name - White background overlay */}
                  <div className="absolute top-0 left-0 right-0 z-20 bg-white rounded-t-lg pb-2">
                    <div className="px-3 pt-3">
                      <h3 className="text-lg font-bold text-gray-900 truncate">{play.name}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {index + 1} of {plays.length}
                      </p>
                    </div>
                  </div>

                  {/* Canvas */}
                  <div className="absolute left-0 right-0" style={{ top: '70px', bottom: '50px', overflow: 'visible' }}>
                    <canvas
                      width={gridCardSize}
                      height={gridCardHeight - 70 - 50}
                      style={{ display: 'block', width: '100%', height: '100%' }}
                      ref={(canvas) => {
                        if (!canvas) return;
                        const ctx = canvas.getContext('2d');
                        if (!ctx) return;

                        const canvasHeight = gridCardHeight - 70 - 50;
                        ctx.fillStyle = '#ffffff';
                        ctx.fillRect(0, 0, gridCardSize, canvasHeight);

                        ctx.strokeStyle = '#e5e7eb';
                        ctx.lineWidth = 1;

                        for (let i = 1; i < 10; i++) {
                          const y = (canvasHeight * i) / 10;
                          ctx.beginPath();
                          ctx.moveTo(0, y);
                          ctx.lineTo(gridCardSize, y);
                          ctx.stroke();
                        }

                        const hashWidth = gridCardSize * 0.01;
                        const hashHeight = canvasHeight * 0.02;
                        for (let i = 0; i < 10; i++) {
                          const y = (canvasHeight * i) / 10;
                          const leftX = gridCardSize * 0.1;
                          const rightX = gridCardSize * 0.9;
                          ctx.fillStyle = '#e5e7eb';
                          ctx.fillRect(leftX, y - hashHeight / 2, hashWidth, hashHeight);
                          ctx.fillRect(rightX, y - hashHeight / 2, hashWidth, hashHeight);
                        }

                        ctx.fillStyle = '#e5e7eb';
                        ctx.fillRect(0, 0, gridCardSize, 2);
                        ctx.fillRect(0, canvasHeight - 2, gridCardSize, 2);

                        ctx.save();
                        ctx.translate(playOffsetX, playOffsetY);
                        ctx.scale(playFinalScale, playFinalScale);

                        play.routes?.forEach(route => {
                          if (!route.points || route.points.length === 0) return;
                          const routeColor = (route as { color?: string }).color || '#000000';
                          ctx.strokeStyle = routeColor === 'black' ? '#000000' : routeColor;
                          ctx.lineWidth = 2;
                          ctx.setLineDash(route.style === 'dashed' ? [8, 4] : []);

                          ctx.beginPath();
                          route.points.forEach((point, idx) => {
                            if (idx === 0) {
                              ctx.moveTo(point.x, point.y);
                            } else {
                              if (route.lineBreakType === 'rigid') {
                                ctx.lineTo(point.x, point.y);
                              } else if (route.lineBreakType === 'smooth') {
                                const prevPoint = route.points[idx - 1];
                                const nextPoint = route.points[idx + 1] || point;
                                const cp1x = prevPoint.x + (point.x - prevPoint.x) * 0.5;
                                const cp1y = prevPoint.y + (point.y - prevPoint.y) * 0.5;
                                const cp2x = point.x - (nextPoint.x - point.x) * 0.5;
                                const cp2y = point.y - (nextPoint.y - point.y) * 0.5;
                                ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, point.x, point.y);
                              } else {
                                ctx.lineTo(point.x, point.y);
                              }
                            }
                          });
                          ctx.stroke();
                          ctx.setLineDash([]);

                          if (route.points.length > 1) {
                            const lastPoint = route.points[route.points.length - 1];
                            const secondLastPoint = route.points[route.points.length - 2];
                            const angle = Math.atan2(lastPoint.y - secondLastPoint.y, lastPoint.x - secondLastPoint.x);
                            
                            const endpointType = (route as { endpointType?: 'arrow' | 'dot' | 'none' }).endpointType;
                            if (endpointType === 'arrow' || (endpointType === undefined && route.lineBreakType !== 'none' && route.lineBreakType !== 'smooth-none')) {
                              ctx.fillStyle = routeColor === 'black' ? '#000000' : routeColor;
                              ctx.beginPath();
                              ctx.moveTo(lastPoint.x, lastPoint.y);
                              ctx.lineTo(
                                lastPoint.x - 8 * Math.cos(angle - Math.PI / 6),
                                lastPoint.y - 8 * Math.sin(angle - Math.PI / 6)
                              );
                              ctx.lineTo(
                                lastPoint.x - 8 * Math.cos(angle + Math.PI / 6),
                                lastPoint.y - 8 * Math.sin(angle + Math.PI / 6)
                              );
                              ctx.closePath();
                              ctx.fill();
                            } else if (endpointType === 'dot') {
                              ctx.fillStyle = routeColor === 'black' ? '#000000' : routeColor;
                              ctx.beginPath();
                              ctx.arc(lastPoint.x, lastPoint.y, 4, 0, Math.PI * 2);
                              ctx.fill();
                            }
                          }
                        });

                        const colors = {
                          qb: '#000000',
                          yellow: '#eab308',
                          blue: '#3b82f6',
                          green: '#22c55e',
                          red: '#ef4444'
                        };

                        const labels = {
                          qb: 'QB',
                          yellow: 'C',
                          blue: '',
                          green: '',
                          red: ''
                        };

                        play.players?.forEach(player => {
                          const color = colors[player.color as keyof typeof colors] || '#000000';
                          const label = labels[player.color as keyof typeof labels] || '';

                          ctx.fillStyle = color;
                          ctx.beginPath();
                          ctx.arc(player.x, player.y, 12, 0, Math.PI * 2);
                          ctx.fill();

                          if (label) {
                            ctx.fillStyle = '#ffffff';
                            ctx.font = 'bold 10px Arial';
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'middle';
                            ctx.fillText(label, player.x, player.y);
                          }
                        });

                        ctx.restore();
                      }}
                    />
                  </div>

                  {/* Action Buttons at Bottom */}
                  <div className="absolute bottom-0 left-0 right-0 z-20 bg-white rounded-b-lg pt-1.5 pb-2 px-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentIndex(index);
                          handleSavePlay();
                        }}
                        disabled={saving || !user}
                        className={`p-2 rounded-lg transition-all ${
                          saving || !user
                            ? 'text-gray-300 cursor-not-allowed'
                            : 'text-blue-400 hover:bg-blue-50 active:scale-95'
                        }`}
                        title="Save play"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                        </svg>
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setCurrentIndex(index);
                          const playToRemix = plays[index];
                          localStorage.setItem('editingPlay', JSON.stringify(playToRemix));
                          router.push('/');
                        }}
                        className="p-2 rounded-lg text-purple-400 hover:bg-purple-50 active:scale-95 transition-all"
                        title="Remix play"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </button>

                      {play.playNotes && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentIndex(index);
                            setShowPlayNotes(!showPlayNotes);
                          }}
                          className={`p-2 rounded-lg transition-all ${
                            showPlayNotes && currentIndex === index
                              ? 'text-indigo-400 bg-indigo-50'
                              : 'text-indigo-400 hover:bg-indigo-50'
                          } active:scale-95`}
                          title="Show notes"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

