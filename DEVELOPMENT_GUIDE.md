# Doodlea - Development Guide

> **Last Updated:** March 11, 2026  
> **Version:** 1.3.0

## Table of Contents
- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Project Architecture](#project-architecture)
- [Redux State Management](#redux-state-management)
- [Project System](#project-system)
- [Style Guide System](#style-guide-system)
- [Moodboard Feature](#moodboard-feature)
- [Uploadthing Cloud Storage](#uploadthing-cloud-storage)
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
- 🖼️ **Infinite Canvas**: Full drawing canvas with 9 tools, pan, zoom, shape management, and text formatting
- 🗂️ **Style Guide**: Per-project style guide with colours, typography, and moodboard tabs
- 📸 **Moodboard**: Drag-and-drop image board backed by Uploadthing cloud storage

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

## Style Guide System

### Overview

Each project has a Style Guide page at `/dashboard/[slug]/style-guide?project=[id]` with three tabs: **Colours**, **Typography**, and **Moodboard**.

### Architecture: CSS-Based Tab Persistence

Radix UI v2 (the unified `radix-ui` package) does **not** support `forceMount` on `TabsContent`. To keep the Moodboard component always mounted (preserving upload state and preventing ghost images on tab switch), `StyleGuideContent` manages its own active-tab state and renders all three panels simultaneously, hiding inactive ones with Tailwind's `hidden` class:

```tsx
// src/components/style/style-guide-content.tsx
const [activeTab, setActiveTab] = useState('colours')

<div className={cn(activeTab !== 'moodboard' && 'hidden')}>
  <Moodboard guideImages={guideImages} />
</div>
```

This means **never unmounting** the Moodboard component, so all `useMoodBoard` hook state (images array, upload progress) survives tab switches.

### Server Data Flow

```
page.tsx (Server Component)
  ├── styleGuideQuery()        → JSON-parsed style guide (colours + typography)
  └── MoodBoardImagesQuery()   → storageIds from DB → resolved CDN URLs via utapi.getFileUrls()
       └── returns MoodBoardImage[]
             ↓
        StyleGuideContent (Client Component)
             ├── ThemeContent      (colours tab)
             ├── StyleGuideTypography (typography tab)
             └── Moodboard         (moodboard tab, always mounted)
```

### Key Files

| File | Purpose |
|------|---------|
| `src/app/dashboard/[slug]/(workspace)/style-guide/page.tsx` | Server component — fetches data, passes to `StyleGuideContent` |
| `src/app/dashboard/[slug]/(workspace)/style-guide/queries.ts` | `styleGuideQuery` + `MoodBoardImagesQuery` |
| `src/components/style/style-guide-content.tsx` | Client component — owns Tabs + CSS-based hiding |
| `src/components/style/theme/index.tsx` | `ColorTheme` + `ThemeContent` for colour sections |
| `src/components/style/swatch/index.tsx` | `ColorSwatch` — individual colour chip |
| `src/components/style/typography/index.tsx` | Typography section cards |
| `src/redux/api/style-guide/index.ts` | `StyleGuide` TypeScript interfaces |

---

## Moodboard Feature

### User Experience

- Drag images onto the drop zone or click to browse (up to **5 images** per project)
- Images appear as scattered, slightly-rotated cards (seeded-random layout)
- Hover any card to reveal a red-on-hover **×** button for instant removal
- Glow ring (`ring-4 ring-primary/30`) activates while dragging
- "Add More" button appears (bottom-right) once at least one image is present
- Toast displayed when image cap is reached

### `useMoodBoard` Hook (`src/hooks/use-styles.ts`)

```typescript
export const useMoodBoard = (guideImages: MoodBoardImage[]) => {
  // seededRef: seeds form state from server images ONCE only
  const seededRef = useRef(false)

  // react-hook-form manages images array
  const { watch, setValue, getValues } = useForm<{ images: MoodBoardImage[] }>()

  // Optimistic removal — updates UI instantly, fires DELETE in background
  const removeImage = async (imageId: string) => { ... }

  // Batch drop — reads getValues() to avoid stale closure
  const handleDrop = (e: DragEvent) => { ... }

  return { images, dragActive, addImage, removeImage, handleDrag, handleDrop, handleFileInput, canAddMore }
}
```

#### `seededRef` Pattern

The hook seeds form state from `guideImages` (server-fetched) exactly **once** on first mount:

```typescript
useEffect(() => {
  if (seededRef.current) return   // ← guard: never run again
  if (guideImages?.length > 0) {
    setValue('images', serverImages)
  }
  seededRef.current = true
}, [guideImages, setValue])
```

Without this guard, switching tabs would trigger a re-render and re-run the effect, causing deleted images to reappear ("ghost images").

#### Optimistic Deletion

```typescript
const removeImage = async (imageId: string) => {
  // 1. Remove from UI immediately
  setValue('images', images.filter(img => img.id !== imageId))
  toast.success('Image removed from mood board')

  // 2. Fire server DELETE in background (don't block UI)
  if (imageToRemove.isFromServer && imageToRemove.storageId && ProjectId) {
    removeMoodBoardImage(ProjectId, imageToRemove.storageId).catch(console.error)
  }
}
```

### Image Upload Flow

```
User drops / selects file
  ↓
 addImage() — creates local MoodBoardImage with blob: URL, uploading: false
  ↓
 useEffect detects pending image (uploaded: false, uploading: false)
  ↓
 uploadImage(file):
  1. POST /api/moodboard/generate-upload-url  → returns "/api/moodboard/upload"
  2. POST /api/moodboard/upload (FormData)     → utapi.uploadFiles() → { storageId, url }
  3. POST /api/moodboard/add                  → persists storageId to Project.moodBoardImages[]
  ↓
 image state updated: { storageId, url, uploaded: true, isFromServer: true }
```

### Layout: Scattered Cards

Both mobile and desktop use a **seeded pseudo-random** layout to give each image a stable rotation and offset:

```typescript
const seed = image.id.split('').reduce((a, b) => a + b.charCodeAt(0), 0)
const rotation = ((seed * 9301 + 49297) % 233280 / 233280 - 0.5) * 20
```

Desktop stacks images horizontally with controlled overlap (`spacing = imageWidth - overlapAmount`).

---

## Uploadthing Cloud Storage

### Why Uploadthing

Moodboard images used to be stored as base64 strings directly in PostgreSQL. This caused:
- Extremely large rows
- Slow queries
- No CDN delivery

Uploadthing provides a CDN-backed, S3-compatible storage with a simple Node.js SDK.

### Setup

1. Create an account at [uploadthing.com](https://uploadthing.com)
2. Create a new app in the dashboard
3. Copy your **secret token** (not just the App ID)
4. Add to `.env`:
   ```env
   UPLOADTHING_TOKEN="eyJhcHBJZC..."  # Full token string
   ```

### File Router (`src/app/api/uploadthing/core.ts`)

```typescript
export const ourFileRouter = {
  moodBoardImage: f({ image: { maxFileSize: '4MB', maxFileCount: 5 } })
    .middleware(async () => {
      const session = await getServerSession(authOptions)
      if (!session?.user?.id) throw new Error('Unauthorized')
      return { userId: session.user.id }
    })
    .onUploadComplete(async ({ file }) => {
      return { url: file.ufsUrl, key: file.key }
    }),
} satisfies FileRouter
```

### Server-Side API (`src/lib/uploadthing.ts`)

```typescript
import { UTApi } from 'uploadthing/server'
export const utapi = new UTApi()
```

Used in:
- `upload/route.ts` → `utapi.uploadFiles(file)` → returns `{ key, ufsUrl }`
- `remove/route.ts` → `utapi.deleteFiles(storageId)`
- `queries.ts` → `utapi.getFileUrls(storageId)` → returns CDN URL

### Storage Model

The database stores only the **Uploadthing file key** (e.g., `abc123.jpg`), not the URL:

```prisma
model Project {
  moodBoardImages String[]  // Uploadthing file keys
}
```

At read time, `MoodBoardImagesQuery` resolves keys → URLs:

```typescript
const urlResult = await utapi.getFileUrls(storageId)
const url = urlResult.data[0]?.url
```

This means URLs are always fresh CDN links even if the CDN domain changes.

### Image Domains

`next.config.ts` allows images from Uploadthing CDN:

```typescript
remotePatterns: [
  { protocol: 'https', hostname: 'utfs.io' },
  { protocol: 'https', hostname: '*.ufs.sh' },
]
```

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

   # Uploadthing (Required for moodboard uploads)
   UPLOADTHING_TOKEN="your-uploadthing-token"
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

### Moodboard

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/moodboard/upload` | POST | Upload image to Uploadthing; returns `{ storageId, url }` |
| `/api/moodboard/add` | POST | Persist `storageId` to `Project.moodBoardImages[]` |
| `/api/moodboard/remove` | POST | Remove `storageId` from DB and delete from Uploadthing |
| `/api/moodboard/generate-upload-url` | POST | Returns client-side upload endpoint URL |
| `/api/uploadthing` | GET/POST | Uploadthing native file router (used by SDK) |

**POST /api/moodboard/upload**
```typescript
// Request: multipart/form-data with key 'file'
// Response (200):
{
  storageId: string  // Uploadthing file key
  url: string        // CDN URL
}
```

**POST /api/moodboard/add**
```typescript
// Request body:
{ projectId: string; storageId: string }
// Response (200):
{ success: true; imageCount: number }
```

**POST /api/moodboard/remove**
```typescript
// Request body:
{ projectId: string; storageId: string }
// Response (200):
{ success: true; imageCount: number }
```

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

# Uploadthing (Required for moodboard image uploads)
UPLOADTHING_TOKEN="eyJhcHBJZC..."  # From uploadthing.com/dashboard → API Keys
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
│   │   │   ├── moodboard/
│   │   │   │   ├── upload/
│   │   │   │   │   └── route.ts       # POST — accepts FormData, calls utapi.uploadFiles()
│   │   │   │   ├── add/
│   │   │   │   │   └── route.ts       # POST — persists storageId to Project.moodBoardImages[]
│   │   │   │   ├── remove/
│   │   │   │   │   └── route.ts       # POST — removes from DB + utapi.deleteFiles()
│   │   │   │   └── generate-upload-url/
│   │   │   │       └── route.ts       # POST — returns upload endpoint URL
│   │   │   ├── projects/
│   │   │   │   ├── route.ts           # POST (create) + GET (list) projects
│   │   │   │   └── [id]/
│   │   │   │       └── route.ts       # GET single project by ID
│   │   │   ├── subscriptions/
│   │   │   │   ├── create/
│   │   │   │   │   └── route.ts       # Production subscription creation
│   │   │   │   └── activate-test/
│   │   │   │       └── route.ts       # Test subscription activation
│   │   │   └── uploadthing/
│   │   │       ├── core.ts            # FileRouter definition (moodBoardImage route)
│   │   │       └── route.ts           # Uploadthing GET+POST handler
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
│   │   │       └── (workspace)/       # Route group — shared Navbar layout
│   │   │           ├── layout.tsx     # Wraps children with <Navbar />
│   │   │           ├── page.tsx       # Projects list page
│   │   │           ├── canvas/
│   │   │           │   └── page.tsx   # Canvas page (placeholder)
│   │   │           └── style-guide/
│   │   │               ├── layout.tsx # Passthrough layout
│   │   │               ├── page.tsx   # Server: fetches guide + images, renders StyleGuideContent
│   │   │               └── queries.ts # styleGuideQuery + MoodBoardImagesQuery
│   │   │
│   │   ├── globals.css                # Global styles
│   │   ├── layout.tsx                 # Root layout (providers + preloaded state)
│   │   └── page.tsx                   # Home page
│   │
│   ├── components/
│   │   ├── buttons/
│   │   │   ├── project/
│   │   │   │   └── index.tsx          # New Project creation button
│   │   │   └── liquid-glass/
│   │   │       └── index.tsx          # LiquidGlassButton — glassmorphism button (size + variant props)
│   │   ├── canvas/
│   │   │   ├── index.tsx              # InfiniteCanvas — pointer events, pan/zoom, shape rendering
│   │   │   ├── shapes/
│   │   │   │   ├── index.tsx          # ShapeRenderer — dispatches to per-type shape components
│   │   │   │   ├── selection.tsx      # Selection overlay with resize handles
│   │   │   │   ├── frame/             # FrameShape with LiquidGlass overlay buttons
│   │   │   │   ├── rectangle/         # RectShape renderer
│   │   │   │   ├── elipse/            # EllipseShape renderer
│   │   │   │   ├── arrow/             # ArrowShape renderer
│   │   │   │   ├── line/              # LineShape renderer
│   │   │   │   ├── text/              # TextShape renderer (contenteditable)
│   │   │   │   └── stroke/            # Shared stroke styling sub-component
│   │   │   ├── text-sidebar/
│   │   │   │   └── index.tsx          # Text formatting sidebar (font, size, bold/italic/etc, colour)
│   │   │   └── toolbar/
│   │   │       ├── index.tsx          # Toolbar layout (HistoryPill + ToolbarShapes + ZoomBar)
│   │   │       ├── shapes/
│   │   │       │   └── index.tsx      # 9-tool pill toolbar with active highlight
│   │   │       ├── zoom/
│   │   │       │   └── index.tsx      # Zoom percentage display + controls
│   │   │       └── history/
│   │   │           └── index.tsx      # Undo/redo pill
│   │   ├── navbar/
│   │   │   └── index.tsx              # Main navbar with tabs, avatar, project name
│   │   ├── projects/
│   │   │   ├── index.tsx              # ProjectsList grid component
│   │   │   ├── list/
│   │   │   └── provider/
│   │   │       └── index.tsx          # ProjectsProvider — hydrates Redux on mount from server projects
│   │   ├── providers/
│   │   │   └── auth-provider.tsx      # NextAuth SessionProvider wrapper
│   │   ├── style/
│   │   │   ├── mood-board/
│   │   │   │   ├── index.tsx          # Drop zone, drag glow, scattered layout, Add More button
│   │   │   │   └── images-board.tsx   # Individual image card (hover X button, upload state)
│   │   │   ├── swatch/
│   │   │   │   └── index.tsx          # ColorSwatch component
│   │   │   ├── theme/
│   │   │   │   └── index.tsx          # ColorTheme + ThemeContent
│   │   │   ├── typography/
│   │   │   │   └── index.tsx          # StyleGuideTypography component
│   │   │   └── style-guide-content.tsx  # Client tabs + CSS hidden panels
│   │   └── ui/                        # Reusable UI components (shadcn/ui)
│   │
│   ├── hooks/
│   │   ├── use-canvas.ts             # useInfiniteCanvas — pointer events, pan, zoom, draw, resize
│   │   ├── use-mobile.ts             # Mobile detection hook
│   │   ├── use-project.ts            # Project creation hook (Redux + API)
│   │   └── use-styles.ts             # useMoodBoard hook (drag-drop, upload, seededRef)
│   │
│   ├── lib/
│   │   ├── auth.ts                    # Auth utilities
│   │   ├── prisma.ts                  # Prisma client singleton
│   │   ├── profile.ts                 # Server-side getPreloadedProfile()
│   │   ├── uploadthing.ts             # UTApi singleton for server-side Uploadthing calls
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

**5. Moodboard upload returns 500**
- Verify `UPLOADTHING_TOKEN` is set in `.env`
- Ensure the token is the full token string (not just App ID)
- Check `src/lib/uploadthing.ts` — `UTApi()` reads `UPLOADTHING_TOKEN` automatically

**6. Moodboard images not showing after page reload**
- `queries.ts` resolves keys via `utapi.getFileUrls()` — ensure `UPLOADTHING_TOKEN` is set server-side
- If keys exist in DB but `getFileUrls` returns no data, the files may have been deleted from the Uploadthing dashboard

**7. Deleted images reappearing (ghost images)**
- This is caused by `seededRef` guard not working. Check that `useRef(false)` is declared outside any conditional logic in `useMoodBoard`

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

_Last updated: March 11, 2026_

---

## Related Documentation

- 📖 [Quick Reference Guide](./QUICK_REFERENCE.md) - Commands and snippets
- 📝 [Changelog](./CHANGELOG.md) - Version history
- 🤝 [Contributing Guide](./CONTRIBUTING.md) - How to contribute
- 🏠 [README](./README.md) - Project overview
