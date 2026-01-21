# Database Setup Guide

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   Create a `.env` file in the root directory:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/tarot_db?schema=public"
   NEXT_PUBLIC_APP_URL="http://localhost:3000"
   STRIPE_SECRET_KEY="sk_test_..."
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
   STRIPE_WEBHOOK_SECRET="whsec_..."
   ```

3. **Set up database:**
   ```bash
   # Generate Prisma Client
   npm run db:generate
   # Or: npx prisma generate --schema=backend/prisma/schema.prisma
   
   # Create database and run migrations
   npm run db:migrate
   # Or: npx prisma migrate dev --schema=backend/prisma/schema.prisma --name init
   
   # Seed initial data
   npm run db:seed
   # Or: npx prisma db seed
   ```

## What's Included

### Database Schema (`backend/database/schema.sql`)
- Complete PostgreSQL schema with all tables
- Database triggers for credit management
- Views for common queries
- Indexes optimized for performance

### Prisma Schema (`backend/prisma/schema.prisma`)
- Type-safe database access
- Auto-generated Prisma Client
- Relations and constraints

### Backend Library (`backend/lib/db/`)
- `client.ts` - Prisma client singleton
- `guest-sessions.ts` - Guest session operations
- `credits.ts` - Credit management
- `reading-sessions.ts` - Reading session operations
- `messages.ts` - Message operations
- `reading-types.ts` - Reading type queries
- `credit-packages.ts` - Credit package queries

### TypeScript Types (`backend/lib/types/database.ts`)
- Complete type definitions
- API response types
- Entity interfaces

### Seed Data (`backend/prisma/seed.ts`)
- Credit packages (Single Reading, 3-Pack, 5-Pack)
- Reading types (Living Reading, Shadow Dialogue)
- Spread types (Three Card, Celtic Cross)
- System configuration

## Key Design Decisions

### No User Accounts
- Guest sessions replace traditional user accounts
- Session tokens provide URL-based access
- 30-day expiry for sessions
- Optional email for receipts only

### Session-Based Credits
- Credits tied to guest sessions (not transferable)
- Automatic deduction via database triggers
- Full transaction history
- Stripe integration ready

### Reading Sessions
- Phase-based workflow tracking
- Agent state persistence for LangGraph
- Card drawing and interpretation
- Message history with AI metadata

## Next Steps

1. Implement API routes using the database functions
2. Set up Stripe Checkout integration
3. Create session management middleware
4. Build reading session UI components
5. Implement message handling with AI

## Database Maintenance

Run cleanup jobs periodically (e.g., daily cron):

```typescript
import { cleanupExpiredGuestSessions } from '@/backend/lib/db/guest-sessions';
import { cleanupExpiredReadingSessions } from '@/backend/lib/db/reading-sessions';

// Clean up expired sessions
await cleanupExpiredGuestSessions();
await cleanupExpiredReadingSessions();
```

## Troubleshooting

### Prisma Client Not Found
```bash
npm run db:generate
# Or: npx prisma generate --schema=backend/prisma/schema.prisma
```

### Migration Issues
```bash
# Reset database (WARNING: deletes all data)
npx prisma migrate reset --schema=backend/prisma/schema.prisma

# Or create fresh migration
npm run db:migrate
# Or: npx prisma migrate dev --schema=backend/prisma/schema.prisma --name fix_migration
```

### Type Errors
Make sure Prisma Client is generated:
```bash
npx prisma generate
```
