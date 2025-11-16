import { SavedPlay } from '../firebase';

// Special folder ID for local-only LLM-generated plays
export const LOCAL_LLM_FOLDER_ID = '__local_llm_plays__';
export const LOCAL_LLM_FOLDER_NAME = 'LLM Generated Plays';

// LLM-generated plays JSON (only exists locally, never synced to Firebase)
const LLM_PLAYS_JSON = {
  "totalPlays": 4,
  "allPlays": [
    {
      "id": "play-1763290001",
            "name": "Trips Right, Flood",
            "players": [
              {
                "id": "p-1-qb",
                "x": 400,
                "y": 460,
                "type": "offense",
                "color": "qb"
              },
              {
                "id": "p-1-c",
                "x": 400,
                "y": 400,
                "type": "offense",
                "color": "yellow"
              },
              {
                "id": "p-1-wr1",
                "x": 200,
                "y": 400,
                "type": "offense",
                "color": "blue"
              },
              {
                "id": "p-1-wr2",
                "x": 500,
                "y": 400,
                "type": "offense",
                "color": "green"
              },
              {
                "id": "p-1-wr3",
                "x": 575,
                "y": 400,
                "type": "offense",
                "color": "red"
              },
              {
                "id": "p-1-wr4",
                "x": 650,
                "y": 400,
                "type": "offense",
                "color": "blue"
              }
            ],
            "routes": [
              {
                "id": "r-1-1",
                "color": "black",
                "style": "dashed",
                "lineBreakType": "none",
                "endpointType": "none",
                "points": [
                  { "x": 400, "y": 400 },
                  { "x": 400, "y": 395 }
                ]
              },
              {
                "id": "r-1-2",
                "color": "black",
                "style": "solid",
                "lineBreakType": "rigid",
                "endpointType": "arrow",
                "points": [
                  { "x": 400, "y": 395 },
                  { "x": 400, "y": 350 }
                ]
              },
              {
                "id": "r-1-3",
                "color": "black",
                "style": "solid",
                "lineBreakType": "rigid",
                "endpointType": "arrow",
                "points": [
                  { "x": 200, "y": 400 },
                  { "x": 200, "y": 280 },
                  { "x": 350, "y": 280 }
                ]
              },
              {
                "id": "r-1-4",
                "color": "black",
                "style": "solid",
                "lineBreakType": "rigid",
                "endpointType": "arrow",
                "points": [
                  { "x": 500, "y": 400 },
                  { "x": 500, "y": 300 },
                  { "x": 575, "y": 300 }
                ]
              },
              {
                "id": "r-1-5",
                "color": "black",
                "style": "solid",
                "lineBreakType": "rigid",
                "endpointType": "arrow",
                "points": [
                  { "x": 575, "y": 400 },
                  { "x": 575, "y": 150 }
                ]
              },
              {
                "id": "r-1-6",
                "color": "black",
                "style": "solid",
                "lineBreakType": "smooth",
                "endpointType": "arrow",
                "points": [
                  { "x": 650, "y": 400 },
                  { "x": 675, "y": 395 }
                ]
              }
            ],
            "playerRouteAssociations": {
              "p-1-c": ["r-1-1", "r-1-2"],
              "p-1-wr1": ["r-1-3"],
              "p-1-wr2": ["r-1-4"],
              "p-1-wr3": ["r-1-5"],
              "p-1-wr4": ["r-1-6"]
            },
            "playNotes": "Trips Flood concept (3-level). QB reads high-to-low on the right side. 1. Deep Fade (Red). 2. Medium Out (Green). 3. Short Flat (Blue). 4. Center Sit (Yellow) is the checkdown. The backside Dig (Blue) occupies the safety."
          },
          {
            "id": "play-1763290002",
            "name": "Spread, Mesh",
            "players": [
              {
                "id": "p-2-qb",
                "x": 400,
                "y": 450,
                "type": "offense",
                "color": "qb"
              },
              {
                "id": "p-2-c",
                "x": 400,
                "y": 400,
                "type": "offense",
                "color": "yellow"
              },
              {
                "id": "p-2-wr1",
                "x": 150,
                "y": 400,
                "type": "offense",
                "color": "blue"
              },
              {
                "id": "p-2-wr2",
                "x": 250,
                "y": 400,
                "type": "offense",
                "color": "green"
              },
              {
                "id": "p-2-wr3",
                "x": 550,
                "y": 400,
                "type": "offense",
                "color": "red"
              },
              {
                "id": "p-2-wr4",
                "x": 650,
                "y": 400,
                "type": "offense",
                "color": "blue"
              }
            ],
            "routes": [
              {
                "id": "r-2-1",
                "color": "black",
                "style": "solid",
                "lineBreakType": "rigid",
                "endpointType": "arrow",
                "points": [
                  { "x": 400, "y": 400 },
                  { "x": 400, "y": 280 }
                ]
              },
              {
                "id": "r-2-2",
                "color": "black",
                "style": "solid",
                "lineBreakType": "rigid",
                "endpointType": "arrow",
                "points": [
                  { "x": 150, "y": 400 },
                  { "x": 150, "y": 100 }
                ]
              },
              {
                "id": "r-2-3",
                "color": "black",
                "style": "solid",
                "lineBreakType": "smooth",
                "endpointType": "arrow",
                "points": [
                  { "x": 250, "y": 400 },
                  { "x": 500, "y": 350 }
                ]
              },
              {
                "id": "r-2-4",
                "color": "black",
                "style": "solid",
                "lineBreakType": "smooth",
                "endpointType": "arrow",
                "points": [
                  { "x": 550, "y": 400 },
                  { "x": 300, "y": 355 }
                ]
              },
              {
                "id": "r-2-5",
                "color": "black",
                "style": "solid",
                "lineBreakType": "rigid",
                "endpointType": "arrow",
                "points": [
                  { "x": 650, "y": 400 },
                  { "x": 650, "y": 250 },
                  { "x": 550, "y": 150 }
                ]
              }
            ],
            "playerRouteAssociations": {
              "p-2-c": ["r-2-1"],
              "p-2-wr1": ["r-2-2"],
              "p-2-wr2": ["r-2-3"],
              "p-2-wr3": ["r-2-4"],
              "p-2-wr4": ["r-2-5"]
            },
            "playNotes": "Man-beater. QB watches the mesh point. 1. Read the Drag routes (Green, Red) and throw to whoever gets open from the 'rub'. 2. If LBs jump the drags, look to the Center (Yellow) sitting in the middle. 3. Deep shots to Go (Blue) or Corner (Blue)."
          },
          {
            "id": "play-1763290003",
            "name": "Bunch Right, Slant-Wheel",
            "players": [
              {
                "id": "p-3-qb",
                "x": 400,
                "y": 460,
                "type": "offense",
                "color": "qb"
              },
              {
                "id": "p-3-c",
                "x": 400,
                "y": 400,
                "type": "offense",
                "color": "yellow"
              },
              {
                "id": "p-3-wr1",
                "x": 150,
                "y": 400,
                "type": "offense",
                "color": "blue"
              },
              {
                "id": "p-3-wr2",
                "x": 550,
                "y": 395,
                "type": "offense",
                "color": "green"
              },
              {
                "id": "p-3-wr3",
                "x": 555,
                "y": 405,
                "type": "offense",
                "color": "red"
              },
              {
                "id": "p-3-wr4",
                "x": 560,
                "y": 400,
                "type": "offense",
                "color": "blue"
              }
            ],
            "routes": [
              {
                "id": "r-3-1",
                "color": "black",
                "style": "solid",
                "lineBreakType": "rigid",
                "endpointType": "arrow",
                "points": [
                  { "x": 400, "y": 400 },
                  { "x": 400, "y": 350 },
                  { "x": 450, "y": 350 }
                ]
              },
              {
                "id": "r-3-2",
                "color": "black",
                "style": "solid",
                "lineBreakType": "rigid",
                "endpointType": "arrow",
                "points": [
                  { "x": 150, "y": 400 },
                  { "x": 150, "y": 100 }
                ]
              },
              {
                "id": "r-3-3",
                "color": "black",
                "style": "solid",
                "lineBreakType": "rigid",
                "endpointType": "arrow",
                "points": [
                  { "x": 550, "y": 395 },
                  { "x": 500, "y": 350 }
                ]
              },
              {
                "id": "r-3-4",
                "color": "black",
                "style": "solid",
                "lineBreakType": "smooth",
                "endpointType": "arrow",
                "points": [
                  { "x": 555, "y": 405 },
                  { "x": 625, "y": 400 },
                  { "x": 650, "y": 150 }
                ]
              },
              {
                "id": "r-3-5",
                "color": "black",
                "style": "solid",
                "lineBreakType": "smooth",
                "endpointType": "arrow",
                "points": [
                  { "x": 560, "y": 400 },
                  { "x": 620, "y": 400 }
                ]
              }
            ],
            "playerRouteAssociations": {
              "p-3-c": ["r-3-1"],
              "p-3-wr1": ["r-3-2"],
              "p-3-wr2": ["r-3-3"],
              "p-3-wr3": ["r-3-4"],
              "p-3-wr4": ["r-3-5"]
            },
            "playNotes": "Zone-beater. 1. Read the flat defender. If they cover the 'Flat' (Blue), throw the 'Slant' (Green) behind them. 2. If the corner sinks deep, the 'Wheel' (Red) will be wide open. 3. Center (Yellow) is the checkdown."
          },
          {
            "id": "play-1763290004",
            "name": "Goal Line, Double Fade",
            "players": [
              {
                "id": "p-4-qb",
                "x": 400,
                "y": 450,
                "type": "offense",
                "color": "qb"
              },
              {
                "id": "p-4-c",
                "x": 400,
                "y": 400,
                "type": "offense",
                "color": "yellow"
              },
              {
                "id": "p-4-wr1",
                "x": 150,
                "y": 400,
                "type": "offense",
                "color": "blue"
              },
              {
                "id": "p-4-wr2",
                "x": 250,
                "y": 400,
                "type": "offense",
                "color": "green"
              },
              {
                "id": "p-4-wr3",
                "x": 550,
                "y": 400,
                "type": "offense",
                "color": "red"
              },
              {
                "id": "p-4-wr4",
                "x": 650,
                "y": 400,
                "type": "offense",
                "color": "blue"
              }
            ],
            "routes": [
              {
                "id": "r-4-1",
                "color": "black",
                "style": "solid",
                "lineBreakType": "rigid",
                "endpointType": "arrow",
                "points": [
                  { "x": 400, "y": 400 },
                  { "x": 400, "y": 380 }
                ]
              },
              {
                "id": "r-4-2",
                "color": "black",
                "style": "solid",
                "lineBreakType": "smooth",
                "endpointType": "arrow",
                "points": [
                  { "x": 150, "y": 400 },
                  { "x": 125, "y": 350 }
                ]
              },
              {
                "id": "r-4-3",
                "color": "black",
                "style": "solid",
                "lineBreakType": "rigid",
                "endpointType": "arrow",
                "points": [
                  { "x": 250, "y": 400 },
                  { "x": 300, "y": 380 }
                ]
              },
              {
                "id": "r-4-4",
                "color": "black",
                "style": "solid",
                "lineBreakType": "rigid",
                "endpointType": "arrow",
                "points": [
                  { "x": 550, "y": 400 },
                  { "x": 500, "y": 380 }
                ]
              },
              {
                "id": "r-4-5",
                "color": "black",
                "style": "solid",
                "lineBreakType": "smooth",
                "endpointType": "arrow",
                "points": [
                  { "x": 650, "y": 400 },
                  { "x": 675, "y": 350 }
                ]
              }
            ],
            "playerRouteAssociations": {
              "p-4-c": ["r-4-1"],
              "p-4-wr1": ["r-4-2"],
              "p-4-wr2": ["r-4-3"],
              "p-4-wr3": ["r-4-4"],
              "p-4-wr4": ["r-4-5"]
            },
      "playNotes": "Goal line play. QB picks a side. 1. Look for the 'Fade' (Blue) to the pylon. This is a 1-on-1 jump ball. 2. If the Fades are covered, look to the quick 'Slants' (Green or Red) inside. 3. Center (Yellow) is the last resort, sitting on the line."
    }
  ]
};

