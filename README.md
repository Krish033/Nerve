# Nurve

## Overview

Nurve is a multi-service web platform built with a modular architecture. It consists of:

- **Frontend**: Next.js 16 application with React 19
- **Gateway API**: NestJS authentication and core services gateway
- **Marketplace Service**: NestJS microservice for marketplace functionality

### Current State

**Development Stage**: Alpha / Active Development

The project has working authentication, user management, notifications, messaging, and a modular kernel architecture. However, many features are partially implemented or need refinement. The codebase is functional but requires cleanup and stabilization.

### Target Architecture

The long-term goal is a modular monolith platform with:
- Event-driven module communication
- Multi-tenant SaaS foundation
- Plugin-based extensibility
- Workflow automation engine
- Queue-based async processing

---

## Features Implemented

### ✅ Completed Features

#### Authentication & User Management
- [x] Firebase Authentication integration (email/password, Google OAuth)
- [x] JWT-based session management with access/refresh tokens
- [x] Two-factor authentication (TOTP) support
- [x] Password reset flow
- [x] User profile management
- [x] Session tracking and management
- [x] Role-based access control (RBAC) foundation

**How it works**: Auth flows through the Gateway service which validates Firebase tokens, issues JWTs, and manages sessions in PostgreSQL. The client uses React Query for auth state and Zustand for global state.

#### Notifications System
- [x] In-app notification center
- [x] Real-time notification delivery via WebSockets
- [x] Notification read/unread status
- [x] Push notification support (FCM integration)

**Limitations**: Push notifications require proper FCM setup. Some notification types are hardcoded rather than fully configurable.

#### Messaging
- [x] Real-time chat interface
- [x] Socket.io-based messaging
- [x] Message history
- [x] Conversation list

**Limitations**: Chat is functional but lacks advanced features like file attachments, typing indicators, or message reactions.

#### Search
- [x] Global search across notifications, users, settings, and logs
- [x] Category filtering (All, Notifications, Users, Settings, Logs)
- [x] Sort by relevance or newest
- [x] Real-time search results

**How it works**: Search aggregates data from multiple backend endpoints and presents unified results with category badges.

#### Settings & Configuration
- [x] User profile settings
- [x] Theme management
- [x] Security settings (2FA, password change)
- [x] Email configuration UI (SMTP/Mailgun)
- [x] Activity logs viewer

**Limitations**: Email settings UI exists but backend integration for actual email sending is partially implemented.

#### UI/UX
- [x] Responsive design with Tailwind CSS 4
- [x] Dark/light theme support
- [x] Command palette (Cmd+K)
- [x] Notification toast system (Sonner)
- [x] Form validation with React Hook Form + Zod
- [x] Modal and dialog system

#### Modular Kernel Architecture (New)
- [x] Core kernel with module registry
- [x] Event bus for decoupled communication
- [x] Permission system with tenant isolation
- [x] Workflow engine foundation
- [x] Queue service for async processing
- [x] Tenant service for multi-tenancy
- [x] Base module class for extensibility

**Status**: The kernel architecture is implemented and functional but not yet fully integrated with all existing features.

---

### 🚧 Partial/In-Progress Features

#### Marketplace
- [~] Marketplace browsing UI exists
- [~] Basic listing structure
- [ ] Full marketplace functionality (purchasing, reviews, etc.)

**Status**: UI scaffolding exists but core marketplace logic needs implementation.

#### Workflow Engine
- [~] Workflow definition structures
- [~] Basic action handlers (notification, http, delay, log)
- [ ] Full workflow execution with persistence
- [ ] Workflow UI builder

**Status**: Backend workflow engine is functional but lacks UI and database persistence.

#### Scraper/Crawler System
- [~] Architecture documentation exists
- [~] Database schemas for crawled data
- [ ] Actual crawler implementation
- [ ] Job queue integration

**Status**: Designed but not fully implemented.

---

### ❌ Pending Features

