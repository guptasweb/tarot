// TypeScript types for database entities
// These types match the Prisma schema and provide type safety

export type GuestSessionStatus = 'active' | 'expired' | 'cancelled';

export type CreditTransactionType = 
  | 'purchase' 
  | 'usage' 
  | 'refund' 
  | 'admin_grant' 
  | 'expiry';

export type PaymentStatus = 
  | 'pending' 
  | 'succeeded' 
  | 'failed' 
  | 'refunded';

export type ReadingSessionStatus = 
  | 'active' 
  | 'completed' 
  | 'expired' 
  | 'cancelled';

export type ReadingPhase = 
  | 'init' 
  | 'question' 
  | 'draw' 
  | 'interpret' 
  | 'chat';

export type MessageRole = 
  | 'user' 
  | 'assistant' 
  | 'system' 
  | 'tool';

export type MessageContentType = 
  | 'text' 
  | 'markdown' 
  | 'card_reveal';

export type TranscriptFormat = 
  | 'markdown' 
  | 'html' 
  | 'json' 
  | 'pdf';

export type SpreadDifficulty = 
  | 'beginner' 
  | 'intermediate' 
  | 'advanced';

export type Arcana = 'major' | 'minor';

export type Suit = 'wands' | 'cups' | 'swords' | 'pentacles';

export type Rank = 
  | 'ace' 
  | '2' 
  | '3' 
  | '4' 
  | '5' 
  | '6' 
  | '7' 
  | '8' 
  | '9' 
  | '10' 
  | 'page' 
  | 'knight' 
  | 'queen' 
  | 'king';

export type Element = 'fire' | 'water' | 'air' | 'earth' | 'spirit';

// Card position in a spread
export interface CardPosition {
  position: number;
  positionName: string;
  description?: string;
  x?: number;
  y?: number;
}

// Card object as stored in reading sessions
export interface DrawnCard {
  position: number;
  positionName: string;
  card: {
    name: string;
    arcana: Arcana;
    number: number;
    suit?: Suit;
    rank?: Rank;
    orientation: 'upright' | 'reversed';
    imageUrl: string;
  };
}

// User insight collected during Socratic dialogue
export interface UserInsight {
  timestamp: string;
  cardReference?: string;
  insight: string;
}

// Reading type configuration
export interface ReadingTypeConfig {
  chatWindowHours: number;
  maxMessages: number | null;
  allowedSpreads: string[];
  requiresQuestionRefinement: boolean;
  includesShadowReading: boolean;
  includesArchetypeAnalysis: boolean;
  phaseFlow: ReadingPhase[];
}

// Message metadata
export interface MessageMetadata {
  cardReferences?: string[];
  ragSources?: Array<{
    type: string;
    cardName?: string;
    excerpt: string;
  }>;
  toolCalls?: Array<{
    tool: string;
    params: Record<string, unknown>;
    result: unknown;
  }>;
  tokens?: {
    prompt: number;
    completion: number;
  };
}

// Session event types
export type SessionEventType =
  | 'session_started'
  | 'question_refined'
  | 'cards_drawn'
  | 'interpretation_viewed'
  | 'message_sent'
  | 'phase_changed'
  | 'session_completed'
  | 'session_expired'
  | 'transcript_exported';

// Credit package with computed price
export interface CreditPackageWithPrice {
  id: string;
  name: string;
  credits: number;
  priceCents: number;
  priceDollars: number;
  stripePriceId: string | null;
  description: string | null;
  isActive: boolean;
  displayOrder: number;
  isPromotional: boolean;
  discountPercentage: number;
}

// Guest session with computed fields
export interface GuestSessionWithStats {
  id: string;
  sessionToken: string;
  email: string | null;
  creditsBalance: number;
  totalCreditsPurchased: number;
  totalCreditsSpent: number;
  expiresAt: Date;
  lastAccessedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  // Computed
  isExpired: boolean;
  daysUntilExpiry: number;
}

// Reading session with relations
export interface ReadingSessionWithDetails {
  id: string;
  guestSessionId: string;
  readingTypeId: string;
  readingTypeSlug: string;
  creditsUsed: number;
  status: ReadingSessionStatus;
  currentPhase: ReadingPhase;
  originalQuestion: string | null;
  refinedQuestion: string | null;
  spreadType: string | null;
  cardsDrawn: DrawnCard[] | null;
  startedAt: Date;
  expiresAt: Date;
  lastActivityAt: Date;
  completedAt: Date | null;
  // Relations
  readingType: {
    name: string;
    description: string;
    tagline: string | null;
  };
  messageCount?: number;
}

// API Response types
export interface CreateGuestSessionResponse {
  sessionToken: string;
  guestSessionId: string;
  expiresAt: Date;
}

export interface PurchaseCreditsResponse {
  checkoutSessionId: string;
  checkoutUrl: string;
}

export interface CreateReadingSessionResponse {
  sessionId: string;
  readingSession: ReadingSessionWithDetails;
}

export interface CreditTransactionResponse {
  id: string;
  type: CreditTransactionType;
  amount: number;
  balanceAfter: number;
  createdAt: Date;
}
