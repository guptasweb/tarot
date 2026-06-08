Usage Examples from Frontend
Example 1: Query Card Meaning

// In your component or action
async function getCardMeaning(cardName: string, framework?: string) {
  const response = await fetch('/api/rag', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      queryType: 'card-meaning',
      cardName,
      framework,
      includeReversed: true,
      topK: 5,
    }),
  });

  const data = await response.json();
  return data.results;
}

// Usage
const foolMeaning = await getCardMeaning('The Fool', 'psychological');


Example 2: Query Card Combination

async function getCardCombination(cards: string[], context?: string) {
  const response = await fetch('/api/rag', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      queryType: 'card-combination',
      cards,
      context,
      topK: 5,
    }),
  });

  const data = await response.json();
  return data.results;
}

// Usage
const combination = await getCardCombination(
  ['The Fool', 'The Magician'],
  'new beginning with skills'
);


Example 3: Contextual Reading Query

async function getContextualInterpretation(
  cardName: string,
  readingContext: {
    previousCards: string[];
    readingType: string;
    userQuestion: string;
    spreadPosition: string;
  }
) {
  const response = await fetch('/api/rag', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      queryType: 'card-meaning',
      cardName,
      readingContext,
      framework: 'psychological',
      topK: 5,
    }),
  });

  const data = await response.json();
  return data.results;
}

// Usage in Celtic Cross reading
const interpretation = await getContextualInterpretation('The Tower', {
  previousCards: ['The Fool', 'The Magician', 'The High Priestess'],
  readingType: 'celtic-cross',
  userQuestion: 'What is my path forward in my career?',
  spreadPosition: 'future',
});

Example 4: Hybrid Query (Multiple Types)

async function getComprehensiveReading(cards: string[], question: string) {
  const response = await fetch('/api/rag', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      queryType: 'hybrid',
      cards,
      query: question,
      framework: 'psychological',
      topK: 5,
    }),
  });

  const data = await response.json();
  
  // Returns: cardMeanings, combinations, archetypes, symbolism, frameworks
  return data.results;
}

// Usage
const reading = await getComprehensiveReading(
  ['The Fool', 'The Tower', 'The Star'],
  'transformation and new beginnings'
);

console.log(reading.cardMeanings);   // Card interpretations
console.log(reading.archetypes);     // Related myths/archetypes
console.log(reading.symbolism);      // Symbolic meanings

Example 5: Mythology Query

async function getMythologicalContext(theme: string, cards?: string[]) {
  const response = await fetch('/api/rag', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      queryType: 'mythology',
      query: theme,
      cards,
      mythology: 'greek',
      topK: 5,
    }),
  });

  const data = await response.json();
  return data.results;
}

// Usage
const myths = await getMythologicalContext(
  "hero's journey",
  ['The Fool', 'The Hermit']
);

Example 6: Spread Instructions Query

async function getSpreadInstructions(spreadName: string) {
  const response = await fetch('/api/rag', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      queryType: 'spread',
      spreadName,
      topK: 1,
    }),
  });

  const data = await response.json();
  return data.results[0];
}

// Usage
const celticCross = await getSpreadInstructions('Celtic Cross');
console.log(celticCross.content); // Full spread instructions

Integration with Agent System
In your agent orchestrator, use RAG queries like this:

// In your reading agent
async function generateReading(cards: string[], question: string, framework: string) {
  // Step 1: Get card meanings with context
  const cardMeanings = await fetch('/api/rag', {
    method: 'POST',
    body: JSON.stringify({
      queryType: 'card-meaning',
      cards,
      framework,
      readingContext: {
        userQuestion: question,
        readingType: 'general',
      },
      topK: 5,
    }),
  }).then(r => r.json());

  // Step 2: Get combinations if multiple cards
  let combinations = null;
  if (cards.length >= 2 && cards.length <= 3) {
    combinations = await fetch('/api/rag', {
      method: 'POST',
      body: JSON.stringify({
        queryType: 'card-combination',
        cards: cards.slice(0, 3),
        context: question,
        topK: 3,
      }),
    }).then(r => r.json());
  }

  // Step 3: Get mythological/archetypal context
  const archetypes = await fetch('/api/rag', {
    method: 'POST',
    body: JSON.stringify({
      queryType: 'mythology',
      query: question,
      cards,
      topK: 3,
    }),
  }).then(r => r.json());

  // Step 4: Pass to Claude with all context
  const prompt = buildReadingPrompt({
    cards,
    question,
    framework,
    cardMeanings: cardMeanings.results,
    combinations: combinations?.results,
    archetypes: archetypes.results,
  });

  // Generate final interpretation with Claude
  return await callClaude(prompt);
}