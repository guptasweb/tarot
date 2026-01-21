// RAG-related type definitions

export interface RAGDocument {
  id: string;
  content: string;
  metadata?: Record<string, any>;
}

export interface RAGQueryResult {
  documents: RAGDocument[];
  scores: number[];
}
