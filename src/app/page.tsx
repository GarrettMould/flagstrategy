'use client';

import Link from 'next/link';
import Header from './components/Header';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white font-sans">
      <Header />

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-8 flex flex-col justify-center min-h-[calc(100vh-120px)]">
        {/* Headline */}
        <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-[1.1] mb-6 md:mb-8 max-w-4xl tracking-tight">
          Design professional football plays
          with an intuitive drag-and-drop
          play builder.
            </h1>
            
        {/* CTA Buttons */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 md:gap-4">
          <Link
            href="/builder"
            className="w-full md:w-auto px-6 md:px-8 py-3 md:py-4 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors text-base md:text-lg text-center"
          >
            Play Builder
          </Link>
          <Link
            href="/my-plays"
            className="w-full md:w-auto px-6 md:px-8 py-3 md:py-4 bg-white text-gray-900 rounded-lg font-medium border-2 border-gray-300 hover:border-gray-400 transition-colors text-base md:text-lg text-center"
          >
            My Plays
          </Link>
            </div>
      </main>
    </div>
  );
}

