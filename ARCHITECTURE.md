# LinkAlbum Architecture

This is a summary of the current hybrid architecture of LinkAlbum. It's intended as a primer for collaborators to get a high-level understanding of the project.

## Current Architecture Overview

LinkAlbum uses a **hybrid architecture** that combines Next.js for database operations with Netlify Functions for file operations:

- **Next.js App**: Handles frontend, authentication, and database API routes
- **Netlify Functions**: Handle file operations, background processing, and screenshots via ScreenshotOne API

## Main Tech Stack

- [NextJS](https://github.com/vercel/next.js) - Frontend and database API routes
- [TypeScript](https://github.com/microsoft/TypeScript) - Type safety
- [Tailwind](https://github.com/tailwindlabs/tailwindcss) - Styling
- [DaisyUI](https://github.com/saadeghi/daisyui) - UI components
- [Prisma](https://github.com/prisma/prisma) - Database ORM
- [Netlify Functions](https://www.netlify.com/products/functions/) - Serverless file operations
- [Netlify Blobs](https://www.netlify.com/platform/core/blobs/) - File storage
- [ScreenshotOne API](https://screenshotone.com/) - Screenshot generation
- [Zustand](https://github.com/pmndrs/zustand) - State management

## Hybrid Architecture Flow

### File Operations (Serverless)

```
User → Frontend → Netlify Functions → Netlify Blobs
```

- File uploads, downloads, processing
- Background screenshot generation via ScreenshotOne API
- Archive creation and retrieval

### Database Operations (Next.js)

```
User → Frontend → Next.js API Routes → Database
```

- Authentication and user management
- Link/collection CRUD operations
- Complex business logic and transactions

## Folder Structure

```
linkalbum/
├── components/          # React components
├── hooks/              # React reusable hooks  
├── layouts/            # Page layouts
├── lib/
│   ├── api/            # Server-side functions and controllers
│   │   └── blobOperations.ts  # Unified blob operations interface
│   ├── client/         # Client-side functions
│   └── shared/         # Shared utilities
├── netlify/functions/  # Serverless functions
│   ├── blob-create.mjs    # File upload
│   ├── blob-read.mjs      # File download  
│   ├── blob-delete.mjs    # File deletion
│   ├── blob-move.mjs      # File moving
│   ├── process-link.mjs   # Background processing
│   └── get-archive.js     # Archive retrieval
├── pages/              # Next.js pages and API routes
│   └── api/v1/         # Database API endpoints
├── prisma/             # Database schema and migrations
├── store/              # Zustand state management
├── styles/             # CSS and styling
├── types/              # TypeScript type definitions
└── _deprecated/        # Deprecated/legacy code (for reference)
```

## Development Commands

```bash
# Start development server (hybrid architecture)
npm run dev

# Build and start production
npm run build  
npm run start

# Database operations
npm run prisma:generate
npm run prisma:deploy
```

## Architecture Benefits

✅ **Best of both worlds**: Serverless file ops + reliable database operations  
✅ **Gradual migration**: Can move more operations to serverless over time  
✅ **Cost efficient**: Pay only for serverless usage, keep complex logic in Next.js  
✅ **Scalable**: File operations scale automatically with Netlify Functions  
✅ **Maintainable**: Clear separation of concerns between file and database operations

## Screenshot Implementation

**Current**: ScreenshotOne API (Serverless)
- ✅ No server-side browser automation needed
- ✅ High-quality screenshots with ad/cookie banner blocking
- ✅ Fast response times via API
- ✅ No Playwright dependencies

**Previous**: Playwright (Deprecated → `_deprecated/`)
- ❌ Required server-side browser automation
- ❌ Heavy dependencies and maintenance
- ❌ Slower processing times
- ❌ Server resource intensive

## User Upload Flow

1. **User selects file** → Frontend (React)
2. **File upload** → `/.netlify/functions/blob-create` (Serverless)
3. **Metadata save** → `/api/v1/links` → Database (Next.js)
4. **Background processing** → `/.netlify/functions/process-link` (Serverless)
5. **Screenshot generation** → ScreenshotOne API (External service)

## Deprecated Components

All deprecated files have been moved to `_deprecated/` folder for historical reference:

- ❌ Playwright-based screenshot functions
- ❌ TypeScript documentation files (now in Markdown)
- ❌ Old worker scripts
- ❌ Test components and pages
- ❌ Conflicting storage implementations
- ❌ End-to-end testing setup

The codebase is now clean and focused on the working hybrid architecture.
