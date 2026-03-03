# Doodlea - Development Guide

> **Last Updated:** March 3, 2026  
> **Version:** 1.1.0

## Table of Contents
- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Project Architecture](#project-architecture)
- [Redux State Management](#redux-state-management)
- [Project System](#project-system)
- [Database Schema](#database-schema)
- [Authentication System](#authentication-system)
- [Subscription System](#subscription-system)
- [Dynamic Routing with Slugs](#dynamic-routing-with-slugs)
- [Middleware & Route Protection](#middleware--route-protection)
- [API Endpoints](#api-endpoints)
- [Testing Features](#testing-features)
- [Environment Variables](#environment-variables)
- [File Structure](#file-structure)
- [Development Workflow](#development-workflow)

---

## Overview

Doodlea is a Next.js application with a subscription-based business model. Users can register, authenticate via credentials or Google OAuth, subscribe to different plans, and access a protected dashboard once they have an active subscription.

### Key Features
- 🔐 **Authentication**: Credential-based and Google OAuth login
- 👤 **Dynamic User Profiles**: Each user gets a unique slug-based URL
- 💳 **Subscription Management**: Tiered subscription plans with credit system
- 🛡️ **Protected Routes**: Middleware-based access control
- 📊 **Dashboard**: Subscription-gated user dashboard
- 🧪 **Test Mode**: Development subscription activation for testing
- 📦 **Redux State Management**: RTK with server-side preloaded state
- 🎨 **Project Creation**: Auto-numbered projects with gradient thumbnails
- 🖼️ **Canvas System**: Shapes, viewport, and drawing tool state management

---

## Tech Stack

| Technology | Version | Purpose |
|-----------|---------|---------|
| **Next.js** | 15.4.6 | React framework with App Router |
| **React** | 19.1.0 | UI library |
| **NextAuth.js** | 4.24.13 | Authentication |
| **Prisma** | 7.4.0 | ORM and database migrations |
| **PostgreSQL** | - | Database (via Neon) |
| **TypeScript** | - | Type safety |
| **Tailwind CSS** | 4.x | Styling |
| **bcryptjs** | 3.0.3 | Password hashing |
| **Redux Toolkit** | 2.8.2 | State management |

---

## Redux State Management

### Architecture

Redux Toolkit is used with a **preloaded server state** pattern:

1. Server-side: `getPreloadedProfile()` fetches user data from DB
2. Root layout passes preloaded state to `ReduxProvider`
3. `makeStore(preloadedState)` creates the store with hydrated profile
4. Client components read state via `useAppSelector`

### Store Structure

```typescript
{
  profile: ProfileState,    // User identity, subscription, credits
  projects: ProjectsState,  // Project list with CRUD status
  shapes: ShapesState,      // Canvas shapes, tool, selection
  viewport: ViewportState,  // Zoom, pan, scale
}
```

### Slices

**Profile Slice** (`src/redux/slice/profile.ts`)
```typescript
interface ProfileState {
  id: string
  name: string
  email: string
  image: string
  slug: string
  hasSubscription: boolean
  credits: number
  plan: string
  createdAt: string
}
// Actions: setProfile, updateCredits, clearProfile
```

**Projects Slice** (`src/redux/slice/projects/index.ts`)
```typescript
interface ProjectSummary {
  _id: string
  name: string
  projectNumber: number
  thumbnail: string
  lastModified: number
  createdAt: number
  isPublic: boolean
}
// Actions: addProject, updateProject, deleteProject,
//          createProjectStart, createProjectSuccess, createProjectFailure
```

**Shapes Slice** (`src/redux/slice/shapes/index.ts`)
- Entity adapter for shapes (rect, ellipse, frame, freedraw, arrow, line, text)
- Tool selection (select, frame, rect, ellipse, freedraw, arrow, line, text, eraser)
- Selection map and frame counter

**Viewport Slice** (`src/redux/slice/viewport/index.ts`)
- Scale with min/max bounds
- Translate (pan) with screen↔world coordinate transforms
- Pan tracking, zoom step, and viewport modes

### Provider Setup

```typescript
// src/app/layout.tsx (server component)
const preloadedState = await getPreloadedProfile()

<ReduxProvider preloadedState={{ profile: preloadedState }}>
  {children}
</ReduxProvider>
```

---

## Project System

### Project Creation Flow

```
User clicks "New Project" button
  → useProjectCreation hook
    → dispatch(createProjectStart())
    → Generate SVG gradient thumbnail
    → Read current shapes state from Redux
    → POST /api/projects (name, thumbnail, sketchesData)
      → Upsert ProjectCounter (atomic increment)
      → Create Project record in DB
    → dispatch(addProject({...}))
    → dispatch(createProjectSuccess())
    → toast.success()
```

### Auto-Incrementing Project Numbers

Each user has their own `ProjectCounter` for sequential numbering:

```typescript
// Atomic upsert: creates counter if new, increments if exists
const counter = await prisma.projectCounter.upsert({
  where: { userId },
  update: { nextProjectNumber: { increment: 1 } },
  create: { userId, nextProjectNumber: 2 }, // First project = 1
})
const projectNumber = counter.nextProjectNumber - 1 || 1
```

### Gradient Thumbnail Generation

Projects get a random SVG gradient thumbnail on creation:
- 6 predefined gradient color pairs
- Rendered as SVG with circle and rectangle decorations
- Stored as base64 data URI (`data:image/svg+xml;base64,...`)

---

## Getting Started

### Prerequisites
- Node.js 18+ and npm/yarn
- PostgreSQL database (Neon recommended)
- Google Cloud Console account (for OAuth)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd doodlea
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   # Database
   DATABASE_URL="postgresql://username:password@host:port/database?sslmode=require"

   # NextAuth
   NEXTAUTH_SECRET="your-secret-key-here"  # Generate: openssl rand -base64 32
   NEXTAUTH_URL="http://localhost:3000"

   # Google OAuth (Optional)
   GOOGLE_CLIENT_ID="your-google-client-id"
   GOOGLE_CLIENT_SECRET="your-google-client-secret"
   ```

4. **Set up the database**
   ```bash
   # Push schema to database
   npx prisma db push --url="YOUR_DATABASE_URL"
   
   # Generate Prisma Client
   npx prisma generate
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Access the application**
   
   Open [http://localhost:3000](http://localhost:3000)

---

## Project Architecture

### Architecture Pattern
- **App Router**: Next.js 15 App Router for file-based routing
- **Server Components**: Default server-side rendering with client components where needed
- **API Routes**: RESTful API endpoints in `/app/api`
- **Middleware**: Edge middleware for authentication and route protection

### Data Flow

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │
       ├─── Auth Request ──→ NextAuth.js ──→ Prisma ──→ PostgreSQL
       │
       ├─── Protected Route ──→ Middleware (checks JWT) ──→ Allow/Redirect
       │
       ├─── API Call ──→ API Route ──→ Prisma ──→ PostgreSQL
       │
       └─── Redux ──→ Client State (profile, projects, shapes, viewport)
                         ↑
                   Server preloads profile via getPreloadedProfile()
```

---

## Database Schema

### User Model
```prisma
model User {
  id            String    @id @default(cuid())
  name          String?
  email         String    @unique
  emailVerified DateTime?
  image         String?
  password      String?   // Optional: not set for OAuth users
  slug          String?   @unique    // Unique slug: "name-a7x9k2"
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  lastValidated DateTime  @default(now())
  
  accounts        Account[]
  sessions        Session[]
  projects        Project[]
  projectCounter  ProjectCounter?
  subscriptions   Subscription[]
  creditsLedger   CreditsLedger[]
}
```

### Subscription Model
```prisma
model Subscription {
  id                     String    @id @default(cuid())
  userId                 String
  polarCustomerId        String
  polarSubscriptionId    String
  productId              String?
  priceId                String?
  planCode               String?
  status                 String    // 'active', 'trialing', 'canceled', etc.
  currentPeriodEnd       DateTime?
  trialEndsAt            DateTime?
  cancelAt               DateTime?
  canceledAt             DateTime?
  seats                  Int?
  metadata               Json?
  creditsBalance         Float
  creditsGrantPerPeriod  Float
  creditsRolloverLimit   Float
  lastGrantCursor        String?
  createdAt              DateTime  @default(now())
  updatedAt              DateTime  @updatedAt
  
  user          User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  creditsLedger CreditsLedger[]
}
```

### Project Model
```prisma
model Project {
  id                   String   @id @default(cuid())
  userId               String
  name                 String
  description          String?
  styleGuide           String?
  sketchesData         Json     // JSON structure matching Redux shapes state
  viewportData         Json?    // Viewport state (scale, pan, etc.)
  generatedDesignData  Json?    // Generated UI components
  thumbnail            String?  // Base64 or URL for project thumbnail
  moodBoardImages      String[] // Storage IDs for mood board
  inspirationImages    String[] // Storage IDs for inspiration (max 6)
  lastModified         DateTime @default(now())
  createdAt            DateTime @default(now())
  isPublic             Boolean  @default(false)
  tags                 String[]
  projectNumber        Int      // Auto-incrementing per user

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

**Other Models**: `Account`, `Session`, `VerificationToken`, `ProjectCounter`, `CreditsLedger`

### ProjectCounter Model
```prisma
model ProjectCounter {
  id                 String @id @default(cuid())
  userId             String @unique
  nextProjectNumber  Int    @default(1)

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

---

## Authentication System

### Authentication Providers

1. **Credentials Provider** (Email/Password)
   - Password hashing with bcryptjs (10 rounds)
   - Passwords stored securely, never in plain text

2. **Google OAuth Provider**
   - Configuration in Google Cloud Console
   - Redirect URI: `http://localhost:3000/api/auth/callback/google`

### Session Management

**JWT Strategy** (not database sessions)
- JWT tokens stored in HTTP-only cookies
- Token expiration: 30 days (`maxAge: 30 * 24 * 60 * 60`)
- Periodic validation: Every 5 minutes

### JWT Token Contents
```typescript
{
  id: string              // User ID
  email: string           // User email
  slug: string | null     // User's unique slug
  hasSubscription: boolean // Active subscription status
  lastValidated: number   // Timestamp of last DB check
}
```

### Session Revalidation

The JWT callback checks the database every 5 minutes to:
- Verify user still exists
- Update subscription status
- Refresh user's slug

```typescript
const VALIDATION_INTERVAL = 1000 * 60 * 5 // 5 minutes
```

### Authentication Flow

```
Registration Flow:
1. User submits form → /api/auth/register
2. Generate unique slug (name-randomchars)
3. Hash password with bcrypt
4. Create user in database
5. Auto sign-in with credentials
6. Redirect to /billing/{slug}

Login Flow:
1. User submits credentials → NextAuth
2. Verify password with bcrypt.compare()
3. Create JWT token with user data
4. Redirect to appropriate page based on subscription status
```

---

## Subscription System

### Subscription Tiers

| Tier | Price | Projects | Credits | Features |
|------|-------|----------|---------|----------|
| **Free** | $0/mo | 1 | Limited | Basic features, community support |
| **Starter** | $29/mo | 10 | 10,000/mo | All features, email support |
| **Pro** | $99/mo | Unlimited | 100,000/mo | Priority support, advanced analytics |
| **Enterprise** | $299/mo | Unlimited | Unlimited | Dedicated support, custom SLA |

### Credit System

- Credits are tracked per subscription
- `creditsBalance`: Current available credits
- `creditsGrantPerPeriod`: Credits awarded each billing cycle
- `creditsRolloverLimit`: Maximum credits that can accumulate

### Subscription Lifecycle

```
New User → No Subscription → Redirected to /billing/{slug}
                ↓
        Choose Plan or Test Activation
                ↓
        Subscription Created (status: 'active')
                ↓
        Session Updated (hasSubscription: true)
                ↓
        Redirected to /dashboard/{slug}
```

---

## Dynamic Routing with Slugs

### Slug Format

**Pattern**: `{firstname-lastname}-{random}`

- Base: User's full name (lowercased, spaces to hyphens)
- Suffix: 6 random alphanumeric characters (a-z, 0-9)
- Example: `john-doe-a7x9k2`, `alice-smith-3kf8m1`

### Slug Generation

**Location**: [src/lib/username.ts](src/lib/username.ts)

```typescript
export async function generateSlug(name?: string, email?: string): Promise<string> {
  // 1. Create base from name or email
  // 2. Append 6 random characters
  // 3. Check uniqueness in database
  // 4. Retry with new random chars if collision (max 5 attempts)
  // 5. Return unique slug
}
```

### Dynamic Routes

- `/billing/[slug]` - Billing page for user with specific slug
- `/dashboard/[slug]` - Dashboard for user with specific slug

**Validation**: Middleware ensures the slug in the URL matches the authenticated user's slug.

---

## Middleware & Route Protection

**Location**: [src/middleware.ts](src/middleware.ts)

### Protected Routes

1. **Authentication Required**
   - `/billing/*`
   - `/dashboard/*`

2. **Subscription Required**
   - `/dashboard/*` - Redirects to billing if no active subscription

3. **Auth Pages** (redirect if logged in)
   - `/auth/sign-in` → `/billing/{slug}` or `/dashboard/{slug}`
   - `/auth/sign-up` → `/billing/{slug}` or `/dashboard/{slug}`

### Middleware Logic

```typescript
// 1. Check if user is authenticated (JWT token exists)
// 2. For auth pages: redirect logged-in users
// 3. For protected routes: verify authentication
// 4. Validate slug in URL matches user's slug
// 5. Check subscription status for dashboard access
// 6. Allow or redirect based on checks
```

---

## API Endpoints

### Authentication

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/auth/[...nextauth]` | GET/POST | NextAuth.js endpoints |
| `/api/auth/register` | POST | User registration |

**POST /api/auth/register**
```typescript
Request Body:
{
  firstName: string
  lastName: string
  email: string
  password: string
}

Response:
{
  userId: string
  slug: string
}
```

### Subscriptions

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/subscriptions/create` | POST | Create subscription (production) |
| `/api/subscriptions/activate-test` | POST | Activate test subscription (dev) |

### Projects

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/projects` | POST | Create new project |
| `/api/projects` | GET | List user's projects |
| `/api/projects/[id]` | GET | Get single project by ID |

**POST /api/projects**
```typescript
Request Body:
{
  name?: string       // Optional, defaults to "Project {number}"
  thumbnail?: string  // Base64 SVG thumbnail
  sketchesData?: {    // Current canvas state from Redux
    shapes: object
    tool: string
    selected: object
    frameCounter: number
  }
}

Response (201):
{
  id: string
  name: string
  projectNumber: number
  thumbnail: string | null
  sketchesData: object
  // ... all Project fields
}
```

**GET /api/projects**
```typescript
Response:
{
  projects: ProjectSummary[]
  total: number
}
```

**POST /api/subscriptions/activate-test**
```typescript
Request: None (uses session)

Response:
{
  message: string
  subscription: Subscription
}
```

Creates a test subscription with:
- Status: `'active'`
- Duration: 30 days
- Credits: 10,000
- Unique test IDs for Polar

---

## Testing Features

### Test Subscription Activation

**Purpose**: Skip payment integration during development/testing

**Location**: Billing page (`/billing/{slug}`)

**Usage**:
1. Register or log in as a user
2. Navigate to billing page
3. Click **"Activate Test Subscription"** button
4. Instantly receive active subscription
5. Redirected to dashboard

**Implementation**: Yellow banner at top of billing page with prominent button

---

## Environment Variables

### Required Variables

```env
# Database Connection
DATABASE_URL="postgresql://user:pass@host:port/db?sslmode=require"

# NextAuth Configuration
NEXTAUTH_SECRET="random-32-byte-string"  # openssl rand -base64 32
NEXTAUTH_URL="http://localhost:3000"     # Production: https://yourdomain.com

# Optional: Google OAuth
GOOGLE_CLIENT_ID="xxx.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-xxx"
```

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI:
   - Development: `http://localhost:3000/api/auth/callback/google`
   - Production: `https://yourdomain.com/api/auth/callback/google`

### Prisma Configuration

**Location**: [prisma/prisma.config.ts](prisma/prisma.config.ts)

```typescript
export default {
  datasource: {
    url: process.env.DATABASE_URL || 'fallback-url',
  },
}
```

---

## File Structure

```
doodlea/
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── prisma.config.ts       # Prisma configuration
│
├── public/                    # Static assets
│
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   ├── [...nextauth]/
│   │   │   │   │   └── route.ts       # NextAuth configuration
│   │   │   │   └── register/
│   │   │   │       └── route.ts       # User registration endpoint
│   │   │   ├── projects/
│   │   │   │   ├── route.ts           # POST (create) + GET (list) projects
│   │   │   │   └── [id]/
│   │   │   │       └── route.ts       # GET single project by ID
│   │   │   └── subscriptions/
│   │   │       ├── create/
│   │   │       │   └── route.ts       # Production subscription creation
│   │   │       └── activate-test/
│   │   │           └── route.ts       # Test subscription activation
│   │   │
│   │   ├── auth/
│   │   │   ├── sign-in/
│   │   │   │   └── page.tsx           # Login page
│   │   │   └── sign-up/
│   │   │       └── page.tsx           # Registration page
│   │   │
│   │   ├── billing/
│   │   │   └── [slug]/
│   │   │       └── page.tsx           # Dynamic billing page
│   │   │
│   │   ├── dashboard/
│   │   │   └── [slug]/
│   │   │       ├── layout.tsx         # Dashboard layout
│   │   │       └── page.tsx           # Dashboard page (renders Navbar)
│   │   │
│   │   ├── globals.css                # Global styles
│   │   ├── layout.tsx                 # Root layout (providers + preloaded state)
│   │   └── page.tsx                   # Home page
│   │
│   ├── components/
│   │   ├── buttons/
│   │   │   └── project/
│   │   │       └── index.tsx          # New Project creation button
│   │   ├── navbar/
│   │   │   └── index.tsx              # Main navbar with tabs, avatar, project name
│   │   ├── providers/
│   │   │   └── auth-provider.tsx      # NextAuth SessionProvider wrapper
│   │   └── ui/                        # Reusable UI components (shadcn/ui)
│   │
│   ├── hooks/
│   │   ├── use-mobile.ts             # Mobile detection hook
│   │   └── use-project.ts            # Project creation hook (Redux + API)
│   │
│   ├── lib/
│   │   ├── auth.ts                    # Auth utilities
│   │   ├── prisma.ts                  # Prisma client singleton
│   │   ├── profile.ts                 # Server-side getPreloadedProfile()
│   │   ├── username.ts                # Slug generation utilities
│   │   └── utils.ts                   # General utilities
│   │
│   ├── redux/
│   │   ├── provider.tsx               # ReduxProvider with preloadedState
│   │   ├── store.ts                   # Store config, makeStore(), typed hooks
│   │   └── slice/
│   │       ├── index.ts               # Slices registry
│   │       ├── profile.ts             # Profile slice (user identity + subscription)
│   │       ├── projects/
│   │       │   └── index.ts           # Projects slice (CRUD + creation status)
│   │       ├── shapes/
│   │       │   └── index.ts           # Shapes slice (canvas entities + tools)
│   │       └── viewport/
│   │           └── index.ts           # Viewport slice (zoom, pan, transforms)
│   │
│   ├── theme/
│   │   └── provider.tsx               # Theme provider (dark/light mode)
│   │
│   ├── types/
│   │   └── next-auth.d.ts             # NextAuth TypeScript declarations
│   │
│   └── middleware.ts                  # Route protection middleware
│
├── .env                               # Environment variables (gitignored)
├── components.json                    # shadcn/ui configuration
├── next.config.ts                     # Next.js configuration
├── package.json                       # Dependencies
├── tsconfig.json                      # TypeScript configuration
└── DEVELOPMENT_GUIDE.md              # This file
```

---

## Development Workflow

### Adding a New Feature

1. **Plan the feature**
   - Identify required database changes
   - Sketch API endpoints needed
   - Design UI components

2. **Update database schema** (if needed)
   ```bash
   # Edit prisma/schema.prisma
   npx prisma db push --url="DATABASE_URL"
   npx prisma generate
   ```

3. **Create API endpoints** (if needed)
   ```bash
   # Create route.ts in appropriate folder
   # Implement GET/POST/PUT/DELETE handlers
   ```

4. **Build UI components**
   ```bash
   # Create page.tsx or component files
   # Use existing UI components from components/ui/
   ```

5. **Update middleware** (if protecting routes)
   ```bash
   # Edit src/middleware.ts
   # Add route patterns and protection logic
   ```

6. **Update this documentation**
   ```bash
   # Add new sections or update existing ones
   # Document new environment variables
   # Update file structure if needed
   ```

### Database Migrations

```bash
# Push schema changes to database
npx prisma db push --url="your-database-url"

# Generate Prisma Client types
npx prisma generate

# Optional: View database in Prisma Studio
npx prisma studio
```

### Common Development Tasks

**Check TypeScript errors:**
```bash
npm run build
```

**Run linter:**
```bash
npm run lint
```

**View Prisma Studio:**
```bash
npx prisma studio
```

**Reset database (destructive):**
```bash
npx prisma db push --force-reset --url="DATABASE_URL"
```

---

## Troubleshooting

### Common Issues

**1. Subscription not detected after activation**
- Check subscription status is lowercase `'active'`
- Verify JWT validation interval is reasonable (5 minutes)
- Check `lastValidated` is being updated in database

**2. Redirect loop on billing/dashboard pages**
- Verify slug in JWT matches slug in URL
- Check middleware logic for redirect conditions
- Ensure session is being properly updated

**3. Prisma Client errors after schema changes**
- Run `npx prisma generate` to regenerate client
- Restart the development server
- Clear `.next` cache if issues persist

**4. Google OAuth not working**
- Check redirect URI matches exactly in Google Console
- Verify GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET
- Ensure Google+ API is enabled

---

## Security Considerations

### Implemented Security Measures

- ✅ Passwords hashed with bcryptjs (10 rounds)
- ✅ JWT tokens in HTTP-only cookies
- ✅ CSRF protection via NextAuth
- ✅ SQL injection prevention via Prisma
- ✅ Session validation every 5 minutes
- ✅ Slug validation in middleware

### TODO: Additional Security

- [ ] Rate limiting on API endpoints
- [ ] Email verification before account activation
- [ ] 2FA/MFA support
- [ ] Audit logging for sensitive operations
- [ ] Content Security Policy (CSP) headers

---

## Future Development

### Planned Features

- [ ] **Payment Integration**: Stripe or Polar.sh integration
- [ ] **Email System**: Transactional emails (welcome, subscription changes)
- [ ] **Admin Dashboard**: Manage users and subscriptions
- [ ] **Usage Analytics**: Track credit usage and project metrics
- [ ] **Team Accounts**: Multi-user subscriptions
- [ ] **API Keys**: Developer API access
- [ ] **Webhooks**: Subscription event notifications

### Code Quality Improvements

- [ ] Unit tests (Jest + React Testing Library)
- [ ] E2E tests (Playwright)
- [ ] API documentation (Swagger/OpenAPI)
- [ ] Error boundary components
- [ ] Loading states and skeletons
- [ ] SEO optimization (metadata, sitemap)

---

## Contributing

When contributing to this project:

1. **Follow the existing code style**
2. **Update TypeScript types** as needed
3. **Test your changes** thoroughly
4. **Update this documentation** with any new features
5. **Add comments** to complex logic
6. **Use Prisma migrations** properly for schema changes
7. **Update [CHANGELOG.md](./CHANGELOG.md)** with your changes

See [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed contribution guidelines.

---

## Keeping Documentation Updated

**Important:** This documentation should be updated whenever you make changes to the project.

### When to Update Documentation

- ✅ **New features added** → Update DEVELOPMENT_GUIDE.md and CHANGELOG.md
- ✅ **API endpoints changed** → Update API section in DEVELOPMENT_GUIDE.md
- ✅ **Database schema changed** → Update schema section in DEVELOPMENT_GUIDE.md
- ✅ **Environment variables added** → Update .env.example and both guides
- ✅ **Authentication flow changed** → Update authentication section
- ✅ **Bug fixes** → Update CHANGELOG.md
- ✅ **Breaking changes** → Update all relevant documentation with warnings

### Documentation Files to Maintain

1. **[DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md)** - Architecture and detailed information
2. **[QUICK_REFERENCE.md](./QUICK_REFERENCE.md)** - Commands and quick snippets
3. **[CHANGELOG.md](./CHANGELOG.md)** - Version history and changes
4. **[CONTRIBUTING.md](./CONTRIBUTING.md)** - Contribution guidelines
5. **[README.md](./README.md)** - Project overview and quick start

### How to Update

1. Make your code changes
2. Test thoroughly
3. Update relevant documentation sections
4. Add entry to CHANGELOG.md
5. Commit documentation with code changes

**Example commit:**
```bash
git add .
git commit -m "feat(auth): add 2FA support

- Implemented TOTP-based 2FA
- Updated auth flow in DEVELOPMENT_GUIDE.md
- Added 2FA setup instructions
- Updated CHANGELOG.md with new feature"
```

---

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [shadcn/ui Components](https://ui.shadcn.com/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

---

**For questions or issues, contact the development team.**

_Last updated: February 24, 2026_

---

## Related Documentation

- 📖 [Quick Reference Guide](./QUICK_REFERENCE.md) - Commands and snippets
- 📝 [Changelog](./CHANGELOG.md) - Version history
- 🤝 [Contributing Guide](./CONTRIBUTING.md) - How to contribute
- 🏠 [README](./README.md) - Project overview
