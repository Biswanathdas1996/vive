# Overview

AgentCode is an AI-powered web application generator that enables users to create complete web applications through a conversational interface. The platform combines modern React frontend technologies with a Node.js/Express backend and leverages Google Gemini 1.5 Flash to analyze user requirements, generate file structures, and create self-contained HTML applications. The system provides real-time chat interaction, file management, and live preview capabilities for generated HTML-only applications with embedded CSS and JavaScript.

# User Preferences

Preferred communication style: Simple, everyday language.

Code generation preference: Generate only HTML files with embedded CSS and JavaScript. No separate CSS or JS files.

# System Architecture

## Frontend Architecture

The client is built with **React 18** and **TypeScript**, using **Vite** as the build tool for fast development and optimized production builds. The UI leverages **shadcn/ui** components built on **Radix UI** primitives with **Tailwind CSS** for styling, providing a modern dark-themed interface.

**State Management**: Uses **TanStack Query** (React Query) for server state management, caching, and API synchronization. Local component state is managed with React hooks.

**Routing**: Implements **Wouter** as a lightweight client-side routing solution instead of React Router.

**Component Structure**: 
- Modular component architecture with reusable UI components
- Three main interface panels: ChatInterface, FileExplorer, and PreviewPanel
- Comprehensive UI component library from shadcn/ui

## Backend Architecture

**Server Framework**: **Express.js** with TypeScript running on Node.js, configured for both development and production environments.

**Development Setup**: Integrates **Vite** middleware in development mode for hot module replacement and seamless frontend-backend integration.

**API Design**: RESTful API structure with organized route handlers in `/server/routes.ts`.

**Error Handling**: Centralized error handling middleware with structured error responses.

## Data Storage Solutions

**Primary Database**: **PostgreSQL** configured through **Drizzle ORM** with connection to **Neon Database** (serverless PostgreSQL).

**Schema Design**: 
- `projects` table: Stores project metadata and file structure
- `chatSessions` table: Maintains conversation history with workflow tracking
- `generatedFiles` table: Tracks generated application files and their status

**In-Memory Storage**: Implements a fallback memory storage system for development/testing scenarios.

**File System**: Generated HTML applications are stored in the local file system under `/public` directory for serving static content. Each HTML file is completely self-contained with embedded CSS and JavaScript.

## Authentication and Authorization

Currently implements a minimal user system with username-based identification. The storage interface is designed to accommodate future authentication enhancements through the `IStorage` interface pattern.

## External Dependencies

**AI Services**: 
- **Google Gemini 1.5 Flash** for prompt analysis, requirement extraction, and code generation
- JSON extraction from natural language responses for parsing AI-generated content

**Database Services**:
- **Neon Database** (serverless PostgreSQL) for production data persistence
- **Drizzle ORM** for type-safe database operations and migrations

**Development Tools**:
- **Replit** integration with cartographer plugin and error overlay for development environment
- **esbuild** for production server bundling

**UI/UX Libraries**:
- **Radix UI** primitives for accessible component foundation
- **Tailwind CSS** for utility-first styling
- **Lucide React** for consistent iconography
- **Font Awesome** for additional icons
- **Google Fonts** (Inter, JetBrains Mono) for typography

**Utility Libraries**:
- **class-variance-authority** for component variant management
- **clsx** and **tailwind-merge** for conditional styling
- **date-fns** for date manipulation
- **react-hook-form** with **@hookform/resolvers** for form management
- **zod** with **drizzle-zod** for schema validation

The architecture supports a complete AI-driven development workflow from requirement analysis to code generation, file management, and real-time preview capabilities.