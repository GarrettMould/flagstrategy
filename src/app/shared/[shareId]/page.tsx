'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getSharedFolder } from '../../firebase';

export default function SharedFolderPage() {
  const params = useParams();
  const shareId = params.shareId as string;
  const [testMessage, setTestMessage] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadTest = async () => {
      try {
        setLoading(true);
        console.log('Loading test data, shareId:', shareId);
        
        const folder = await getSharedFolder(shareId);
        console.log('Received folder:', folder);
        
        if (folder) {
          // Just get the folder name as a simple test
          setTestMessage(`Folder name: ${folder.folderName || 'No name'}`);
          console.log('Success! Folder name:', folder.folderName);
        } else {
          setError('Folder not found');
        }
      } catch (err) {
        console.error('Error loading folder:', err);
        setError(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
    };

    if (shareId) {
      loadTest();
    }
  }, [shareId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg text-gray-600">Loading...</div>
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

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Simple Test Page</h1>
        <p className="text-xl text-gray-700 mb-4">{testMessage || 'No message'}</p>
        <p className="text-sm text-gray-500 mb-4">Share ID: {shareId}</p>
        <Link href="/" className="text-blue-600 hover:text-blue-800 underline">Go to Play Builder</Link>
      </div>
    </div>
  );
}
