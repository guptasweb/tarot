# Database Schema & Backend Structure

This document describes the database schema and backend structure for the Tarot Reading application.

## Overview

The application uses a **session-based credits system** with **NO user accounts or authentication**. Users purchase credits tied to a guest session that expires after 30 days.

## Database Schema

### Core Tables

#### `guest_sessions`
- Main entity replacing traditional user accounts
- Each session has a unique `session_token` for URL access
- Credits are tied to the session (not transferable)
- Sessions expire after 30 days
- Optional email for receipt delivery

#### `credit_packages`
- Defines what users can purchase (e.g., "Single Reading", "3-Pack")
- Links to Stripe Price IDs
- Supports promotional pricing

#### `credit_transactions`
- Tracks all credit purchases and usage
- Links to Stripe payment intents
- Records refunds and admin grants

#### `reading_types`
- Defines available reading types (e.g., "Living Reading", "Shadow Dialogue")
- Contains configuration for chat windows, spreads, etc.
- Each type has a credit cost

#### `reading_sessions`
- Individual tarot reading sessions
- Tracks question, cards drawn, phase, status
- Stores agent state for LangGraph persistence
- Automatically deducts credits on creation (via trigger)

#### `messages`
- Chat messages within reading sessions
- Tracks AI model usage and tokens
- Supports rich content types

### Reference Data

#### `tarot_cards`
- Complete tarot deck reference
- Includes images, keywords, meanings
- Used for card lookups and RAG

#### `spread_types`
- Defines card spreads (Three Card, Celtic Cross, etc.)
- Includes position layouts and metadata

### Supporting Tables

- `transcripts` - Exported reading transcripts
- `session_events` - Analytics and event tracking
- `reading_feedback` - User feedback and ratings
- `system_config` - Application configuration

## Database Triggers

1. **Credit Balance Check** - Validates sufficient credits before creating reading session
2. **Credit Deduction** - Automatically deducts credits when reading session is created
3. **Activity Tracking** - Updates `last_activity_at` when messages are sent
4. **Timestamp Updates** - Auto-updates `updated_at` fields

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Create a `.env` file in the root directory with your database URL:

```bash
# Copy from example if it exists, or create manually
```

Update `DATABASE_URL` with your PostgreSQL connection string.

### 3. Run Database Migrations

```bash
# Generate Prisma Client
npm run db:generate
# Or: npx prisma generate --schema=backend/prisma/schema.prisma

# Create database and run migrations
npm run db:migrate
# Or: npx prisma migrate dev --schema=backend/prisma/schema.prisma --name init

# Or if you prefer to use the SQL schema directly:
# psql -d your_database < backend/database/schema.sql
```

### 4. Seed Database

```bash
npx prisma db seed
```

This will create:
- Credit packages (Single Reading, 3-Pack, 5-Pack)
- Reading types (Living Reading, Shadow Dialogue)
- Spread types (Three Card, Celtic Cross)
- System configuration

## Backend Structure

```
backend/
├── lib/
│   ├── types/
│   │   └── database.ts          # TypeScript types
│   ├── db/
│   │   ├── client.ts            # Prisma client singleton
│   │   ├── guest-sessions.ts    # Guest session operations
│   │   ├── credits.ts           # Credit management
│   │   ├── reading-sessions.ts  # Reading session operations
│   │   ├── messages.ts          # Message operations
│   │   ├── reading-types.ts     # Reading type queries
│   │   └── credit-packages.ts  # Credit package queries
│   └── utils/                   # Utility functions
├── database/                     # Database schema and migrations
└── prisma/                       # Prisma schema and seed
```

## Key Features

### Session Management
- Guest sessions created automatically
- Session tokens for URL-based access
- 30-day expiry with automatic cleanup

### Credit System
- Credits tied to guest sessions
- Automatic deduction on reading creation
- Full transaction history
- Stripe integration ready

### Reading Sessions
- Phase-based workflow (init → question → draw → interpret → chat)
- Agent state persistence for LangGraph
- Card drawing and interpretation tracking
- Message history with AI metadata

## API Endpoints (To Be Implemented)

- `POST /api/sessions` - Create guest session
- `GET /api/sessions/:token` - Get guest session
- `GET /api/credits` - Get credit packages
- `POST /api/credits/purchase` - Initiate credit purchase
- `POST /api/webhooks/stripe` - Handle Stripe webhooks
- `POST /api/readings` - Create reading session
- `GET /api/readings/:id` - Get reading session
- `POST /api/readings/:id/messages` - Send message
- `GET /api/readings/:id/messages` - Get messages

## Database Maintenance

### Cleanup Jobs (Run as Cron)

```sql
-- Clean up expired guest sessions
DELETE FROM guest_sessions WHERE expires_at < NOW();

-- Mark expired reading sessions
UPDATE reading_sessions 
SET status = 'expired' 
WHERE expires_at < NOW() AND status != 'expired';

-- Clean up old transcripts
DELETE FROM transcripts WHERE expires_at < NOW();
```

Or use the helper functions:
```typescript
import { cleanupExpiredGuestSessions } from '@/backend/lib/db/guest-sessions';
import { cleanupExpiredReadingSessions } from '@/backend/lib/db/reading-sessions';
```

## Notes

- All timestamps use PostgreSQL `TIMESTAMP(6)` for microsecond precision
- UUIDs are used for all primary keys
- JSONB is used for flexible metadata storage
- Indexes are optimized for common query patterns
- Foreign keys use `ON DELETE CASCADE` or `ON DELETE SET NULL` appropriately