/**
 * Initialize local LLM plays folder and plays
 * This only runs locally and never syncs to Firebase
 */
export function initializeLocalLLMPlays(): void {
  // Only run in browser environment
  if (typeof window === 'undefined') return;

  try {
    // Check if folder already exists
    const existingFolders = JSON.parse(localStorage.getItem('playFolders') || '[]');
    const folderExists = existingFolders.some((f: { id: string }) => f.id === LOCAL_LLM_FOLDER_ID);

    if (!folderExists) {
      // Create the local folder
      const newFolder = {
        id: LOCAL_LLM_FOLDER_ID,
        name: LOCAL_LLM_FOLDER_NAME,
        createdAt: new Date().toISOString(),
        parentFolderId: null,
        isLocalOnly: true // Flag to prevent Firebase sync
      };

      existingFolders.push(newFolder);
      localStorage.setItem('playFolders', JSON.stringify(existingFolders));
      console.log('Created local LLM plays folder:', newFolder);
    } else {
      console.log('Local LLM plays folder already exists');
    }

    // Check if plays already exist
    const existingPlays = JSON.parse(localStorage.getItem('savedPlays') || '[]');
    const existingPlayIds = new Set(existingPlays.map((p: SavedPlay) => p.id));
    
    // Add plays that don't already exist
    // Type assertion needed because JSON types are inferred as string instead of literal types
    interface LLMPlay {
      id: string;
      name: string;
      players?: Array<{
        id: string;
        x: number;
        y: number;
        color: string;
        type: 'offense' | 'defense';
      }>;
      routes?: Array<{
        id: string;
        points: Array<{ x: number; y: number }>;
        style: 'solid' | 'dashed';
        lineBreakType: 'rigid' | 'smooth' | 'none' | 'smooth-none';
        endpointType?: string;
        [key: string]: unknown;
      }>;
      [key: string]: unknown;
    }
    const playsToAdd: SavedPlay[] = (LLM_PLAYS_JSON.allPlays as LLMPlay[])
      .filter((play: LLMPlay) => !existingPlayIds.has(play.id))
      .map((play: LLMPlay) => {
        // Remove endpointType from routes if present (not part of SavedPlay interface)
        const routes = play.routes?.map((route) => {
          const { endpointType, ...routeWithoutEndpoint } = route;
          return routeWithoutEndpoint;
        }) || [];
        
        return {
          ...play,
          routes,
          folderId: LOCAL_LLM_FOLDER_ID,
          isLocalOnly: true, // Flag to prevent Firebase sync
          createdAt: new Date().toISOString()
        } as SavedPlay;
      });

    if (playsToAdd.length > 0) {
      const updatedPlays = [...existingPlays, ...playsToAdd];
      localStorage.setItem('savedPlays', JSON.stringify(updatedPlays));
      console.log(`Added ${playsToAdd.length} LLM-generated plays to local storage:`, playsToAdd.map(p => p.name));
    } else {
      console.log('No new plays to add (all plays already exist)');
    }
    
    // Log current state for debugging
    const finalFolders = JSON.parse(localStorage.getItem('playFolders') || '[]');
    const finalPlays = JSON.parse(localStorage.getItem('savedPlays') || '[]');
    const llmPlays = finalPlays.filter((p: SavedPlay & { folderId?: string }) => p.folderId === LOCAL_LLM_FOLDER_ID);
    console.log('Local LLM plays state:', {
      folderExists: finalFolders.some((f: { id: string }) => f.id === LOCAL_LLM_FOLDER_ID),
      totalPlays: finalPlays.length,
      llmPlaysCount: llmPlays.length,
      llmPlayNames: llmPlays.map((p: SavedPlay) => p.name)
    });
  } catch (error) {
    console.error('Error initializing local LLM plays:', error);
  }
}

/**
 * Filter out local-only plays and folders before syncing to Firebase
 */
export function filterLocalOnlyData<T extends { id: string; isLocalOnly?: boolean }>(items: T[]): T[] {
  return items.filter(item => !item.isLocalOnly && item.id !== LOCAL_LLM_FOLDER_ID);
}

