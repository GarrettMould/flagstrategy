import { loadUserData, loadCommunityPlays, SavedPlay } from '../firebase';

/**
 * Export all plays from Firebase as JSON for LLM training
 * This function fetches both user plays and community plays
 */
export async function exportAllPlaysAsJSON(userId?: string): Promise<string> {
  const allPlays: SavedPlay[] = [];

  // Load community plays (public plays)
  try {
    const communityPlays = await loadCommunityPlays();
    allPlays.push(...communityPlays);
    console.log(`Loaded ${communityPlays.length} community plays`);
  } catch (error) {
    console.error('Error loading community plays:', error);
  }

  // Load user plays if userId is provided
  if (userId) {
    try {
      const userData = await loadUserData(userId);
      if (userData && userData.savedPlays) {
        allPlays.push(...userData.savedPlays);
        console.log(`Loaded ${userData.savedPlays.length} user plays`);
      }
    } catch (error) {
      console.error('Error loading user plays:', error);
    }
  }

  // Remove duplicates based on play ID
  const uniquePlays = Array.from(
    new Map(allPlays.map(play => [play.id, play])).values()
  );

  // Format for LLM training - clean up metadata that's not needed for generation
  const cleanedPlays = uniquePlays.map(play => {
    const cleaned: SavedPlay = {
      id: play.id,
      name: play.name,
      players: play.players,
      routes: play.routes,
      playerRouteAssociations: play.playerRouteAssociations,
      ...(play.textBoxes && play.textBoxes.length > 0 ? { textBoxes: play.textBoxes } : {}),
      ...(play.circles && play.circles.length > 0 ? { circles: play.circles } : {}),
      ...(play.footballs && play.footballs.length > 0 ? { footballs: play.footballs } : {}),
      ...(play.playNotes ? { playNotes: play.playNotes } : {}),
    };
    return cleaned;
  });

  return JSON.stringify(cleanedPlays, null, 2);
}

/**
 * Export plays in a format optimized for LLM prompt engineering
 * Includes schema description and examples
 */
export async function exportPlaysForLLM(userId?: string): Promise<string> {
  const plays = await exportAllPlaysAsJSON(userId);
  const playsArray = JSON.parse(plays) as SavedPlay[];

  const llmFormat = {
    schema: {
      description: "Flag football play structure",
      fields: {
        id: "Unique identifier for the play",
        name: "Name of the play",
        players: "Array of player objects with position (x, y), color, and type (offense/defense)",
        routes: "Array of route objects with points (path), style (solid/dashed), and lineBreakType",
        playerRouteAssociations: "Object mapping player IDs to route IDs they are associated with",
        textBoxes: "Optional array of text annotations",
        circles: "Optional array of circle markers",
        footballs: "Optional array of football positions",
        playNotes: "Optional text notes describing the play"
      }
    },
    examples: playsArray.slice(0, 5), // First 5 as examples
    totalPlays: playsArray.length,
    allPlays: playsArray
  };

  return JSON.stringify(llmFormat, null, 2);
}

/**
 * Download plays as JSON file
 */
export function downloadPlaysAsJSON(jsonString: string, filename: string = 'plays-export.json'): void {
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}


