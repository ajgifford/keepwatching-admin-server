# KeepWatching Admin Server

Backend REST API server for managing the KeepWatching application. This Express-based server provides administrative endpoints for account management, content management, notifications, email services, and system logs.

## Table of Contents

- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Development](#development)
- [Production Deployment](#production-deployment)
- [API Endpoints](#api-endpoints)
- [Architecture](#architecture)
- [Dependencies](#dependencies)
- [Scripts](#scripts)
- [License](#license)

## Features

- **Account Management**: Create, update, and manage user accounts and profiles
- **Content Management**: Manage TV shows and movies metadata
- **Notifications**: Send and manage in-app notifications with scheduling
- **Email Service**: SMTP-based email delivery system
- **Streaming Services**: Manage streaming service information
- **Statistics**: Access detailed analytics and usage statistics
- **Log Management**: View and monitor server logs
- **Rate Limiting**: Built-in API rate limiting for security
- **Firebase Integration**: User authentication via Firebase Admin SDK
- **MySQL Database**: Knex-based database queries and migrations
- **PM2 Support**: Process management for development and production

## Prerequisites

- **Node.js**: v18.x or higher
- **Yarn**: v1.22.x or higher
- **MySQL**: 8.0 or higher
- **Firebase**: Service account credentials
- **PM2** (optional): For process management

## Installation

1. Clone the repository:
```bash
git clone https://github.com/ajgifford/keepwatching-admin-server.git
cd keepwatching-admin-server
```

2. Install dependencies:
```bash
yarn install
```

3. Set up environment configuration:
```bash
# Copy the appropriate environment file
cp .env.development .env
# OR
cp .env.production .env
```

4. Configure your `.env` file (see [Configuration](#configuration))

5. Ensure Firebase service account JSON file is in place

## Configuration

Create a `.env` file with the following variables:

```env
# Server Configuration
NODE_ENV=development
PORT=3001
SERVICE_NAME=keepwatching-admin-server

# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=keepwatching

# Firebase Configuration
SERVICE_ACCOUNT_PATH=/path/to/firebase-service-account.json

# Email Configuration (Optional)
EMAIL_ENABLED=true
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@example.com
SMTP_PASSWORD=your_email_password
EMAIL_FROM=noreply@keepwatching.com

# API Configuration
TMDB_API_KEY=your_tmdb_api_key
TMDB_API_READ_ACCESS_TOKEN=your_tmdb_read_token

# Directories
UPLOAD_DIRECTORY=/path/to/uploads
LOG_DIRECTORY=/path/to/logs

# Rate Limiting
RATE_LIMIT_TIME_WINDOW=900000
RATE_LIMIT_MAX=100
```

### Environment Files

- `.env.development` - Development configuration
- `.env.production` - Production configuration
- `.env` - Active configuration (gitignored)

Use the start scripts to automatically copy the correct environment file:

```bash
./scripts/start-admin.sh dev   # Uses .env.development
./scripts/start-admin.sh prod  # Uses .env.production
```

## Development

### Start Development Server

Using tsx with hot reload:
```bash
yarn dev
```

Using PM2:
```bash
yarn pm2:dev
```

Using the start script:
```bash
yarn start:dev
# OR
./scripts/start-admin.sh dev
```

### Building

Compile TypeScript to JavaScript:
```bash
yarn build
```

Clean and rebuild:
```bash
yarn rebuild
```

### Code Formatting

Format code with Prettier:
```bash
yarn format
```

## Production Deployment

### Build and Start

1. Build the project:
```bash
yarn build
```

2. Start production server:
```bash
yarn start
```

### Using PM2 (Recommended)

Start with PM2:
```bash
yarn pm2:prod
# OR
yarn start:prod
# OR
./scripts/start-admin.sh prod
```

Manage PM2 processes:
```bash
# View logs
yarn pm2:logs

# Restart
yarn pm2:restart

# Stop production
yarn pm2:stop:prod

# Stop development
yarn pm2:stop:dev
```

### PM2 Ecosystem

The `ecosystem.config.js` file configures two PM2 processes:

- **keepwatching-admin-server**: Production (port 3001)
- **keepwatching-admin-server-dev**: Development with hot reload (port 3001)

## API Endpoints

All endpoints are prefixed with `/api/v1/`.

### Account Management
- `POST /api/v1/accounts` - Create account
- `GET /api/v1/accounts/:accountId` - Get account details
- `PUT /api/v1/accounts/:accountId` - Update account
- `DELETE /api/v1/accounts/:accountId` - Delete account
- Profile management endpoints

### Content Management
- `GET /api/v1/shows` - List TV shows
- `GET /api/v1/shows/:showId` - Get show details
- `GET /api/v1/movies` - List movies
- `GET /api/v1/movies/:movieId` - Get movie details
- Content metadata and cast management

### Notifications
- `POST /api/v1/notifications` - Create notification
- `GET /api/v1/notifications` - List notifications
- `PUT /api/v1/notifications/:notificationId` - Update notification
- `DELETE /api/v1/notifications/:notificationId` - Delete notification

### Email
- `POST /api/v1/email/send` - Send email
- `GET /api/v1/email/templates` - List email templates
- Email verification and testing endpoints

### Services
- `GET /api/v1/services` - List streaming services
- `PUT /api/v1/services/:serviceId` - Update service

### Statistics
- `GET /api/v1/statistics/accounts` - Account statistics
- `GET /api/v1/statistics/content` - Content statistics
- `GET /api/v1/statistics/usage` - Usage analytics

### Logs
- `GET /api/v1/logs` - List log files
- `GET /api/v1/logs/:filename` - View log file
- Real-time log streaming endpoints

## Architecture

### Request Flow

1. **Entry Point**: `src/server.ts` initializes Express, Firebase, database, and middleware
2. **Routers**: Route files in `src/routes/` define HTTP endpoints
3. **Controllers**: Controller files in `src/controllers/` handle request/response logic
4. **Services**: Business logic from `@ajgifford/keepwatching-common-server/services`
5. **Middleware**: Response interception and error handling

### Project Structure

```
keepwatching-admin-server/
├── src/
│   ├── server.ts                    # Application entry point
│   ├── controllers/                 # Request handlers
│   └── routes/                      # API route definitions
│       ├── accountManagementRouter.ts
│       ├── contentRouter.ts
│       ├── emailRouter.ts
│       ├── logRouter.ts
│       ├── notificationsRouter.ts
│       ├── servicesRouter.ts
│       └── statisticsRouter.ts
├── dist/                            # Compiled JavaScript
├── logs/                            # Application logs
├── scripts/                         # Deployment scripts
├── certs/                           # SSL certificates
├── .env                             # Environment configuration
├── ecosystem.config.js              # PM2 configuration
├── package.json                     # Dependencies and scripts
└── tsconfig.json                    # TypeScript configuration
```

### Key Design Patterns

**Validation**:
- Middleware validators from `@ajgifford/keepwatching-common-server`
- Zod schemas for request validation
- Validation of params, query, and body

**Error Handling**:
- Controllers wrapped with `asyncHandler`
- Custom error classes from shared package
- Global error handler middleware

**Services**:
- Shared business logic from `@ajgifford/keepwatching-common-server`
- Database operations via Knex
- Email, notifications, and account services

**Security**:
- Helmet for HTTP headers
- CORS configuration
- Rate limiting per endpoint
- Firebase authentication

## Dependencies

### Core Dependencies

- **express** (v5.1.0) - Web framework
- **firebase-admin** (v13.6.0) - Firebase authentication
- **knex** (v3.1.0) - SQL query builder
- **mysql2** (v3.15.3) - MySQL client
- **winston** (v3.18.3) - Logging
- **zod** (v3.25.76) - Schema validation

### Shared Packages

- **@ajgifford/keepwatching-common-server** (v0.9.2) - Shared server utilities, services, middleware
- **@ajgifford/keepwatching-types** (v0.7.4) - Shared TypeScript types

### Middleware & Utilities

- **helmet** (v8.0.0) - Security headers
- **cors** (v2.8.5) - CORS support
- **compression** (v1.8.0) - Response compression
- **express-rate-limit** (v8.2.1) - Rate limiting
- **morgan** (v1.10.0) - HTTP request logging

## Scripts

### Development
```bash
yarn dev              # Start with hot reload (tsx watch)
yarn pm2:dev          # Start with PM2 (development)
yarn start:dev        # Run start script for development
```

### Building
```bash
yarn build            # Compile TypeScript
yarn clean            # Remove dist folder
yarn rebuild          # Clean and build
```

### Production
```bash
yarn start            # Run compiled server
yarn pm2:prod         # Start with PM2 (production)
yarn start:prod       # Run start script for production
```

### PM2 Management
```bash
yarn pm2:logs         # View PM2 logs
yarn pm2:restart      # Restart PM2 processes
yarn pm2:stop:dev     # Stop development PM2 instance
yarn pm2:stop:prod    # Stop production PM2 instance
```

### Code Quality
```bash
yarn format           # Format code with Prettier
```

## Graceful Shutdown

The server implements graceful shutdown on receiving signals (SIGTERM, SIGINT, SIGUSR2):

1. HTTP server closes
2. Background jobs terminate
3. Database connections close
4. Firebase shuts down
5. Process exits

Timeout: 10 seconds before forced shutdown

## License

Private - Gifford Family Dev

---

**Note**: This server is designed to work in conjunction with:
- [keepwatching-admin-dashboard](https://github.com/ajgifford/keepwatching-admin-dashboard) - Admin web interface
- [keepwatching-api-server](https://github.com/ajgifford/keepwatching-api-server) - Main API server
- [keepwatching-client](https://github.com/ajgifford/keepwatching-client) - User-facing web application
