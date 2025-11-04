'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function SharedFolderPage() {
  const params = useParams();
  const shareId = params.shareId as string;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Ultra Simple Test</h1>
        <p className="text-xl text-gray-700 mb-4">Share ID: {shareId || 'No ID'}</p>
        <p className="text-sm text-gray-500 mb-4">If you see this, the route works!</p>
        <Link href="/" className="text-blue-600 hover:text-blue-800 underline">Go to Play Builder</Link>
      </div>
    </div>
  );
}
