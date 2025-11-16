/**
 * Comprehensive prompt template for LLM play generation
 * Use this to guide the LLM in creating tactically sound flag football plays
 */

export const PLAY_GENERATION_PROMPT = `You are an expert flag football coach creating offensive plays. Generate plays that are tactically sound, realistic, and effective.

## CRITICAL RULES:

### 1. FORMATION ACCURACY
- **Trips Right/Left**: 3 receivers on one side, 1 on the other, QB under center
- **Bunch**: 3+ receivers grouped together (within 3-4 yards)
- **Spread**: Receivers spread across the field (5-7 yards apart)
- **Double QB**: Two players in QB position (one is a runner)
- Player positions MUST match the formation name

### 2. ROUTE SPACING (CRITICAL)
- Receivers should be 5-7 yards apart horizontally
- Routes should not overlap or bunch together
- Vertical spacing: Deep routes (15+ yards), Medium (8-14 yards), Short (0-7 yards)
- Never place two receivers at the exact same X coordinate

### 3. ROUTE COORDINATION
Routes must work together tactically:
- **Complementary routes**: Slant + Flat, Post + Corner, Drag + Seam
- **Clear progression**: Deep → Medium → Short (high-to-low read)
- **Spacing**: Routes should create windows, not crowd areas
- **Timing**: Quick routes (3-step) vs deep routes (5-7 step) must be realistic

### 4. COMMON ROUTE CONCEPTS
- **Slant-Flat**: Flat clears space for slant behind it
- **Mesh/Drags**: Two crossing routes create a "rub" to free a receiver
- **Flood**: Three levels (deep, medium, short) on one side
- **Seam**: Vertical route up the middle, often with posts pulling coverage wide
- **Wheel**: Receiver starts flat then turns upfield
- **Fade**: Deep outside route, typically in goal-line situations

### 5. PLAYER POSITIONING
- **QB**: Typically at x=400, y=460 (under center) or y=450 (shotgun)
- **Center (Yellow)**: Usually at x=400, y=400 (directly in front of QB)
- **Wide receivers**: Spread 5-7 yards apart horizontally
- **Formation-specific**: Trips means 3 receivers on one side, not spread evenly

### 6. ROUTE TYPES & STYLES
- **Solid lines**: Actual routes receivers run
- **Dashed lines**: Motion, QB movement, or blocking assignments
- **Rigid lineBreakType**: Sharp angles (slants, posts, corners)
- **Smooth lineBreakType**: Curved routes (wheels, curls, comebacks)

### 7. SITUATIONAL AWARENESS
- **Goal-line plays**: Short, quick routes (fades, slants, quick ins)
- **Long-yardage**: Deep routes with clear progression
- **Short-yardage**: Power concepts, quick hitters
- **Red zone**: Routes that work in compressed space

### 8. QB READS & PROGRESSION
- Always include a clear read progression in playNotes
- Example: "Read flat defender - if they cover flat, throw slant behind them"
- High-to-low: Check deep routes first, then medium, then short
- Left-to-right: Scan one side, then the other

## OUTPUT FORMAT:

Generate plays in this exact JSON structure:
\`\`\`json
{
  "totalPlays": [number],
  "allPlays": [
    {
      "id": "unique-id",
      "name": "Formation, Route Concept",
      "players": [
        {
          "id": "player-id",
          "x": [number 0-800],
          "y": [number 0-800],
          "type": "offense",
          "color": "qb" | "yellow" | "blue" | "green" | "red"
        }
      ],
      "routes": [
        {
          "id": "route-id",
          "color": "black",
          "style": "solid" | "dashed",
          "lineBreakType": "rigid" | "smooth" | "none" | "smooth-none",
          "points": [
            { "x": [number], "y": [number] }
          ]
        }
      ],
      "playerRouteAssociations": {
        "player-id": ["route-id"]
      },
      "playNotes": "Clear explanation of the play concept, QB reads, and when to use it"
    }
  ]
}
\`\`\`

## QUALITY CHECKLIST:
Before submitting a play, verify:
✓ Routes are 5-7 yards apart horizontally
✓ Routes work together tactically (not random)
✓ Player positions match formation name
✓ Route timing is realistic
✓ Clear QB read progression
✓ PlayNotes explain the concept clearly

## EXAMPLES OF GOOD PLAYS:

**Trips Right, Slant-Flat:**
- 3 receivers on right (x: 500, 600, 700), 1 on left (x: 200)
- Flat route (x: 700) clears space for slant (x: 600) behind it
- Center (x: 400) runs delayed route as checkdown
- QB reads: Flat defender → if covered, throw slant

**Mesh Concept:**
- Two crossing drag routes create a "rub"
- Deep route (seam or post) as vertical threat
- Routes cross at different depths to confuse coverage
- QB reads: Mesh receiver who gets open first

Generate plays that follow these rules exactly. Each play should be tactically sound and ready for game use.`;

/**
 * Generate a specific play generation prompt with constraints
 */
export function generatePlayPrompt(options: {
  formation?: string;
  concept?: string;
  situation?: 'goal-line' | 'red-zone' | 'long-yardage' | 'short-yardage' | 'general';
  count?: number;
  includeExamples?: boolean;
}): string {
  const {
    formation,
    concept,
    situation,
    count = 1,
    includeExamples = true
  } = options;

  let prompt = PLAY_GENERATION_PROMPT;

  // Add specific constraints
  if (formation) {
    prompt += `\n\n## SPECIFIC REQUEST:\nGenerate ${count} play(s) using the **${formation}** formation.`;
  }

  if (concept) {
    prompt += `\nFocus on the **${concept}** route concept.`;
  }

  if (situation) {
    const situationGuidance = {
      'goal-line': 'Generate goal-line plays (within 5 yards of endzone). Use quick, high-percentage routes like fades, slants, and quick ins. Keep routes short and decisive.',
      'red-zone': 'Generate red-zone plays (within 20 yards of endzone). Balance quick routes with vertical threats. Consider compressed field space.',
      'long-yardage': 'Generate long-yardage plays (3rd and long). Focus on deep routes with clear progression. Give QB time to throw.',
      'short-yardage': 'Generate short-yardage plays (1-2 yards needed). Use power concepts, quick hitters, and high-percentage throws.',
      'general': 'Generate general-purpose plays suitable for any down and distance.'
    };
    prompt += `\n${situationGuidance[situation]}`;
  }

  if (!includeExamples) {
    // Remove examples section if not needed
    prompt = prompt.replace(/## EXAMPLES OF GOOD PLAYS:[\s\S]*?Generate plays that follow these rules exactly\./g, 'Generate plays that follow these rules exactly.');
  }

  prompt += `\n\nGenerate ${count} play(s) following all the rules above.`;

  return prompt;
}

/**
 * Example usage prompts for common scenarios
 */
export const EXAMPLE_PROMPTS = {
  tripsRight: generatePlayPrompt({
    formation: 'Trips Right',
    count: 5,
    situation: 'general'
  }),
  
  goalLine: generatePlayPrompt({
    situation: 'goal-line',
    count: 3
  }),
  
  meshConcept: generatePlayPrompt({
    concept: 'Mesh/Drags',
    count: 3,
    situation: 'general'
  }),
  
  redZone: generatePlayPrompt({
    situation: 'red-zone',
    count: 4
  })
};


