# Setup Guide & Code Flow Documentation

## Table of Contents
1. [Local Setup Steps](#local-setup-steps)
2. [Reading Selection Flow](#reading-selection-flow)
3. [Chat System Flow](#chat-system-flow)
4. [TODOs and Placeholders](#todos-and-placeholders)

---

## Local Setup Steps

### Prerequisites
- Node.js (v18+)
- PostgreSQL database
- Docker (for Qdrant, optional)
- Upstash Redis account (or local Redis)

### Step-by-Step Setup

#### 1. Install Dependencies
```bash
npm install
```

#### 2. Environment Variables
Create a `.env` file in the root directory with the following:

```env
# Database (Required)
DATABASE_URL="postgresql://user:password@localhost:5432/tarot_db?schema=public"

# OpenAI (Required)
OPENAI_API_KEY="your_openai_api_key_here"

# Qdrant Vector Store (Optional - defaults to localhost)
QDRANT_URL="http://localhost:6333"
QDRANT_API_KEY="your_qdrant_api_key"  # Only needed for Qdrant Cloud

# Upstash Redis (Required for agent state management)
UPSTASH_REDIS_REST_URL="https://your-redis-url.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your-redis-token"

# Stripe (Optional - for payments)
STRIPE_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# App URL (Optional)
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

#### 3. Database Setup
```bash
# Generate Prisma Client
npm run db:generate

# Run migrations
npm run db:migrate

# Seed initial data (reading types, spread types, credit packages)
npm run db:seed
```

#### 4. Start Qdrant Vector Database (Local)
Using Docker:
```bash
docker run -p 6333:6333 -p 6334:6334 \
  -v $(pwd)/qdrant_storage:/qdrant/storage \
  qdrant/qdrant
```

Or use Qdrant Cloud free tier (set `QDRANT_URL` and `QDRANT_API_KEY` in `.env`).

#### 5. Ingest RAG Data (Optional but Recommended)
```bash
# Ingest all tarot knowledge base data
npm run ingest:all

# Or ingest by category
npm run ingest:category cards
npm run ingest:category mythology
npm run ingest:category spreads
```

#### 6. Start Development Server
```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

---

## Reading Selection Flow

### Overview
When a user selects a reading type, the system creates a session, deducts credits, and initializes the agent workflow.

### Detailed Flow

#### 1. User Selects Reading Type
- **Frontend**: User navigates to `/readings` and selects a reading type (e.g., "Living Reading", "Shadow Dialogue")
- **API Call**: `POST /api/sessions/create` or `POST /api/sessions/start`

#### 2. Authentication & Credit Check
**File**: `app/api/sessions/start.ts` or `app/api/sessions/create/route.ts`

- Authenticates request (guest session token)
- Retrieves reading type from database (`getReadingTypeBySlug`)
- Checks if user has sufficient credits (`hasSufficientCredits`)
- Returns error if insufficient credits

#### 3. Session Creation
**File**: `app/api/sessions/start.ts` (lines 62-131)

- Generates unique session ID (`nanoid()`)
- Initializes agent state (`initializeState()`)
  - Sets phase to `'init'`
  - Creates phase history
  - Sets expiration (7 days default)
- Saves agent state to Redis (`StateManager.save()`)
- Creates database record in transaction:
  - Creates `ReadingSession` record
  - Deducts credits from `GuestSession`
  - Creates `CreditTransaction` record
  - Sets expiration based on reading config

#### 4. Agent State Initialization
**File**: `backend/lib/agent/core/state-manager.ts` (lines 182-205)

```typescript
{
  sessionId: string,
  readingType: string,
  phase: 'init',
  phaseHistory: [{ phase: 'init', timestamp }],
  startedAt: Date,
  expiresAt: Date,
  // ... other fields
}
```

#### 5. Response
Returns session details:
```json
{
  "session": {
    "id": "session-id",
    "readingType": "living-reading",
    "phase": "init",
    "expiresAt": "2026-02-11T...",
    "chatWindowHours": 24,
    "creditsUsed": 1
  }
}
```

#### 6. Next Steps (Frontend)
- Navigate to `/session/[sessionId]`
- Show question input (if not provided initially)
- Allow card drawing when ready

### Phase Transitions
The reading progresses through phases:
1. `init` → Initial state
2. `question` → Question refinement (optional)
3. `draw` → Card drawing
4. `interpret` → Interpretation generation
5. `chat` → Open chat window
6. `completed` → Session complete

---

## Chat System Flow

### Overview
The chat system allows users to ask questions about their reading after cards are drawn and interpreted. It uses RAG (Retrieval-Augmented Generation) to provide context-aware responses.

### Detailed Flow

#### 1. User Sends Message
- **Frontend**: User types message in chat interface
- **API Call**: `POST /api/sessions/[sessionId]/chat`
- **File**: `app/api/sessions/[sessionId]/chat/route.ts`

#### 2. Request Validation
**File**: `app/api/sessions/[sessionId]/chat/route.ts` (lines 36-88)

- Authenticates request
- Validates session exists and belongs to user
- Checks session is active
- Validates chat window hasn't expired
- Validates message content

#### 3. Message Storage
**File**: `app/api/sessions/[sessionId]/chat/route.ts` (lines 90-103)

- Creates user message record (`createMessage()`)
- Updates session `lastActivityAt`
- Retrieves conversation history (`getSessionMessages()`)

#### 4. RAG Context Gathering
**File**: `app/api/sessions/[sessionId]/chat/route.ts` (lines 159-257)

The system gathers relevant context from the RAG knowledge base:

**Function**: `gatherChatRAGContext()`

1. **Card Meanings** (if cards referenced in context):
   - Queries `retrieveCardMeanings()` for specific cards
   - Filters by framework (psychological, spiritual, etc.)

2. **Focus Card** (if user focuses on one card):
   - Retrieves detailed meaning for that card

3. **Contextual Search**:
   - Uses `retrieveContextual()` with:
     - User's message
     - Previous cards drawn
     - Reading type
     - User's question
     - Framework preference

4. **Card Combinations** (if asking about relationships):
   - Detects keywords like "together", "relate", "connection"
   - Queries `retrieveCombinations()` for card pairs/triplets

5. **General Semantic Search** (fallback):
   - Uses `retrieveGeneral()` if no specific context found

#### 5. Response Generation
**File**: `app/api/sessions/[sessionId]/chat/route.ts` (lines 260-383)

Two modes supported:

**A. Streaming Response** (if client accepts `text/event-stream`):
- Creates assistant message placeholder
- Builds system prompt with RAG context
- Streams response using `createSSEStream()`
- Updates message on completion

**B. Non-Streaming Response**:
- Builds system prompt with RAG context
- Calls OpenAI API (`getResponse()`)
- Creates assistant message with full content
- Returns JSON response

#### 6. System Prompt Construction
**File**: `app/api/sessions/[sessionId]/chat/route.ts` (lines 437-514)

**Function**: `buildSystemPrompt()`

Includes:
- Reading context (question, cards drawn, framework)
- Initial interpretation (if available)
- Relevant card meanings (top 3)
- Card combinations (top 2)
- Additional context (top 2)
- Role instructions for the AI

#### 7. Message Metadata
Each assistant message includes:
- Token usage (prompt, completion, total)
- Card references mentioned
- RAG sources used (for citation)

#### 8. Response Format
```json
{
  "message": {
    "id": "message-id",
    "role": "assistant",
    "content": "Response text...",
    "contentType": "text",
    "metadata": {
      "tokensUsed": { "prompt": 1000, "completion": 500, "total": 1500 },
      "cardReferences": ["The Fool", "The Magician"],
      "ragSources": [...]
    },
    "createdAt": "2026-02-04T..."
  }
}
```

### RAG Integration Points

**Retrieval Functions** (`backend/lib/rag/retrieval.ts`):
- `retrieveCardMeanings()` - Card-specific meanings
- `retrieveCombinations()` - Card combination meanings
- `retrieveContextual()` - Context-aware semantic search
- `retrieveGeneral()` - General semantic search

**Vector Store**: Qdrant
- Stores 500+ tarot documents
- Categories: cards, combinations, mythology, spreads, frameworks, symbolism
- Uses OpenAI embeddings (`text-embedding-3-small`)

---

## TODOs and Placeholders

### Payment Integration (Stripe)
**Status**: Placeholder implementations

**Files**:
- `app/api/checkout/guest/route.ts` - Line 41: `// TODO: Integrate with Stripe Checkout`
- `app/api/credits/purchase/route.ts` - Line 43: `// TODO: Integrate with Stripe Checkout`
- `app/api/webhooks/route.ts` - Line 17: `// TODO: Verify Stripe webhook signature`
- `app/api/webhooks/route.ts` - Line 25: `// TODO: Handle different event types`

**What's Missing**:
- Actual Stripe Checkout session creation
- Webhook signature verification
- Payment event handling (succeeded, failed, refunded)

### Gift Credit System
**Status**: Placeholder implementations

**Files**:
- `app/api/credits/gift/create/route.ts` - Line 34: `// TODO: Implement gift credit system`
- `app/api/credits/gift/redeem/route.ts` - Line 26: `// TODO: Implement gift redemption`

**What's Missing**:
- Gift code generation
- Gift code validation and redemption
- Credit transfer logic

### User Account System
**Status**: Placeholder implementation

**File**: `app/api/guest/upgrade/route.ts` - Line 41: `// TODO: Implement user account creation`

**What's Missing**:
- User account model/schema
- Account creation logic
- Guest session to user account migration

### Transcript Export
**Status**: Partial implementation

**Files**:
- `app/api/sessions/[sessionId]/export/route.ts` - Line 55: `// TODO: Generate actual transcript file`
- `app/api/sessions/[sessionId]/export/route.ts` - Line 61: `// TODO: Upload to Cloudflare R2`
- `app/api/sessions/[sessionId]/export/[transcriptId]/download/route.ts` - Line 56: `// TODO: Generate signed URL from Cloudflare R2`
- `app/api/transcripts/[id]/route.ts` - Line 39: `// TODO: Delete file from Cloudflare R2`

**What's Missing**:
- Transcript file generation (markdown/HTML/PDF)
- Cloudflare R2 integration
- Signed URL generation for downloads
- File deletion from R2

### Question Refinement
**Status**: Partial implementation

**File**: `app/api/sessions/[sessionId]/refine-question/route.ts`
- Line 57: `// TODO: Integrate with LLM to determine if more refinement is needed`
- Line 78: `// TODO: Generate probing questions using LLM`

**What's Missing**:
- LLM integration for question quality assessment
- Probing question generation
- Currently returns placeholder questions

### Bearer Token Mapping
**Status**: Not implemented

**File**: `app/api/auth/token/create/route.ts` - Line 7: `// TODO: Implement Redis or in-memory store for bearer token mapping`

**What's Missing**:
- Token storage mechanism
- Token validation logic

### Agent Tools
**Status**: Placeholder files

**Files**:
- `backend/lib/agent/tools/card-tools.ts` - Line 5: `// TODO: Implement card-related tools`
- `backend/lib/agent/nodes/decision-simulator.node.ts` - Line 5: `// TODO: Implement decision simulation logic`
- `backend/lib/agent/nodes/shadow-analyzer.node.ts` - Line 5: `// TODO: Implement shadow analysis logic`

**What's Missing**:
- Card manipulation tools for agent
- Decision simulation workflow
- Shadow analysis workflow

### Streaming Implementation
**Status**: Partial implementation

**File**: `backend/lib/llm/streaming.ts` - Line 5: `// TODO: Implement streaming logic`

**Note**: Streaming is implemented in `app/api/sessions/[sessionId]/chat/route.ts` using `createSSEStream()` from `backend/lib/llm/helper.ts`, but there's a separate placeholder file.

### Component Placeholders
**Status**: Placeholder components mentioned in docs

**File**: `QUICKSTART.md` (lines 36-38):
- `components/tarot/CardDisplay/` - Card display component (placeholder)
- `components/tarot/SpreadLayout/` - Spread layout component (placeholder)
- `components/tarot/ChatInterface/` - Chat interface component (placeholder)

**Note**: These components exist but may need full implementation.

### Reading Types Definition
**Status**: Incomplete type definition

**File**: `backend/lib/types/reading.types.ts` - Line 11: `// TODO: Define reading session types`

**Note**: Types are defined in `backend/lib/types/database.ts`, but this file has a TODO comment.

### Session Refund Logic
**Status**: Partial implementation

**File**: `app/api/sessions/[sessionId]/route.ts` - Line 115: `// TODO: Implement partial refund logic if needed`

**What's Missing**:
- Refund calculation logic
- Credit restoration on session cancellation

---

## Summary

### Fully Implemented
- Database schema and migrations
- Guest session management
- Credit system (purchase, usage tracking)
- Reading session creation and management
- Card drawing (random and user choice)
- RAG knowledge base ingestion
- Interpretation generation with RAG
- Chat system with RAG context
- Message storage and retrieval
- Agent state management (Redis)

### Partially Implemented / Placeholders
- Stripe payment integration
- Gift credit system
- User account system
- Transcript export (file generation and storage)
- Question refinement (LLM integration)
- Bearer token mapping
- Some agent tools and nodes
- Component implementations (may need enhancement)

### Architecture Highlights
- **Session-based**: No user accounts, uses guest sessions
- **Credit System**: Credits tied to guest sessions, automatic deduction
- **RAG-powered**: Vector database (Qdrant) with 500+ tarot documents
- **Agent Workflow**: LangGraph-based agent with phase management
- **State Management**: Redis (Upstash) for agent state persistence
- **Database**: PostgreSQL with Prisma ORM
