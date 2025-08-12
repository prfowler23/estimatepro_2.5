# EstimatePro - AI-Powered Building Services Estimation Platform

Next.js 15 application for building services contractors with AI-enhanced workflows, real-time pricing, session recovery, 11 service calculators, 3D visualization, drone integration, and PWA capabilities.

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment (see CLAUDE.md for full configuration)
cp .env.example .env.local

# Initialize database
npm run setup-db
npm run migrate

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Key Features

- **15 AI Endpoints** - Photo analysis, document extraction, auto-quotes, competitive intelligence
- **11 Service Calculators** - Real-time calculations for window cleaning, pressure washing, etc.
- **3D/Drone Integration** - Building modeling, aerial inspection, flight planning
- **Progressive Web App** - Offline functionality, background sync, native experience
- **Real-Time Systems** - Live pricing, session recovery, smart auto-save

## Documentation

📖 **[CLAUDE.md](./CLAUDE.md)** - Complete project documentation, setup, and architecture  
🎨 **[Theme Guide](./docs/THEME_GUIDE.md)** - Design system and UI guidelines  
⚙️ **[Development Guide](./docs/DEVELOPMENT_GUIDE.md)** - Development workflows and best practices

## Technology Stack

**Frontend:** Next.js 15, TypeScript, Tailwind CSS, React Hook Form + Zod, Zustand, React Query  
**Backend:** Supabase (PostgreSQL, Auth, RLS), OpenAI GPT-4, AccuWeather API  
**Processing:** jsPDF, React PDF, XLSX, html2canvas, Sentry

## Development Commands

```bash
# MANDATORY before commits
npm run fmt && npm run lint && npm run typecheck

# Development
npm run dev                    # Start with hot reload
npm run build && npm run start # Test production build

# Database
node scripts/setup-basic-schema.js    # Initialize schema
node scripts/run-migration.js         # Run migrations
node scripts/production-check.js      # Verify setup
```

## Project Status

**Active Development** - Production-ready core features with ongoing enhancements  
**Completed:** Service calculators, AI endpoints, real-time systems, PWA capabilities, performance optimization (70-90% improvement)

For complete setup instructions, architecture details, and development guidelines, see **[CLAUDE.md](./CLAUDE.md)**.
