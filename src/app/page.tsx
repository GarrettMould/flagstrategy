'use client';

import Link from 'next/link';
import { useAuth } from './contexts/AuthContext';

export default function HomePage() {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

    return (
    <div className="min-h-screen bg-white font-sans">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-6">
        {/* Site Title */}
        <div className="flex items-center">
          <Link href="/" className="flex flex-col hover:opacity-80 transition-opacity">
            <span className="text-gray-900 font-extrabold text-2xl tracking-tight">Flag Plays</span>
            <span className="text-gray-500 text-xs font-normal">by Flag Dojo</span>
          </Link>
        </div>

        {/* Navigation Links */}
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
          <Link 
            href="/playbooks" 
            className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            Playbooks
          </Link>
          <Link 
            href="/community-plays" 
            className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            Community Plays
          </Link>
          <Link 
            href="/coaching-resources" 
            className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            Coaching Resources
          </Link>
        </div>

        {/* Login/Logout Button */}
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
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-8 py-8 flex flex-col justify-center min-h-[calc(100vh-120px)]">
        {/* Headline */}
        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 leading-[1.1] mb-8 max-w-4xl tracking-tight">
          Design professional football plays
          with an intuitive drag-and-drop
          play builder.
            </h1>
            
        {/* CTA Buttons */}
        <div className="flex items-center gap-4">
          <Link
            href="/builder"
            className="px-8 py-4 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors text-lg"
          >
            Play Builder
          </Link>
          <Link
            href="/my-plays"
            className="px-8 py-4 bg-white text-gray-900 rounded-lg font-medium border-2 border-gray-300 hover:border-gray-400 transition-colors text-lg"
          >
            My Plays
          </Link>
            </div>
      </main>
    </div>
  );
}

