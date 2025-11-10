'use client';

import Link from 'next/link';
import { useAuth } from './contexts/AuthContext';

export default function HomePage() {
  const { user } = useAuth();

    return (
    <div className="min-h-screen bg-white font-sans">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-6">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-white border-r-0 border-t-0 rounded-tl-full"></div>
          </div>
          <span className="text-gray-800 font-medium text-lg tracking-tight">Play Builder</span>
        </div>

        {/* Announcement Banner */}
        <div className="flex items-center gap-3 px-4 py-2.5 bg-blue-50 rounded-lg border border-blue-100">
          <div className="w-6 h-6 bg-blue-500 rounded flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
            </div>
          <div>
            <div className="text-sm font-medium text-gray-800">New Features</div>
            <div className="text-xs text-gray-600">Check out what&apos;s new</div>
          </div>
    </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-8 py-20">
        {/* Headline */}
        <h1 className="text-6xl md:text-7xl font-bold text-gray-900 leading-[1.1] mb-16 max-w-4xl tracking-tight">
          Design professional football plays
          with an intuitive drag-and-drop
          play builder.
            </h1>

        {/* Illustrative Icons */}
        <div className="relative mt-20 h-96 flex items-center justify-center overflow-visible">
          {/* Blue Card/Document */}
          <div className="absolute left-0 top-10 w-48 h-56 bg-blue-100 rounded-xl shadow-lg border-2 border-white transform rotate-[-5deg] z-10">
        <div className="p-4">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
            </div>
              <div className="space-y-2.5">
                <div className="h-1.5 bg-blue-300 rounded w-3/4"></div>
                <div className="h-1.5 bg-blue-300 rounded w-full"></div>
                <div className="h-1.5 bg-blue-300 rounded w-5/6"></div>
                <div className="h-1.5 bg-blue-300 rounded w-4/5"></div>
                <div className="h-1.5 bg-blue-300 rounded w-2/3"></div>
          </div>
        </div>
      </div>

          {/* Blue Checkmark Badge (wavy edges) */}
          <div className="absolute left-16 top-32 w-24 h-24 bg-blue-500 shadow-lg border-2 border-white transform rotate-12 z-20" style={{
            clipPath: 'polygon(20% 0%, 80% 0%, 100% 20%, 100% 80%, 80% 100%, 20% 100%, 0% 80%, 0% 20%)'
          }}>
            <div className="flex items-center justify-center h-full">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
              </div>
            </div>

          {/* Green Ticket with Stars (wavy top edge) */}
          <div className="absolute right-32 top-8 w-52 h-64 bg-gradient-to-br from-green-400 to-green-600 shadow-lg border-2 border-white transform rotate-6 z-10 rounded-b-2xl" style={{
            clipPath: 'polygon(0% 15%, 5% 10%, 10% 15%, 15% 10%, 20% 15%, 25% 10%, 30% 15%, 35% 10%, 40% 15%, 45% 10%, 50% 15%, 55% 10%, 60% 15%, 65% 10%, 70% 15%, 75% 10%, 80% 15%, 85% 10%, 90% 15%, 95% 10%, 100% 15%, 100% 100%, 0% 100%)'
          }}>
            <div className="p-6 h-full flex flex-col pt-12">
              <div className="flex-1 grid grid-cols-3 gap-3">
                {[...Array(9)].map((_, i) => (
                  <div key={i} className="flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-900" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                  </div>
                ))}
        </div>
      </div>
      </div>

          {/* Gold Trophy */}
          <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-40 z-30">
            <div className="relative h-full">
              {/* Trophy cup */}
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-20 h-24 bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 rounded-t-2xl shadow-2xl border-2 border-white"></div>
              {/* Trophy handles */}
              <div className="absolute top-4 -left-2 w-5 h-14 bg-gradient-to-br from-yellow-500 to-yellow-700 rounded-full transform -rotate-12 border-2 border-white"></div>
              <div className="absolute top-4 -right-2 w-5 h-14 bg-gradient-to-br from-yellow-500 to-yellow-700 rounded-full transform rotate-12 border-2 border-white"></div>
              {/* Trophy base */}
              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-16 h-8 bg-gradient-to-br from-yellow-500 to-yellow-700 rounded-lg border-2 border-white"></div>
      </div>
      </div>

          {/* Play Icon (replacing Solana logo) */}
          <div className="absolute right-16 top-1/2 transform -translate-y-1/2 w-20 h-20 bg-gray-900 rounded-full shadow-lg border-2 border-white z-20 flex items-center justify-center">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
          </div>

          {/* Basketball */}
          <div className="absolute right-0 top-20 w-28 h-28 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full shadow-lg border-2 border-white transform rotate-12 z-10">
            <div className="relative w-full h-full">
              {/* Basketball lines */}
              <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-black/30 transform -translate-y-1/2"></div>
              <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-black/30 transform -translate-x-1/2"></div>
              <div className="absolute top-1/4 left-1/4 w-1/2 h-0.5 bg-black/30 transform rotate-45 origin-center"></div>
              <div className="absolute bottom-1/4 left-1/4 w-1/2 h-0.5 bg-black/30 transform -rotate-45 origin-center"></div>
              </div>
              </div>
            </div>
            
        {/* CTA Buttons */}
        <div className="flex items-center gap-4 mt-20">
          <Link
            href={user ? "/builder" : "/login"}
            className="px-8 py-4 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors text-lg"
          >
            {user ? 'Go to Play Builder' : 'Get Started'}
          </Link>
          <Link
            href="/my-plays"
            className="px-8 py-4 bg-white text-gray-900 rounded-lg font-medium border-2 border-gray-300 hover:border-gray-400 transition-colors text-lg"
          >
            View My Plays
          </Link>
            </div>
      </main>
    </div>
  );
}

