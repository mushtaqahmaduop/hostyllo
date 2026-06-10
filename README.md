# Hostyllo 🏢

> **Enterprise-Grade SaaS for Hostel Management & Billing Automation**

A comprehensive, production-ready platform designed to streamline hostel operations, automate billing cycles, and deliver exceptional resident experiences through intelligent automation and real-time analytics.

---

## 🌟 Overview

Hostyllo is a modern, cloud-native SaaS application built with cutting-edge technologies to solve complex hostel management challenges. From tenant management to automated rent generation, payment processing to financial analytics—Hostyllo provides an all-in-one solution for hostel operators and property managers.

### Core Value Proposition

- **Automate Everything**: Eliminate manual billing errors with intelligent automation
- **Real-Time Insights**: Dashboard analytics for informed decision-making
- **Secure & Compliant**: Enterprise-grade security with JWT + 2FA/TOTP
- **Scalable Architecture**: Built on proven technologies for millions of transactions
- **Developer Friendly**: RESTful APIs with comprehensive documentation

**Live Demo**: [https://hostyllo.vercel.app](https://hostyllo.vercel.app)

---

## ✨ Key Features

### 👥 Resident Management
- Comprehensive tenant profiles with full lifecycle tracking
- Document management and verification workflows
- Emergency contact management
- Flexible occupancy tracking and room assignments
- Automated tenant onboarding

### 💳 Billing & Payments
- **Automated Rent Generation**: Scheduled, recurring rent bills with configurable cycles
- **Payment Processing**: Integrated payment gateway with multiple methods
- **Invoice Management**: Professional PDF invoices and receipts
- **Payment Tracking**: Real-time payment status monitoring
- **Late Payment Alerts**: Automated notifications for overdue payments
- **Refund Management**: Secure deposit and refund handling

### 🏠 Room & Property Management
- Room inventory management with occupancy status
- Maintenance tracking and scheduling
- Room type configurations and pricing strategies
- Multi-property support
- Availability calendars and booking management

### 📊 Financial Analytics & Reporting
- Real-time financial dashboards
- Revenue forecasting and trend analysis
- Expense tracking and categorization
- Tax-ready financial reports
- Payment collection analytics
- Custom report generation

### 🤖 Intelligent Automation
- **Auto-Cancel Jobs**: Automatically cancel unpaid reservations
- **Rent Generation**: Intelligent scheduling with custom cycles
- **PDF Receipt Generation**: Automated receipt creation and distribution
- **Billing Sync**: Real-time billing synchronization across systems
- **Email Notifications**: Transactional emails for payments and alerts
- **Background Job Processing**: Powered by BullMQ + Redis

### 🔐 Security & Compliance
- **JWT Authentication**: Secure token-based authentication
- **2FA/TOTP Support**: Two-factor authentication for enhanced security
- **Helmet Security Headers**: Protection against common web vulnerabilities
- **Rate Limiting**: DDoS protection and abuse prevention
- **CORS Policy**: Controlled cross-origin access
- **Password Hashing**: Bcrypt with configurable salt rounds
- **Sentry Integration**: Real-time error tracking and monitoring (Coming Soon)

### 📧 Communication
- **Transactional Email**: Powered by Resend
- **Automated Notifications**: Payment receipts, reminders, and alerts
- **Email Templates**: Professional, customizable email designs
- **Webhook Support**: Integration with external systems

---

## 🛠️ Technology Stack

### Backend Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Vercel)                        │
│                  React/Next.js SPA                          │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTPS
┌──────────────────────▼──────────────────────────────────────┐
│              API Gateway / Load Balancer                    │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│         Fastify 4.28.0 (HTTP Server Framework)             │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Routes: Auth | Students | Rooms | Payments | etc.   │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Middleware: JWT | CORS | Rate Limit | Helmet        │  │
│  └──────────────────────────────────────────────────────┘  │
└──────────────┬──────────────────────────────────────────────┘
               │
       ┌───────┴────────┐
       │                │
   ┌───▼───────┐  ┌────▼──────┐
   │PostgreSQL │  │Redis Queue│
   │(Primary)  │  │(BullMQ)   │
   └───────────┘  └────┬──────┘
                       │
                   ┌───▼──────────────┐
                   │Background Workers│
                   │ • PDF Receipts   │
                   │ • Email Send     │
                   │ • Rent Generate  │
                   │ • Billing Sync   │
                   │ • Auto Cancel    │
                   └──────────────────┘
```

### Technology Matrix

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Runtime** | Node.js | 22.x | JavaScript runtime |
| **Language** | TypeScript | 5.5.0 | Type-safe development |
| **Framework** | Fastify | 4.28.0 | HTTP server (high-performance) |
| **Database** | PostgreSQL | 14+ | Relational data storage |
| **Cache/Queue** | Redis | 6+ | In-memory data store |
| **Job Queue** | BullMQ | 5.78.0 | Background job processing |
| **Authentication** | JWT (jose) | 5.9.3 | Token-based auth |
| **2FA** | TOTP (otplib) | 13.4.1 | Time-based OTP |
| **Password Hash** | Bcrypt | 5.1.1 | Secure hashing |
| **Email** | Resend | 3.2.0 | Transactional emails |
| **Security** | Helmet | 11.0.0 | HTTP security headers |
| **Rate Limiting** | @fastify/rate-limit | 9.0.0 | DDoS protection |
| **Build Tool** | Turbo | 2.9.16 | Monorepo orchestration |
| **Package Manager** | pnpm | 11.1.1 | Fast, disk-efficient PM |
| **Error Tracking** | Sentry | 7.x (planned) | Error monitoring |
| **Deployment** | Railway | Latest | Container hosting |

---

## 📦 Project Structure

```
hostyllo/
│
├── 📁 apps/
│   └── api/                          # Main Fastify Backend
│       ├── src/
│       │   ├── server.ts             # Entry point - Fastify app initialization
│       │   ├── routes/               # API endpoints
│       │   │   ├── auth.ts           # Authentication & JWT endpoints
│       │   │   ├── students.ts       # Student/tenant management
│       │   │   ├── rooms.ts          # Room inventory & occupancy
│       │   │   ├── payments.ts       # Payment processing & tracking
│       │   │   ├── expenses.ts       # Expense categorization & tracking
│       │   │   └── dashboard.ts      # Analytics & financial insights
│       │   ├── workers/              # Background job workers (BullMQ)
│       │   │   ├── auto-cancel.js    # Auto-cancel unpaid reservations
│       │   │   ├── pdf-receipts.js   # Generate PDF invoices/receipts
│       │   │   ├── rent-generate.js  # Scheduled rent bill creation
│       │   │   ├── billing-sync.js   # Sync billing across systems
│       │   │   └── email-send.js     # Send transactional emails
│       │   ├── middleware/           # Custom middleware (planned)
│       │   ├── services/             # Business logic (planned)
│       │   ├── utils/                # Helper functions (planned)
│       │   └── types/                # TypeScript interfaces
│       ├── dist/                     # Compiled JavaScript output
│       ├── package.json
│       ├── tsconfig.json
│       └── .env.example
│
├── 📁 packages/                      # Shared monorepo packages
│   ├── config/                       # Shared configuration
│   │   ├── eslint-plugin-hostyllo/  # Custom ESLint rules
│   │   └── package.json
│   └── db/                           # Database models & utilities
│       ├── src/
│       │   ├── models/               # ORM models / schemas
│       │   ├── migrations/           # SQL migrations
│       │   └── index.ts              # Exported utilities
│       └── package.json
│
├── 📁 scripts/                       # Utility & automation scripts
├── 📁 tasks/                         # Build & deployment tasks
├── 📁 .github/                       # GitHub workflows & CI/CD
│   └── workflows/                    # GitHub Actions pipelines
│
├── 📁 docs/                          # Documentation & guides
│
├── 📄 ROOT Configuration Files:
│   ├── package.json                  # Root monorepo package definition
│   ├── pnpm-workspace.yaml          # Monorepo workspace configuration
│   ├── pnpm-lock.yaml               # Locked dependency versions
│   ├── turbo.json                   # Turbo build orchestration config
│   ├── railway.toml                 # Railway deployment configuration
│   ├── railpack.json                # Railpack builder settings
│   ├── .gitignore                   # Git ignore patterns
│   ├── .env.example                 # Environment variables template
│   ├── AGENT_CONTEXT.md             # Agent-focused documentation
│   ├── AGENT_SESSION_GUIDE.md       # Agent session initialization guide
│   └── README.md                    # This file
```

---

## 🚀 Quick Start

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 22.x ([Download](https://nodejs.org))
- **pnpm** 11.1.1+ (`npm install -g pnpm`)
- **PostgreSQL** 14+ ([Download](https://www.postgresql.org/download))
- **Redis** 6+ ([Download](https://redis.io/download))
- **Git** ([Download](https://git-scm.com))

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/mushtaqahmaduop/hostyllo.git
   cd hostyllo
   ```

2. **Install dependencies**
   ```bash
   # IMPORTANT: Use pnpm, NOT npm or yarn
   pnpm install
   ```

3. **Configure environment variables**
   ```bash
   # Copy the example environment file
   cp .env.example .env.local
   
   # Edit with your configuration
   nano .env.local
   ```

4. **Set up the database**
   ```bash
   # Run migrations (when available)
   pnpm --filter @hostyllo/db migrate
   ```

5. **Start development server**
   ```bash
   # Start all apps in development mode
   pnpm dev
   
   # Or start only the API server
   cd apps/api && pnpm dev
   ```

   The API will be available at `http://localhost:3001`

### Health Check

```bash
# Verify the API is running
curl http://localhost:3001/api/v1/health

# Expected response:
# {"success":true,"data":{"db":"ok","redis":"ok","version":"1.0.0"}}
```

---

## 📋 Environment Configuration

Create `.env.local` in the project root:

```bash
# ==========================================
# SERVER & RUNTIME
# ==========================================
PORT=3001
NODE_ENV=production
ENVIRONMENT=development

# ==========================================
# DATABASE (PostgreSQL)
# ==========================================
DATABASE_URL=postgresql://hostyllo_user:secure_password@localhost:5432/hostyllo_db
DB_POOL_MIN=5
DB_POOL_MAX=20

# ==========================================
# CACHE & QUEUE (Redis)
# ==========================================
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=optional_redis_password
REDIS_DB=0

# ==========================================
# SECURITY & AUTHENTICATION
# ==========================================
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_EXPIRY=7d
COOKIE_SECRET=your-cookie-secret-min-32-chars

# ==========================================
# API & CORS
# ==========================================
CORS_ORIGIN=https://hostyllo.vercel.app
CORS_METHODS=GET,POST,PUT,DELETE,PATCH
CORS_CREDENTIALS=true
API_RATE_LIMIT=100

# ==========================================
# EMAIL SERVICE (Resend)
# ==========================================
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
EMAIL_FROM=noreply@hostyllo.com
EMAIL_SUPPORT=support@hostyllo.com

# ==========================================
# 2FA / TOTP Configuration
# ==========================================
TOTP_WINDOW=2
TOTP_STEP=30

# ==========================================
# ERROR TRACKING (Sentry)
# ==========================================
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
SENTRY_ENVIRONMENT=production
SENTRY_TRACE_SAMPLE_RATE=1.0

# ==========================================
# LOGGING
# ==========================================
LOG_LEVEL=info
LOG_FORMAT=json

# ==========================================
# FEATURE FLAGS
# ==========================================
ENABLE_2FA=true
ENABLE_EMAIL_NOTIFICATIONS=true
ENABLE_PDF_GENERATION=true
ENABLE_AUTO_BILLING=true
```

---

## 📚 API Documentation

### Base URL
```
Development:  http://localhost:3001/api/v1
Production:   https://api.hostyllo.app/api/v1
```

### Authentication

All protected endpoints require a Bearer token in the `Authorization` header:

```bash
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Core Endpoints

#### Authentication Routes `/api/v1/auth`
```
POST   /auth/register              # Register new user
POST   /auth/login                 # Authenticate user
POST   /auth/refresh               # Refresh JWT token
POST   /auth/logout                # Invalidate session
POST   /auth/2fa/setup             # Initialize 2FA/TOTP
POST   /auth/2fa/verify            # Verify TOTP code
GET    /auth/me                    # Get current user profile
```

#### Student/Tenant Routes `/api/v1/students`
```
GET    /students                   # List all students
POST   /students                   # Create new student
GET    /students/:id               # Get student details
PUT    /students/:id               # Update student profile
DELETE /students/:id               # Remove student
GET    /students/:id/payments      # Get student's payment history
```

#### Room Management Routes `/api/v1/rooms`
```
GET    /rooms                      # List all rooms
POST   /rooms                      # Create new room
GET    /rooms/:id                  # Get room details
PUT    /rooms/:id                  # Update room configuration
DELETE /rooms/:id                  # Delete room
GET    /rooms/:id/occupancy        # Get current occupancy
```

#### Payment Routes `/api/v1/payments`
```
GET    /payments                   # List all payments
POST   /payments                   # Record new payment
GET    /payments/:id               # Get payment details
POST   /payments/:id/receipt       # Generate receipt
POST   /payments/:id/refund        # Process refund
GET    /payments/student/:studentId  # Student's payments
```

#### Expense Routes `/api/v1/expenses`
```
GET    /expenses                   # List all expenses
POST   /expenses                   # Record expense
GET    /expenses/:id               # Get expense details
PUT    /expenses/:id               # Update expense
DELETE /expenses/:id               # Delete expense
GET    /expenses/category/:category # Expenses by category
```

#### Dashboard Routes `/api/v1/dashboard`
```
GET    /dashboard/summary          # Key metrics & overview
GET    /dashboard/revenue          # Revenue analytics
GET    /dashboard/occupancy        # Occupancy statistics
GET    /dashboard/payments         # Payment collection status
GET    /dashboard/expenses         # Expense breakdown
GET    /dashboard/reports/monthly  # Monthly financial report
```

#### Health Check
```
GET    /health                     # API health & dependencies status
```

### Response Format

**Success Response (2xx)**
```json
{
  "success": true,
  "data": {
    "id": "user_123",
    "name": "John Doe",
    "email": "john@example.com"
  },
  "timestamp": "2026-06-10T18:30:00Z"
}
```

**Error Response (4xx, 5xx)**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email format",
    "details": [
      {
        "field": "email",
        "message": "Must be a valid email"
      }
    ]
  },
  "timestamp": "2026-06-10T18:30:00Z"
}
```

---

## 🔧 Development Commands

### Setup & Installation

```bash
# Install all dependencies
pnpm install

# Clean install (remove node_modules and reinstall)
pnpm install --force

# Update all dependencies
pnpm update
```

### Development

```bash
# Start all apps in watch mode with hot reload
pnpm dev

# Start only the API server
cd apps/api && pnpm dev

# Start API with TypeScript watch
cd apps/api && tsx watch src/server.ts
```

### Building

```bash
# Build all packages (via Turbo with caching)
pnpm build

# Build only the API
cd apps/api && pnpm build

# Build specific package
pnpm --filter @hostyllo/api build

# Clean build (remove dist/)
pnpm run build:clean
```

### Production

```bash
# Start production server
cd apps/api && pnpm start

# Or run the compiled binary directly
cd apps/api && node dist/server.js

# With NODE_ENV=production
NODE_ENV=production pnpm start
```

### Code Quality

```bash
# Lint entire monorepo
pnpm lint

# Lint specific package
pnpm --filter @hostyllo/api lint

# Fix linting issues automatically
pnpm lint -- --fix

# Run type checking
pnpm tsc --noEmit
```

### Testing

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test -- --watch

# Run tests with coverage
pnpm test -- --coverage

# Run tests for specific package
pnpm --filter @hostyllo/api test
```

### Database

```bash
# Run migrations
pnpm --filter @hostyllo/db migrate

# Create new migration
pnpm --filter @hostyllo/db migration:create migration_name

# Seed database
pnpm --filter @hostyllo/db seed

# Reset database (WARNING: deletes all data)
pnpm --filter @hostyllo/db reset
```

### Monitoring & Logs

```bash
# View real-time server logs
pnpm dev

# With structured JSON logging
LOG_FORMAT=json pnpm dev

# Check specific log level
LOG_LEVEL=debug pnpm dev
```

---

## 🐳 Docker Support (Coming Soon)

```dockerfile
# Build Docker image
docker build -t hostyllo:latest .

# Run container
docker run -p 3001:3001 \
  -e DATABASE_URL=postgresql://... \
  -e REDIS_URL=redis://... \
  hostyllo:latest

# Docker Compose
docker-compose up -d
```

---

## 🚢 Deployment

### Railway (Production)

1. **Connect GitHub Repository**
   ```bash
   # Link your Railway project
   railway link
   ```

2. **Set Environment Variables**
   ```bash
   railway variables:set DATABASE_URL=postgresql://...
   railway variables:set REDIS_URL=redis://...
   railway variables:set JWT_SECRET=your-secret
   # ... set all required vars
   ```

3. **Deploy**
   ```bash
   # Automatic: Push to Develop branch
   git push origin Develop
   
   # Manual: Deploy specific commit
   railway deploy <commit-sha>
   ```

4. **Monitor Deployment**
   ```bash
   # View logs
   railway logs
   
   # Check status
   railway status
   ```

### Vercel (Frontend - Optional)

Frontend is hosted separately on Vercel at [https://hostyllo.vercel.app](https://hostyllo.vercel.app)

### Environment Parity

| Environment | Database | Redis | URL |
|------------|----------|-------|-----|
| Development | Local PostgreSQL | Local Redis | `http://localhost:3001` |
| Staging | Railway PostgreSQL | Railway Redis | `https://staging-api.hostyllo.app` |
| Production | Railway PostgreSQL | Railway Redis | `https://api.hostyllo.app` |

---

## 🔐 Security Best Practices

### Authentication & Authorization
- ✅ JWT-based stateless authentication
- ✅ Secure password hashing with bcrypt (10+ salt rounds)
- ✅ 2FA/TOTP support for enhanced security
- ✅ Automatic token refresh and rotation
- ✅ Session management with secure cookies

### Data Protection
- ✅ HTTPS/TLS encryption in transit
- ✅ Database encryption at rest (managed by host)
- ✅ Redis password protection
- ✅ Environment variable isolation
- ✅ No sensitive data in logs

### API Security
- ✅ Rate limiting (100 requests per 15 minutes default)
- ✅ CORS policy enforcement
- ✅ Security headers via Helmet
- ✅ Input validation and sanitization
- ✅ SQL injection prevention
- ✅ XSS protection

### Compliance
- ✅ GDPR-ready data handling
- ✅ Data retention policies
- ✅ Audit logging (planned)
- ✅ Backup and disaster recovery
- ✅ Regular security audits

### Incident Response
- ✅ Error tracking via Sentry
- ✅ Automated alerts for critical errors
- ✅ Detailed logging for debugging
- ✅ On-call escalation procedures (to be defined)

---

## 📊 Performance Metrics

### System Specifications

| Metric | Value | Notes |
|--------|-------|-------|
| **API Response Time** | <100ms | p95 latency |
| **Database Query Time** | <50ms | Indexed queries |
| **Throughput** | 1000+ req/s | Per instance |
| **Uptime SLA** | 99.5% | Target availability |
| **Concurrent Users** | 10,000+ | Per deployment |
| **Request Timeout** | 30s | Default |
| **Max Payload Size** | 10MB | Request body limit |

### Scaling Capabilities

- **Horizontal Scaling**: Add more Railway instances
- **Database Scaling**: PostgreSQL read replicas
- **Cache Scaling**: Redis cluster mode
- **Job Queue Scaling**: BullMQ with multiple workers
- **Load Balancing**: Railway automatic load balancing

---

## 🐛 Troubleshooting

### Common Issues

#### Build Failure: Node.js 18 + pnpm 11
**Error**: `TypeError [ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING]`

**Solution**: Ensure Node.js 22.x is used. Check `railway.toml`:
```toml
[build]
buildCommand = "pnpm --filter @hostyllo/api build"

[deploy]
startCommand = "cd apps/api && node dist/server.js"
```

#### Database Connection Error
```bash
# Check database URL format
echo $DATABASE_URL
# Should be: postgresql://user:password@host:port/dbname

# Test connection locally
psql $DATABASE_URL
```

#### Redis Connection Issues
```bash
# Check Redis is running
redis-cli ping
# Should return: PONG

# Verify Redis URL
redis-cli -u $REDIS_URL
```

#### Port Already in Use
```bash
# Kill process on port 3001
lsof -i :3001
kill -9 <PID>

# Or use different port
PORT=3002 pnpm dev
```

#### pnpm Lock File Conflicts
```bash
# Remove lock file and reinstall
rm pnpm-lock.yaml
pnpm install

# Or update lock file
pnpm install --update-lockfile
```

### Debugging

```bash
# Enable verbose logging
DEBUG=* pnpm dev

# Enable TypeScript source maps
TS_NODE_TRANSPILE_ONLY=true pnpm dev

# Check compiled output
cat apps/api/dist/server.js

# Inspect database migrations
psql $DATABASE_URL -c "\dt"
```

---

## 📈 Monitoring & Analytics

### Key Metrics to Track

- **API Performance**: Response times, error rates, throughput
- **Database Performance**: Query times, connection pool usage
- **Job Queue**: Queue depth, processing time, failure rate
- **Infrastructure**: CPU, memory, disk usage, network I/O
- **Business Metrics**: Revenue, payment success rate, user growth

### Sentry Integration (Coming Soon)

```bash
# Configure Sentry in production
SENTRY_DSN=https://your-dsn@sentry.io/project
```

### Health Checks

```bash
# API health
curl http://localhost:3001/api/v1/health

# Database health
SELECT NOW();

# Redis health
redis-cli PING

# Job queue health
redis-cli KEYS "bull:*"
```

---

## 🤝 Contributing

### Development Workflow

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make changes and commit**
   ```bash
   git add .
   git commit -m "feat: Add your feature description"
   ```

3. **Push and create Pull Request**
   ```bash
   git push origin feature/your-feature-name
   ```

4. **Code Review & Merge**
   - Ensure CI/CD passes
   - Get peer review
   - Merge to `Develop` branch

### Commit Message Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description

feat:      A new feature
fix:       A bug fix
docs:      Documentation
style:     Formatting, missing semicolons, etc
refactor:  Refactoring code
perf:      Performance improvements
test:      Adding or updating tests
chore:     Maintenance tasks
ci:        CI/CD configuration
```

### Code Style

- TypeScript strict mode enabled
- ESLint configuration enforced
- Prettier auto-formatting
- 2-space indentation
- Meaningful variable names

---

## 📜 License

Hostyllo is proprietary software. All rights reserved.

For licensing inquiries, contact: [support@hostyllo.com](mailto:support@hostyllo.com)

---

## 💬 Support & Community

### Getting Help

| Channel | Purpose | Response Time |
|---------|---------|---------------|
| **GitHub Issues** | Bug reports & feature requests | 24-48 hours |
| **Email** | Support queries | support@hostyllo.com |
| **Documentation** | Setup & configuration | [docs/](./docs) |
| **Discord** | Community discussion | Coming Soon |

### Reporting Security Issues

⚠️ **Do NOT open a public issue for security vulnerabilities**

Email: [security@hostyllo.com](mailto:security@hostyllo.com)

Include:
- Vulnerability description
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

---

## 📋 Open Issues & PRs

### Current Work In Progress

| ID | Title | Status | Priority |
|----|-------|--------|----------|
| [#16](https://github.com/mushtaqahmaduop/hostyllo/pull/16) | Refactor auth middleware + Sentry | Open | HIGH |
| [#11](https://github.com/mushtaqahmaduop/hostyllo/pull/11) | Fix Railway deployment (Node 22) | Open | CRITICAL |
| [#4](https://github.com/mushtaqahmaduop/hostyllo/pull/4) | Package restructuring | Open | LOW |

See [all issues](https://github.com/mushtaqahmaduop/hostyllo/issues) and [all PRs](https://github.com/mushtaqahmaduop/hostyllo/pulls)

---

## 🗺️ Roadmap

### Q3 2026
- [ ] Sentry error tracking integration
- [ ] Advanced financial reporting
- [ ] Multi-currency support
- [ ] SMS notifications

### Q4 2026
- [ ] Mobile app (React Native)
- [ ] Enhanced 2FA options (WebAuthn)
- [ ] Accounting software integrations (QuickBooks, Xero)
- [ ] Scheduled billing reports

### 2027
- [ ] AI-powered financial forecasting
- [ ] Machine learning for anomaly detection
- [ ] Blockchain-based receipts
- [ ] GraphQL API

---

## 👥 Team & Contributors

**Maintainer**: [@mushtaqahmaduop](https://github.com/mushtaqahmaduop)

**Active Contributors**: [View on GitHub](https://github.com/mushtaqahmaduop/hostyllo/graphs/contributors)

---

## 📞 Contact & Information

- **Website**: [https://hostyllo.vercel.app](https://hostyllo.vercel.app)
- **Email**: [support@hostyllo.com](mailto:support@hostyllo.com)
- **GitHub**: [mushtaqahmaduop/hostyllo](https://github.com/mushtaqahmaduop/hostyllo)
- **Issues**: [GitHub Issues](https://github.com/mushtaqahmaduop/hostyllo/issues)
- **Documentation**: [AGENT_SESSION_GUIDE.md](./AGENT_SESSION_GUIDE.md)

---

## 📈 Repository Statistics

- **Language**: TypeScript (82.9%)
- **Size**: 211 KB
- **Open Issues**: 3
- **Open PRs**: 3
- **License**: Proprietary
- **Last Updated**: 2026-06-10

---

<div align="center">

### Made with ❤️ by [Mushtaq Ahmad](https://github.com/mushtaqahmaduop)

**[Report Bug](https://github.com/mushtaqahmaduop/hostyllo/issues/new)** • **[Request Feature](https://github.com/mushtaqahmaduop/hostyllo/issues/new)** • **[Documentation](./docs)**

</div>

---

**Last Updated**: June 10, 2026  
**Version**: 1.0.0  
**Status**: Production Ready ✅
