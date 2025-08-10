# Overview

AgentCode is an AI-powered web application generator that enables users to create complete web applications through a conversational interface. The platform combines modern React frontend technologies with a Node.js/Express backend and leverages Google Gemini 1.5 Flash to analyze user requirements, generate file structures, and create self-contained HTML applications. The system provides real-time chat interaction, file management, and live preview capabilities for generated HTML-only applications with embedded CSS and JavaScript.

# User Preferences

Preferred communication style: Simple, everyday language.

Code generation preference: Generate only HTML files with embedded CSS and JavaScript. No separate CSS or JS files. File structure generation includes extremely detailed prompts (8-15+ sentences) for each page with comprehensive UI components, interactive elements, forms, data visualization, modern web features, and accessibility compliance. Modern design standards with high-quality visual elements using colored geometric shapes instead of images.

Image upload functionality: For 2nd prompt onwards, users can upload images to change the design of the selected page. Images are stored in object storage and included as design reference context.

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

**File System**: Generated HTML applications are stored in the local file system under `/public` directory for serving static content. Each HTML file is completely self-contained with embedded CSS and JavaScript, featuring modern design patterns with colored geometric shapes replacing traditional images.

**Object Storage**: **Replit Object Storage** integrated for user-uploaded images that serve as design references. Features include:
- Presigned URL uploads for secure direct-to-cloud file transfers
- Public visibility for design reference images
- ACL policy management for object access control
- Integration with chat interface for contextual design modifications

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

**File Upload Libraries**:
- **Uppy** for comprehensive file upload functionality with dashboard interface
- **@uppy/core** for core upload functionality
- **@uppy/react** for React integration
- **@uppy/aws-s3** for direct-to-S3 uploads via presigned URLs

**Utility Libraries**:
- **class-variance-authority** for component variant management
- **clsx** and **tailwind-merge** for conditional styling
- **date-fns** for date manipulation
- **react-hook-form** with **@hookform/resolvers** for form management
- **zod** with **drizzle-zod** for schema validation

The architecture supports a complete AI-driven development workflow from requirement analysis to code generation, file management, and real-time preview capabilities.

# Recent Changes

## Multi-Provider AI Model Selection System (January 2025)

Implemented a comprehensive AI provider selection system that allows users to choose between multiple AI providers and models through the settings interface.

**Key improvements:**
- **Multi-Provider Support**: Integrated support for Gemini, OpenAI, and Claude AI providers
- **Model Selection**: Users can choose from specific model versions for each provider:
  - Gemini: gemini-1.5-flash, gemini-1.5-pro, gemini-2.0-flash-exp
  - OpenAI: gpt-4o, gpt-4o-mini, gpt-4-turbo, gpt-3.5-turbo
  - Claude: claude-sonnet-4-20250514, claude-3-7-sonnet-20250219, claude-3-5-sonnet-20241022, claude-3-haiku-20240307
- **Dynamic Configuration**: Settings are stored in database and applied to all AI generation processes
- **API Key Management**: Secure storage and configuration of API keys for different providers
- **Settings Interface**: Complete settings page with dropdowns for provider and model selection
- **Backward Compatibility**: Default fallback to Gemini with environment variables

**Technical Implementation:**
- Refactored LLMService to use settings-based configuration instead of hardcoded models
- Added comprehensive error handling for missing API keys and provider failures
- Implemented dynamic client initialization based on user preferences
- Created unified content generation interface across all providers
- Database schema supports storing user preferences and API keys

**Latest Update:** Refactored the original llm.ts service to accommodate model selection from the frontend, consolidating the AI provider switching functionality into a single service while maintaining all existing features and improving extensibility for future AI providers. All generation processes now consistently use settings-configured models:

- **Prompt Analysis**: Uses selected AI provider and model from settings
- **File Structure Generation**: Dynamic model switching based on user preferences
- **Content Generation**: Respects user-selected provider configuration
- **File Modification**: Applies settings-based model selection
- **Image Analysis**: Integrated with multi-provider system for design analysis

The system ensures 100% consistency across all AI operations, with all configuration data stored exclusively in the PostgreSQL database.

## Database-Only Configuration System (January 2025)

Completely removed environment variable dependencies and implemented a pure database-driven configuration system:

**Key improvements:**
- **Database Storage**: All settings, API keys, and model preferences are stored in PostgreSQL database only
- **No Environment Variables**: Removed all fallbacks to environment variables for AI provider configuration
- **DatabaseStorage Implementation**: Replaced MemStorage with DatabaseStorage class for persistent data
- **Strict Database Requirements**: All API endpoints now require database configuration or return appropriate errors
- **Complete Data Persistence**: User preferences, provider settings, and API keys persist between sessions in database

**Technical Implementation:**
- Created comprehensive DatabaseStorage class implementing IStorage interface
- Updated all LLM services to require database settings without environment variable fallbacks
- Added /api/ai-config endpoint for database-only configuration checking
- Modified /api/settings endpoint to enforce database-only configuration
- Database schema supports all necessary fields for complete AI provider management
- Implemented proper error handling for missing database configuration

**Database Migration:**
- Executed `npm run db:push` to create all necessary PostgreSQL tables
- Settings table stores: user preferences, AI provider, model selection, API keys, preferences, and database configuration
- All services now query database directly for configuration without environment variables

## Configurable Database System (January 2025)

Extended the database-only system to make database connections fully configurable through the settings interface:

**Key Features:**
- **Dynamic Database Connections**: Database connection details can be configured through settings interface
- **Database Configuration Management**: Users can configure host, port, database name, credentials, and SSL settings
- **Connection Testing**: API endpoint to test database connections before saving configuration
- **Fallback Support**: System maintains environment variable fallback for initial bootstrap
- **Live Connection Switching**: Dynamic database service manages connection pools efficiently

**Technical Implementation:**
- Created DatabaseManager service for managing configurable database connections
- Added database configuration fields to Settings schema (host, port, database, username, password, ssl, connectionString)
- Implemented separation of concerns: static connection for settings storage, dynamic connection for configured databases
- Added API endpoints: /api/database/test and /api/database/status
- Solved circular dependency issue by using static database connection for settings operations
- Added comprehensive database configuration UI with connection testing functionality
- Comprehensive connection string building from individual config parameters

**Key Features Working:**
- ✅ Database URL configuration through settings interface
- ✅ Connection testing before saving configuration
- ✅ Automatic fallback to environment variables when no custom database configured
- ✅ Proper separation of settings storage from configured database operations
- ✅ Real-time connection status monitoring
- ✅ **Data Migration System**: All settings, API keys, and preferences are automatically migrated to configured custom database
- ✅ **Unified Storage**: Once custom database is configured, ALL application data is stored there instead of environment database
- ✅ **Complete Configuration Storage**: Database configuration UI clearly indicates that all data will be stored in the configured database