- [ ] Plugin marketplace
- [ ] GraphQL API gateway
- [ ] Advanced analytics dashboard
- [ ] File upload/storage system (Firebase Storage integrated but not fully used)
- [ ] Email sending functionality
- [ ] SMS notifications
- [ ] Webhook management system
- [ ] API key management for external integrations
- [ ] Advanced search with Elasticsearch/meilisearch
- [ ] Caching layer (Redis)
- [ ] Rate limiting
- [ ] Comprehensive test coverage

---

## Architecture

### Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | Next.js 16 + React 19 | SSR/SSG web application |
| Frontend Styling | Tailwind CSS 4 | Utility-first CSS |
| Frontend State | Zustand + React Query | Global state and server state |
| UI Components | shadcn/ui + Radix | Accessible component library |
| Gateway API | NestJS 11 | Main API gateway |
| Microservices | NestJS 11 | Modular services |
| Database | PostgreSQL 15 | Primary data store |
| ORM | Prisma 6/7 | Database access |
| Auth | Firebase Auth + JWT | User authentication |
| Real-time | Socket.io | WebSocket communication |
| Queue | In-memory (Bull pending) | Job processing |
| Deployment | Node.js | Server runtime |

### Folder Structure

```
nurve/
├── client/                 # Next.js frontend
│   ├── app/               # App router pages
│   │   ├── auth/          # Login, register, forgot password
│   │   ├── marketplace/   # Marketplace browsing
│   │   ├── messaging/     # Chat interface
│   │   ├── notifications/ # Notification center
│   │   ├── profile/       # User profile
│   │   ├── search/        # Global search
│   │   └── settings/      # Settings pages
│   ├── components/        # Reusable components
│   │   ├── layouts/       # Layout components
│   │   ├── shared/        # Shared UI components
│   │   └── ui/            # shadcn/ui components
│   ├── lib/               # Utilities and hooks
│   │   ├── providers/     # Context providers
│   │   ├── store/         # Zustand stores
│   │   └── utils/         # Helper functions
│   └── public/            # Static assets
├── gateway/               # NestJS API gateway
│   └── src/
│       ├── auth/          # Authentication logic
│       ├── user/          # User management
│       ├── notification/  # Notification service
│       ├── search/        # Search aggregation
│       ├── settings/      # Settings management
│       └── prisma/        # Database schema
├── microservices/
│   └── marketplace/       # Marketplace microservice
│       └── src/
│           └── kernel/    # Modular kernel architecture
└── docs/                  # Documentation
```

### Data Flow

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   Client    │──────▶│   Gateway    │──────▶│  Database   │
│  (Next.js)  │◀──────│   (NestJS)   │◀──────│ (PostgreSQL)│
└─────────────┘      └──────────────┘      └─────────────┘
                            │
                            ▼
                     ┌──────────────┐
                     │   Firebase   │
                     │     Auth     │
                     └──────────────┘
```

### Request Lifecycle

1. **Client Request**: User action triggers API call via React Query
2. **Gateway Auth**: JWT validation and Firebase token verification
3. **Service Routing**: Request routed to appropriate service
4. **Database Access**: Prisma ORM handles database operations
5. **Response**: Data returned to client, React Query caches result

### Module Responsibility

- **Gateway**: Authentication, authorization, request routing, search aggregation
- **Marketplace Service**: Modular kernel, workflow engine, marketplace logic
- **Client**: UI rendering, state management, real-time updates

---

## Current Workflow

### How Data Enters the System

1. **User Registration**: Firebase Auth creates user → Gateway syncs to PostgreSQL
2. **User Actions**: Client sends requests → Gateway validates → Database updated
3. **Real-time Updates**: WebSocket events push updates to connected clients

### Authentication Flow

```
User Login
    │
    ▼
Firebase Auth (Client-side)
    │
    ▼
Gateway Validation
    │
    ▼
JWT Token Issued
    │
    ▼
Session Created in DB
    │
    ▼
Authenticated Requests
```

### Notification Flow

```
Event Occurs (message, system alert, etc.)
    │
    ▼
