# Project Structure

This project is organized into `backend` and `frontend` directories for better code organization.

## Directory Structure

```
tarot/
├── app/                    # Next.js App Router (MUST be at root - Next.js requirement)
│   ├── api/               # API routes (backend logic, imports from backend/lib)
│   ├── (auth)/            # Auth pages (frontend)
│   ├── (dashboard)/       # Dashboard pages (frontend)
│   ├── (marketing)/       # Marketing pages (frontend)
│   ├── globals.css        # Global styles
│   └── layout.tsx         # Root layout
│
├── backend/               # Backend code
│   ├── database/          # Database schema and migrations
│   │   ├── schema.sql     # PostgreSQL schema
│   │   └── migrations/    # Migration files and docs
│   ├── prisma/            # Prisma ORM files
│   │   ├── schema.prisma  # Prisma schema
│   │   └── seed.ts        # Database seed script
│   └── lib/               # Backend library code
│       ├── db/            # Database operations
│       │   ├── client.ts
│       │   ├── guest-sessions.ts
│       │   ├── credits.ts
│       │   ├── reading-sessions.ts
│       │   ├── messages.ts
│       │   ├── reading-types.ts
│       │   └── credit-packages.ts
│       ├── types/         # TypeScript types
│       │   └── database.ts
│       └── utils/         # Utility functions
│           ├── errors.ts
│           └── session-token.ts
│
├── frontend/              # Frontend code
│   └── components/        # React components
│       ├── shared/        # Shared components
│       ├── tarot/         # Tarot-specific components
│       └── ui/            # UI components
│
├── public/                # Static assets (if needed)
├── node_modules/          # Dependencies
├── .env                   # Environment variables (gitignored)
├── next.config.mjs        # Next.js configuration
├── tsconfig.json          # TypeScript configuration
├── tailwind.config.ts     # Tailwind CSS configuration
├── postcss.config.mjs     # PostCSS configuration
└── package.json           # Dependencies and scripts
```

## Important Notes

### Next.js App Directory
The `app/` directory **must remain at the root level** because Next.js 13+ App Router requires it there. This is a Next.js framework requirement and cannot be changed.

The `app/` directory contains:
- **Frontend pages**: `(auth)/`, `(dashboard)/`, `(marketing)/` route groups
- **API routes**: `api/` directory with backend endpoints

### Import Paths

#### From Frontend (app/ or components/)
```typescript
// Import backend code
import { createGuestSession } from '@/backend/lib/db/guest-sessions'
import { GuestSessionWithStats } from '@/backend/lib/types/database'

// Import frontend components
import TarotCard from '@/frontend/components/tarot/TarotCard'
```

#### From Backend (backend/lib/)
```typescript
// Import other backend modules (relative paths)
import { prisma } from './client'
import { GuestSessionWithStats } from '../types/database'
```

### Prisma Configuration

Prisma schema is located at `backend/prisma/schema.prisma`. The Prisma Client is generated to `node_modules/.prisma/client` and can be imported from `@prisma/client` anywhere in the project.

### Running Commands

```bash
# Generate Prisma Client (from backend/prisma)
npx prisma generate --schema=backend/prisma/schema.prisma

# Run migrations
npx prisma migrate dev --schema=backend/prisma/schema.prisma --name init

# Seed database
npx prisma db seed --schema=backend/prisma/schema.prisma

# Or use the package.json script (already configured)
npm run db:seed
```

## Path Aliases

Configured in `tsconfig.json`:
- `@/*` → Root directory
- `@/frontend/*` → `./frontend/*`
- `@/backend/*` → `./backend/*`
- `@/components/*` → `./frontend/components/*`
- `@/lib/*` → `./backend/lib/*`

## Development Workflow

1. **Backend changes**: Edit files in `backend/`
2. **Frontend changes**: Edit files in `frontend/components/` or `app/`
3. **API routes**: Edit files in `app/api/` (these import from `backend/lib/`)
4. **Database changes**: Update `backend/prisma/schema.prisma`, then run migrations
