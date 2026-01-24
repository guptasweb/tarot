export const vectorDbConfig = {
  provider: 'pinecone',
  indexName: 'tarot-knowledge',
  dimension: 1536,
  metric: 'cosine',
} as const;