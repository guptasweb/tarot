# RAG Tarot

A Next.js 18+ application for interactive tarot readings with AI-powered insights.

## Features

- Beautiful, mystical UI matching the wireframe design
- Tiered reading system with credit-based pricing
- Interactive tarot card displays
- Real-time chat interface for readings
- Dashboard for managing credits and sessions

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

The project is organized into `backend` and `frontend` directories:

```
tarot/
├── app/                    # Next.js App Router (must be at root)
│   ├── api/               # API routes (import from backend/lib)
│   ├── (auth)/            # Auth pages
│   ├── (dashboard)/       # Dashboard pages
│   └── (marketing)/       # Marketing pages
├── backend/               # Backend code
│   ├── database/          # SQL schema and migrations
│   ├── prisma/            # Prisma schema and seed
│   └── lib/               # Backend library (db, types, utils)
└── frontend/              # Frontend code
    └── components/        # React components
```

See [PROJECT-STRUCTURE.md](./PROJECT-STRUCTURE.md) for detailed structure documentation.

## Tech Stack

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety
- **TailwindCSS** - Styling
- **Lucide React** - Icons

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Database Commands

- `npm run db:generate` - Generate Prisma Client
- `npm run db:migrate` - Run database migrations
- `npm run db:seed` - Seed database with initial data
- `npm run db:studio` - Open Prisma Studio

See [DATABASE-SETUP.md](./DATABASE-SETUP.md) for database setup instructions.

## License

MIT
