# Quick Start Guide

## Installation

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) to see the landing page.

## Project Structure

The project follows Next.js 14 App Router conventions:

### Routes

- `/` - Landing page (matches wireframe design)
- `/pricing` - Pricing page
- `/how-it-works` - How it works page
- `/login` - Login page
- `/signup` - Signup page
- `/credits` - Credit purchase (dashboard)
- `/readings` - Reading selection (dashboard)
- `/session/[sessionId]` - Active reading session (dashboard)

### Components

- `components/tarot/TarotCard.tsx` - Interactive tarot card component
- `components/shared/BackgroundEffects.tsx` - Animated background effects
- `components/tarot/CardDisplay/` - Card display component (placeholder)
- `components/tarot/SpreadLayout/` - Spread layout component (placeholder)
- `components/tarot/ChatInterface/` - Chat interface component (placeholder)
- `components/ui/` - Reusable UI components

### API Routes

- `/api/auth` - Authentication endpoints
- `/api/credits` - Credit management
- `/api/readings` - Reading management
- `/api/sessions` - Session management
- `/api/webhooks` - Stripe webhooks

## Features Implemented

✅ Next.js 18+ with App Router
✅ TypeScript configuration
✅ TailwindCSS setup
✅ Complete folder structure matching requirements
✅ Landing page matching wireframe design
✅ Animated background effects
✅ Interactive tarot cards
✅ Route groups for auth, marketing, and dashboard
✅ API route structure

## Next Steps

1. Implement authentication (NextAuth.js recommended)
2. Set up database (Prisma + PostgreSQL recommended)
3. Implement Stripe integration for payments
4. Build out reading session interface
5. Add chat functionality
6. Implement card display and spread layouts
