'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getSharedFolder } from '../../firebase';

export default function SharedFolderPage() {
  const params = useParams();
  const shareId = params.shareId as string;
  const [fetchedShareId, setFetchedShareId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

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
        
        if (folder && folder.shareId) {
          setFetchedShareId(folder.shareId);
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

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Shared Folder Viewer</h1>
        
        {loading && (
          <p className="text-lg text-gray-600 mb-4">Loading...</p>
        )}
        
        {error && (
          <div className="mb-4">
            <p className="text-lg text-red-600 mb-2">Error: {error}</p>
            <p className="text-sm text-gray-500">URL Share ID: {shareId || 'No ID'}</p>
          </div>
        )}
        
        {fetchedShareId && !error && (
          <div className="mb-4">
            <p className="text-xl text-gray-700 mb-2">Fetched Share ID:</p>
            <p className="text-lg font-mono text-gray-900 bg-gray-100 px-4 py-2 rounded">
              {fetchedShareId}
            </p>
            <p className="text-sm text-gray-500 mt-2">✓ Successfully fetched from Firestore!</p>
          </div>
        )}
        
        <Link href="/" className="text-blue-600 hover:text-blue-800 underline">
          Go to Play Builder
        </Link>
      </div>
    </div>
  );
}
