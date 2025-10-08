# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

KeepWatching Admin Server is an Express-based REST API server for managing the KeepWatching application. It provides administrative endpoints for account management, content, notifications, email, services, and logs.

The server depends heavily on two shared packages:
- `@ajgifford/keepwatching-common-server`: Shared server utilities, services, middleware, error handling, and configuration
- `@ajgifford/keepwatching-types`: Shared TypeScript types

## Development Commands

### Building & Running
- `yarn dev` - Start development server with hot reload using tsx
- `yarn build` - Compile TypeScript to JavaScript (output to dist/)
- `yarn rebuild` - Clean and rebuild
- `yarn start` - Run production build from dist/server.js

### PM2 Process Management
- `yarn pm2:dev` - Start dev server via PM2
- `yarn pm2:prod` - Build and start production server via PM2
- `yarn pm2:stop:dev` - Stop dev PM2 instance
- `yarn pm2:stop:prod` - Stop production PM2 instance
- `yarn pm2:restart` - Restart PM2 instances
- `yarn pm2:logs` - View PM2 logs
- `./scripts/start-admin.sh dev|prod` - Copy appropriate .env file and start with PM2

### Code Quality
- `yarn format` - Format code with Prettier

## Architecture

### Request Flow
1. **Entry Point**: `src/server.ts` initializes Express app, Firebase, database connections, and middleware
2. **Routers**: Route files in `src/routes/` define HTTP endpoints (e.g., `/api/v1/accounts`)
3. **Controllers**: Controller files in `src/controllers/` handle request/response logic with validation
4. **Services**: Business logic lives in shared `@ajgifford/keepwatching-common-server/services`
5. **Middleware**: Response interception and error handling from shared package

### Key Patterns

**Validation**:
- Routers use middleware validators from `@ajgifford/keepwatching-common-server` (e.g., `validateRequest`, `validateSchema`)
- Controllers often use Zod schemas for request validation
- Parse and validate params, query, and body before processing

**Error Handling**:
- Controllers wrapped with `asyncHandler` from `express-async-handler`
- Custom errors from `@ajgifford/keepwatching-common-server` (e.g., `BadRequestError`)
- Global error handler middleware catches all errors

**Services**:
- Import services from `@ajgifford/keepwatching-common-server/services`
- Common services: `accountService`, `profileService`, `notificationsService`, `emailService`, `databaseService`

**Configuration**:
- Environment variables loaded via dotenv
- Config helpers from `@ajgifford/keepwatching-common-server/config` (e.g., `getPort`, `getServiceAccountPath`)

### Router/Controller Organization

Each domain has a router and controller pair:
- **Account Management**: Manage accounts and profiles
- **Content**: TV shows and movies metadata
- **Email**: Send emails via configured SMTP
- **Notifications**: In-app notifications with start/end dates
- **Services**: Streaming service information
- **Logs**: Access server log files

## Environment Configuration

The `.env` file (gitignored) contains:
- Database credentials (MySQL)
- Firebase service account path
- Email configuration (SMTP)
- API tokens (e.g., TMDB)
- Directories for logs and uploads
- Rate limiting settings

Use `.env.development` or `.env.production` and copy to `.env` via the start script.

## Firebase Integration

Firebase Admin SDK initialized in `src/server.ts`:
- Requires service account JSON file (path from `SERVICE_ACCOUNT_PATH` env var)
- Graceful shutdown cleanup via `shutdownFirebase()`

## Database

MySQL database accessed via Knex:
- Connection managed by `databaseService` from shared package
- Database queries in service layer (not in this repo)

## Common Gotchas

**Imports**: Use ES module syntax with `.js` extensions omitted. The module system is Node16.

**Middleware Order**: Response interceptor runs before routes, error handler runs after.

**Validation Placement**: Some routes use middleware validators (`validateSchema`), others validate in controllers with Zod. Be consistent within each router.

**Environment Files**: Never commit `.env` files. Use the start script to copy the right one.