Notification Service Creates Record
    │
    ▼
WebSocket Broadcast to Relevant Users
    │
    ▼
Client Receives and Displays
```

---

## Pending Improvements

### Technical Debt

- **Console spam**: Numerous console.log statements need cleanup
- **Error handling**: Inconsistent error handling across services
- **Type safety**: Some areas use `any` types liberally
- **Test coverage**: Minimal test coverage exists
- **Code duplication**: Some utility functions duplicated across client/lib

### Scalability Concerns

- **In-memory queue**: Current queue service is in-memory only; needs Redis for production
- **Single gateway**: No load balancing or horizontal scaling configured
- **Database**: No read replicas or connection pooling configured
- **File storage**: Firebase Storage used but not optimized for high volume

### Security Issues

- **Environment variables**: Some validation missing
- **Rate limiting**: Not implemented
- **CORS**: Needs stricter configuration review
- **Input validation**: Some endpoints need stricter validation

### Reliability Concerns

- **No retry logic**: Failed operations don't always retry
- **Missing circuit breakers**: External service failures could cascade
- **Health checks**: Basic health checks exist but need expansion
- **Graceful shutdown**: Not fully implemented for all services

### Areas Needing Refactor

- **API layer**: Some endpoints mix concerns and need better separation
- **Component structure**: Some components are too large and need splitting
- **State management**: Mix of Zustand and React Query could be consolidated better
- **CSS organization**: Some Tailwind classes could be componentized

---

## Setup Instructions

### Prerequisites

- Node.js 20+
- PostgreSQL 15+
- Firebase project (free tier works)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd nurve
   ```

2. **Install dependencies**
   ```bash
   # Install client dependencies
   cd client && npm install
   
   # Install gateway dependencies
   cd ../gateway && npm install
   
   # Install marketplace dependencies
   cd ../microservices/marketplace && npm install
   ```

3. **Set up environment variables**
   
   Copy env.example files and fill in your values:
   ```bash
   # Client
   cd client
   cp env.example .env.local
   
   # Gateway
   cd ../gateway
   cp .env.example .env
   
   # Marketplace
   cd ../microservices/marketplace
   cp .env.example .env
   ```

4. **Set up the database**
   ```bash
   # Gateway database
   cd gateway
   npx prisma db push
   npx prisma generate
   
   # Marketplace database (separate or same, depending on config)
   cd ../microservices/marketplace
   npx prisma db push
   npx prisma generate
   ```

5. **Seed the database (optional)**
   ```bash
   cd gateway
   npm run db:seed
   ```

### Running Development Servers

1. **Start the Gateway**
   ```bash
   cd gateway
   npm run start:dev
   # Runs on http://localhost:4000
   ```

2. **Start the Marketplace Service**
   ```bash
   cd microservices/marketplace
   npm run start:dev
   # Runs on http://localhost:3001
   ```

3. **Start the Client**
   ```bash
   cd client
   npm run dev
   # Runs on http://localhost:3000
   ```

### Build Commands

```bash
# Client
npm run build      # Production build
npm run lint       # Run ESLint

# Gateway
npm run build      # Production build
npm run lint       # Run ESLint

# Marketplace
npm run build      # Production build
npm run lint       # Run ESLint
```

---

## Environment Variables

### Client (env.example → .env.local)

| Variable | Required | Description |
|----------|----------|-------------|
| NEXT_PUBLIC_FIREBASE_API_KEY | Yes | Firebase API key |
| NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN | Yes | Firebase auth domain |
| NEXT_PUBLIC_FIREBASE_PROJECT_ID | Yes | Firebase project ID |
| NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET | Yes | Firebase storage bucket |
| NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID | Yes | FCM sender ID |
| NEXT_PUBLIC_FIREBASE_APP_ID | Yes | Firebase app ID |
| NEXT_PUBLIC_FIREBASE_VAPID_KEY | No | For push notifications |
| NEXT_PUBLIC_CF_TURNSTILE_SITE_KEY | No | Cloudflare Turnstile key |

