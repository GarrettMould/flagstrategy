'use client';

import { useState, useEffect } from 'react';
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
  const [showPlayNotes, setShowPlayNotes] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

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

  const handleNext = () => {
    if (currentIndex < plays.length - 1) {
      setIsFlipping(true);
      setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
        setIsFlipping(false);
      }, 150);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setIsFlipping(true);
      setTimeout(() => {
        setCurrentIndex(prev => prev - 1);
        setIsFlipping(false);
      }, 150);
    }
  };

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

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && currentIndex > 0) {
        setIsFlipping(true);
        setTimeout(() => {
          setCurrentIndex(prev => prev - 1);
          setIsFlipping(false);
        }, 150);
      }
      if (e.key === 'ArrowRight' && currentIndex < plays.length - 1) {
        setIsFlipping(true);
        setTimeout(() => {
          setCurrentIndex(prev => prev + 1);
          setIsFlipping(false);
        }, 150);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentIndex, plays.length]);

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
  const canvasSize = 600;

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
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex items-center justify-center h-[calc(100vh-80px)] relative">
        {/* Previous Button */}
        <button
          onClick={handlePrevious}
          disabled={currentIndex === 0}
          className={`absolute left-8 z-10 p-4 rounded-full transition-all ${
            currentIndex === 0
              ? 'text-gray-300 cursor-not-allowed'
              : 'text-gray-700 hover:bg-white hover:shadow-lg active:scale-95'
          }`}
          aria-label="Previous play"
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Play Card */}
        <div
          className={`relative bg-white rounded-lg shadow-2xl transition-all duration-300 overflow-hidden ${
            isFlipping ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
          }`}
          style={{ width: canvasSize, height: canvasSize }}
        >
          {/* Play Name */}
          <div className="absolute top-4 left-4 right-4 z-10">
            <h2 className="text-2xl font-bold text-gray-900">{currentPlay.name}</h2>
            <p className="text-sm text-gray-500 mt-1">
              {currentIndex + 1} of {plays.length}
            </p>
          </div>

          {/* Canvas - Cropped to show only top portion */}
          <div className="absolute top-0 left-0 right-0" style={{ height: `${canvasSize * 0.75}px`, overflow: 'hidden' }}>
            <canvas
              width={canvasSize}
              height={canvasSize}
              className="rounded-t-lg"
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

                ctx.strokeStyle = route.color === 'black' ? '#000000' : route.color;
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
                  
                  ctx.fillStyle = route.color === 'black' ? '#000000' : route.color;
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
          <div className="absolute bottom-4 left-4 z-10 flex items-center gap-4">
            {/* Save Button */}
            <button
              onClick={handleSavePlay}
              disabled={saving || !user}
              className={`p-4 rounded-lg transition-all ${
                saving || !user
                  ? 'text-gray-300 cursor-not-allowed'
                  : saveSuccess
                  ? 'text-green-400 bg-green-50'
                  : 'text-blue-400 hover:bg-blue-50 active:scale-95'
              }`}
              title={!user ? 'Log in to save' : saveSuccess ? 'Saved!' : 'Save play'}
            >
              {saveSuccess ? (
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              )}
            </button>

            {/* Remix Button */}
            <button
              onClick={handleRemixPlay}
              className="p-4 rounded-lg text-purple-400 hover:bg-purple-50 active:scale-95 transition-all"
              title="Remix play"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>

            {/* Play Notes Toggle Button */}
            {currentPlay.playNotes && (
              <button
                onClick={() => setShowPlayNotes(!showPlayNotes)}
                className={`p-4 rounded-lg transition-all ${
                  showPlayNotes
                    ? 'text-indigo-400 bg-indigo-50'
                    : 'text-indigo-400 hover:bg-indigo-50'
                } active:scale-95`}
                title={showPlayNotes ? 'Hide notes' : 'Show notes'}
              >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </button>
            )}
          </div>

          {/* Play Notes */}
          {currentPlay.playNotes && showPlayNotes && (
            <div className="absolute bottom-24 left-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 border border-gray-200">
              <p className="text-sm text-gray-700">{currentPlay.playNotes}</p>
            </div>
          )}
        </div>

        {/* Next Button */}
        <button
          onClick={handleNext}
          disabled={currentIndex === plays.length - 1}
          className={`absolute right-8 z-10 p-4 rounded-full transition-all ${
            currentIndex === plays.length - 1
              ? 'text-gray-300 cursor-not-allowed'
              : 'text-gray-700 hover:bg-white hover:shadow-lg active:scale-95'
          }`}
          aria-label="Next play"
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Keyboard hint */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-gray-400">
        Use ← → arrow keys to navigate
      </div>
    </div>
  );
}

