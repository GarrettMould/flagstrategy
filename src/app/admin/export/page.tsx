'use client';

import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { exportAllPlaysAsJSON, exportPlaysForLLM, downloadPlaysAsJSON } from '../../utils/exportPlays';
import { PLAY_GENERATION_PROMPT, generatePlayPrompt, EXAMPLE_PROMPTS } from '../../utils/llmPlayGenerationPrompt';
import Header from '../../components/Header';

export default function ExportPlays() {
  const { user } = useAuth();
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<string>('');

  const handleExportAll = async () => {
    setIsExporting(true);
    setExportStatus('Exporting all plays...');
    
    try {
      const json = await exportAllPlaysAsJSON(user?.uid);
      downloadPlaysAsJSON(json, `all-plays-${new Date().toISOString().split('T')[0]}.json`);
      setExportStatus(`Successfully exported! Downloaded all-plays-${new Date().toISOString().split('T')[0]}.json`);
    } catch (error) {
      console.error('Export error:', error);
      setExportStatus('Error exporting plays. Check console for details.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportForLLM = async () => {
    setIsExporting(true);
    setExportStatus('Exporting plays for LLM training...');
    
    try {
      const json = await exportPlaysForLLM(user?.uid);
      downloadPlaysAsJSON(json, `plays-for-llm-${new Date().toISOString().split('T')[0]}.json`);
      setExportStatus(`Successfully exported! Downloaded plays-for-llm-${new Date().toISOString().split('T')[0]}.json`);
    } catch (error) {
      console.error('Export error:', error);
      setExportStatus('Error exporting plays. Check console for details.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Export Plays for LLM Training</h1>
        <p className="text-gray-600 mb-8">
          Export all plays from Firebase (community plays + your plays) as JSON for LLM training.
        </p>

        <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
          <div>
            <h2 className="text-xl font-semibold mb-2">Export Options</h2>
            <p className="text-gray-600 mb-4">
              Choose the format that best suits your LLM training needs.
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleExportAll}
              disabled={isExporting}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {isExporting ? 'Exporting...' : 'Export All Plays (Raw JSON)'}
            </button>

            <button
              onClick={handleExportForLLM}
              disabled={isExporting}
              className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {isExporting ? 'Exporting...' : 'Export for LLM (With Schema & Examples)'}
            </button>
          </div>

          {exportStatus && (
            <div className={`mt-4 p-4 rounded-lg ${
              exportStatus.includes('Error') 
                ? 'bg-red-50 text-red-700' 
                : 'bg-green-50 text-green-700'
            }`}>
              {exportStatus}
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold mb-3">About the Export Formats</h3>
            <div className="space-y-3 text-sm text-gray-600">
              <div>
                <strong className="text-gray-900">Raw JSON:</strong> Simple array of all plays with minimal metadata. 
                Best for direct LLM fine-tuning or when you want full control over the format.
              </div>
              <div>
                <strong className="text-gray-900">LLM Format:</strong> Includes schema description, example plays, 
                and all plays. Best for prompt engineering and few-shot learning approaches.
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold mb-3">Play Structure</h3>
            <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto text-xs">
{`{
  "id": "string",
  "name": "string",
  "players": [
    {
      "id": "string",
      "x": number,
      "y": number,
      "color": "string",
      "type": "offense" | "defense"
    }
  ],
  "routes": [
    {
      "id": "string",
      "points": [{ "x": number, "y": number }],
      "style": "solid" | "dashed",
      "lineBreakType": "rigid" | "smooth" | "none" | "smooth-none"
    }
  ],
  "playerRouteAssociations": {
    "playerId": ["routeId1", "routeId2"]
  },
  "textBoxes": [...],
  "circles": [...],
  "footballs": [...],
  "playNotes": "string"
}`}
            </pre>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold mb-3">LLM Play Generation Prompt</h3>
            <p className="text-sm text-gray-600 mb-4">
              Use this prompt to guide LLMs in generating high-quality plays. Copy it to your LLM interface.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(PLAY_GENERATION_PROMPT);
                  alert('Base prompt copied to clipboard!');
                }}
                className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
              >
                Copy Base Prompt
              </button>
              <button
                onClick={() => {
                  const customPrompt = generatePlayPrompt({
                    formation: 'Trips Right',
                    situation: 'red-zone',
                    count: 5
                  });
                  navigator.clipboard.writeText(customPrompt);
                  alert('Example prompt (Trips Right, Red Zone) copied!');
                }}
                className="w-full px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors text-sm font-medium"
              >
                Copy Example Prompt (Trips Right, Red Zone)
              </button>
            </div>
            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                View Full Prompt
              </summary>
              <pre className="mt-2 bg-gray-50 p-4 rounded-lg overflow-x-auto text-xs max-h-96 overflow-y-auto">
                {PLAY_GENERATION_PROMPT}
              </pre>
            </details>
          </div>
        </div>
      </div>
    </div>
  );
}