### Gateway (.env.example → .env)

| Variable | Required | Description |
|----------|----------|-------------|
| PORT | Yes | Server port (default: 4000) |
| NODE_ENV | Yes | environment mode |
| CLIENT_URL | Yes | Client URL for CORS |
| DATABASE_URL | Yes | PostgreSQL connection string |
| FIREBASE_PROJECT_ID | Yes | Firebase project ID |
| FIREBASE_PRIVATE_KEY | Yes | Firebase service account key |
| FIREBASE_CLIENT_EMAIL | Yes | Firebase service account email |
| JWT_ACCESS_SECRET | Yes | JWT signing secret |
| JWT_REFRESH_SECRET | Yes | JWT refresh secret |

---

## API Documentation

### Authentication

| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| /auth/login | POST | No | Login with email/password |
| /auth/register | POST | No | Register new user |
| /auth/refresh | POST | No | Refresh access token |
| /auth/logout | POST | Yes | Logout user |
| /auth/me | GET | Yes | Get current user |

### Users

| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| /users | GET | Yes | List users |
| /users/:id | GET | Yes | Get user details |
| /users/:id | PATCH | Yes | Update user |
| /users/:id/sessions | GET | Yes | Get user sessions |
| /users/:id/2fa | POST | Yes | Enable/disable 2FA |

### Notifications

| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| /notifications | GET | Yes | Get user notifications |
| /notifications/:id/read | PATCH | Yes | Mark as read |
| /notifications/read-all | POST | Yes | Mark all as read |

### Search

| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| /search | GET | Yes | Global search |

### Settings

| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| /settings | GET | Yes | Get settings |
| /settings | PATCH | Yes | Update settings |
| /settings/logs | GET | Yes | Get activity logs |

---

## Known Issues

### Bugs

1. **TypeScript errors in kernel modules**: Some type mismatches in the modular kernel that need fixing
2. **Search page refresh**: Sometimes shows no results on direct page load
3. **Notification badge**: Count doesn't always update in real-time

### Incomplete Systems

1. **Email sending**: UI exists but backend integration incomplete
2. **Marketplace**: Browse UI only, no actual purchasing
3. **Scraper**: Architecture designed but not implemented
4. **Workflow persistence**: Workflows run in memory only, no DB storage

### Edge Cases

1. **Token expiry**: Graceful handling of expired tokens needs improvement
2. **Offline mode**: No offline support implemented
3. **Large datasets**: Pagination not optimized for large collections

### Temporary Implementations

1. **Queue service**: In-memory only, needs Redis
2. **File uploads**: Basic structure but not production-ready
3. **Search**: Client-side aggregation, needs dedicated search service

---

## Roadmap

### Short-term (1-2 months)

- [ ] Fix TypeScript errors in kernel modules
- [ ] Complete email service integration
- [ ] Add comprehensive error handling
- [ ] Implement proper logging with structured format
- [ ] Add request/response logging middleware
- [ ] Clean up console.log statements
- [ ] Add rate limiting
- [ ] Improve test coverage

### Mid-term (3-6 months)

- [ ] Implement Redis for queue and caching
- [ ] Complete marketplace functionality
- [ ] Add file upload system
- [ ] Implement proper search with Meilisearch/Elasticsearch
- [ ] Add webhook system
- [ ] Implement plugin architecture fully
- [ ] Add API key management
- [ ] Build workflow UI builder

### Long-term (6+ months)

- [ ] Multi-tenant SaaS architecture
- [ ] Plugin marketplace
- [ ] GraphQL API gateway
- [ ] Mobile app (React Native)
- [ ] Advanced analytics
- [ ] AI-powered features (if applicable)
- [ ] Enterprise SSO (SAML, OIDC)
- [ ] Advanced security features (audit logs, data retention)

---

## Contributing

This is a private project. For questions or issues, contact the maintainers.

---

## License

UNLICENSED - Private project

---

## Support

For support, contact the development team or create an issue in the repository.
