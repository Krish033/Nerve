# NURVE PLATFORM - PROJECT SETUP GUIDE
**Enterprise-Grade Modular SaaS Platform**  
**Version:** 1.0.0  
**Last Updated:** May 26, 2026

---

## TABLE OF CONTENTS

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Project Structure](#project-structure)
4. [Environment Setup](#environment-setup)
5. [Database Setup](#database-setup)
6. [Running the Application](#running-the-application)
7. [Development Workflow](#development-workflow)
8. [Production Deployment](#production-deployment)
9. [Troubleshooting](#troubleshooting)

---

## PREREQUISITES

### Required Software

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 20.x or higher | Runtime environment |
| npm | 10.x or higher | Package manager |
| PostgreSQL | 15.x or higher | Primary database |
| Redis | 7.x or higher | Caching, queues, events |
| Git | 2.x or higher | Version control |

### Verify Installation

```bash
# Check versions
node --version    # v20.x.x
npm --version     # 10.x.x
psql --version    # 15.x
redis-cli --version # 7.x
git --version     # 2.x
```

---

## QUICK START

### 1. Clone the Repository

```bash
git clone https://github.com/Krish033/Nerve.git
cd Nerve
```

### 2. Install Dependencies

```bash
# Install all dependencies
npm run install:all

# Or install manually:
cd client && npm install
cd ../microservices/marketplace && npm install
```

### 3. Configure Environment

```bash
# Copy environment examples
cp client/.env.example client/.env.local
cp microservices/marketplace/.env.example microservices/marketplace/.env
```

### 4. Start Infrastructure Services

```bash
# Start PostgreSQL and Redis
# macOS (with Homebrew)
brew services start postgresql@15
brew services start redis

# Linux (Ubuntu/Debian)
sudo systemctl start postgresql
sudo systemctl start redis

# Docker (alternative)
docker-compose up -d postgres redis
```

### 5. Setup Database

```bash
cd microservices/marketplace
npx prisma migrate dev
npx prisma db seed
```

### 6. Start Development Servers

```bash
# Terminal 1: Start Backend
cd microservices/marketplace
npm run start:dev

# Terminal 2: Start Frontend
cd client
npm run dev
```

### 7. Access the Application

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:3002
- **API Documentation:** http://localhost:3002/api/docs

---

## PROJECT STRUCTURE

```
nurve/
├── client/                          # Next.js Frontend
│   ├── app/                         # App Router (Next.js 15)
│   │   ├── auth/                    # Auth pages
│   │   ├── dashboard/               # Dashboard
│   │   ├── marketplace/             # Module marketplace
│   │   └── settings/                # App settings
│   ├── components/                  # Shared components
│   ├── lib/                         # Utilities, stores, API
│   ├── hooks/                       # Custom React hooks
│   └── public/                      # Static assets
│
├── microservices/
│   └── marketplace/                 # Backend API (NestJS)
│       ├── src/
│       │   ├── kernel/              # Core platform kernel
│       │   │   ├── core/            # Kernel services
│       │   │   ├── contracts/       # Interfaces
│       │   │   └── index.ts         # Exports
│       │   ├── modules/             # Feature modules
│       │   └── main.ts              # Entry point
│       ├── prisma/                  # Database schema
│       └── test/                    # Test suites
│
├── docs/                            # Documentation
│   ├── ARCHITECTURE_*.md            # Architecture docs
│   └── SETUP_GUIDE.md               # This file
│
└── docker-compose.yml               # Infrastructure services
```

---

## ENVIRONMENT SETUP

### Client Environment (.env.local)

```env
# Next.js App
NEXT_PUBLIC_APP_NAME=Nurve
NEXT_PUBLIC_APP_URL=http://localhost:3000

# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3002
NEXT_PUBLIC_WS_URL=ws://localhost:3002

# Auth
NEXT_PUBLIC_AUTH_COOKIE_DOMAIN=localhost

# Features
NEXT_PUBLIC_ENABLE_ANALYTICS=false
NEXT_PUBLIC_ENABLE_NOTIFICATIONS=true
```

### Backend Environment (.env)

```env
# Server
NODE_ENV=development
PORT=3002

# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/nurve?schema=public"

# Redis (Required for production features)
USE_REDIS=true
REDIS_URL="redis://localhost:6379"

# Security
JWT_SECRET=your-super-secret-jwt-key-change-in-production
ENCRYPTION_KEY=your-encryption-key-32-chars-min

# Logging
LOG_LEVEL=debug
LOG_FORMAT=json

# Queue
QUEUE_CONCURRENCY=5
QUEUE_MAX_ATTEMPTS=3

# Module Discovery
MODULES_DIR=./src/modules
```

---

## DATABASE SETUP

### 1. Create Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE nurve;
CREATE USER nurve_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE nurve TO nurve_user;
\q
```

### 2. Run Migrations

```bash
cd microservices/marketplace

# Generate migration from schema changes
npx prisma migrate dev --name init

# Apply pending migrations
npx prisma migrate deploy
```

### 3. Seed Data (Optional)

```bash
# Run seed script
npx prisma db seed

# Or run TypeScript seed directly
npx ts-node seed-data.ts
```

### 4. Verify Database

```bash
# Open Prisma Studio
npx prisma studio

# Access at: http://localhost:5555
```

---

## RUNNING THE APPLICATION

### Development Mode

```bash
# Start all services (requires tmux or multiple terminals)
npm run dev:all

# Or start individually:
npm run dev:backend    # Backend only
npm run dev:frontend   # Frontend only
```

### Production Mode

```bash
# Build for production
npm run build:all

# Start production servers
npm run start:backend
npm run start:frontend
```

### Docker Deployment

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

---

## DEVELOPMENT WORKFLOW

### Code Structure Guidelines

1. **Kernel Changes:** All core changes in `microservices/marketplace/src/kernel/`
2. **Module Development:** Create modules in `src/modules/{module-name}/`
3. **Frontend Components:** Use `client/components/ui/` for shared UI
4. **API Clients:** Use `client/lib/api.ts` for backend communication

### Adding a New Module

```bash
# 1. Create module directory
mkdir -p microservices/marketplace/src/modules/my-module/backend
mkdir -p microservices/marketplace/src/modules/my-module/frontend

# 2. Create manifest.json
cat > microservices/marketplace/src/modules/my-module/manifest.json << 'EOF'
{
  "id": "my-module",
  "name": "My Module",
  "version": "1.0.0",
  "description": "Module description",
  "dependencies": [],
  "permissions": ["my-module.read"]
}
EOF

# 3. Implement module class
# See: microservices/marketplace/src/kernel/core/base-module.ts
```

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/my-feature

# Make changes and commit
git add .
git commit -m "feat: add new feature"

# Push to remote
git push origin feature/my-feature

# Create pull request on GitHub
```

---

## PRODUCTION DEPLOYMENT

### Prerequisites

- [ ] PostgreSQL 15+ cluster
- [ ] Redis 7+ cluster
- [ ] Node.js 20+ runtime
- [ ] SSL certificates
- [ ] Domain configured
- [ ] Environment variables set

### Deployment Steps

1. **Build Application**
   ```bash
   npm run build:all
   ```

2. **Database Migration**
   ```bash
   cd microservices/marketplace
   npx prisma migrate deploy
   ```

3. **Start Services**
   ```bash
   # Using PM2
   pm2 start ecosystem.config.js
   
   # Or systemd
   sudo systemctl start nurve-backend
   sudo systemctl start nurve-frontend
   ```

4. **Health Check**
   ```bash
   curl https://api.yourdomain.com/health
   curl https://app.yourdomain.com
   ```

### Environment Variables (Production)

```env
NODE_ENV=production
DATABASE_URL="postgresql://user:pass@prod-db:5432/nurve"
REDIS_URL="redis://prod-redis:6379"
JWT_SECRET=<strong-random-secret>
ENCRYPTION_KEY=<32-char-encryption-key>
LOG_LEVEL=info
```

---

## TROUBLESHOOTING

### Common Issues

#### Issue: "Cannot connect to database"
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Verify connection
psql -U postgres -d nurve -c "SELECT 1"

# Check .env DATABASE_URL format
```

#### Issue: "Redis connection failed"
```bash
# Check Redis status
redis-cli ping  # Should return PONG

# Verify REDIS_URL in .env
```

#### Issue: "Module not found"
```bash
# Clear module cache
rm -rf microservices/marketplace/src/modules/.cache

# Rebuild kernel
npm run build:kernel
```

#### Issue: "401 Unauthorized" errors
```bash
# Check JWT_SECRET is set
# Verify auth cookies are being sent
# Check token expiration settings
```

#### Issue: "Queue jobs not processing"
```bash
# Verify Redis is running
# Check worker logs
# Restart queue service
npm run queue:restart
```

### Getting Help

1. **Documentation:** Check `docs/` folder
2. **Architecture:** Read `ARCHITECTURE_MODULAR_PLATFORM.md`
3. **Issues:** Create GitHub issue with:
   - Error message
   - Steps to reproduce
   - Environment details

---

## NEXT STEPS

After setup:

1. **Create Admin User:** Register at `/auth/register`
2. **Install Modules:** Visit `/marketplace`
3. **Configure Settings:** Go to `/settings`
4. **Read Documentation:** Check `/docs` folder

---

**You're now ready to build with Nurve! 🚀**

For questions or issues, please open a GitHub issue.
