# Doodlea - Quick Reference Guide

> Quick commands and common tasks for developers working on Doodlea

## Table of Contents
- [Common Commands](#common-commands)
- [Environment Setup](#environment-setup)
- [Database Operations](#database-operations)
- [API Endpoints](#api-endpoints)
- [File Locations](#file-locations)
- [Common Tasks](#common-tasks)
- [Troubleshooting](#troubleshooting)

---

## Common Commands

### Development
```bash
npm run dev          # Start dev server (http://localhost:3000)
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

### Database
```bash
npx prisma generate                    # Generate Prisma Client
npx prisma db push --url="DB_URL"     # Push schema to database
npx prisma studio                      # Open Prisma Studio GUI
npx prisma db push --force-reset      # Reset database (destructive!)
```

### Git
```bash
git checkout -b feature/feature-name   # Create feature branch
git add .                              # Stage changes
git commit -m "feat: description"     # Commit with message
git push origin feature-name           # Push to remote
```

---

## Environment Setup

### Required Environment Variables

Create `.env` file:
```env
DATABASE_URL="postgresql://user:pass@host:port/db?sslmode=require"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"
GOOGLE_CLIENT_ID="optional.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="optional-GOCSPX-xxx"
```

### Generate Secrets
```bash
# Generate NEXTAUTH_SECRET
openssl rand -base64 32
```

---

## Database Operations

### Initial Setup
```bash
# 1. Push schema to database
npx prisma db push --url="postgresql://..."

# 2. Generate Prisma Client
npx prisma generate

# 3. Verify with Prisma Studio
npx prisma studio
```

### Making Schema Changes
```bash
# 1. Edit prisma/schema.prisma
# 2. Push changes
npx prisma db push --url="postgresql://..."
# 3. Regenerate client
npx prisma generate
# 4. Restart dev server
```

### View Database
```bash
npx prisma studio
# Opens GUI at http://localhost:5555
```

---

## API Endpoints

### Authentication
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/auth/[...nextauth]` | GET/POST | NextAuth endpoints |
| `/api/auth/register` | POST | User registration |
| `/api/auth/session` | GET | Get current session |

### Subscriptions
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/subscriptions/create` | POST | Create subscription |
| `/api/subscriptions/activate-test` | POST | Test subscription (dev) |

### Request Examples

**Register User**
```bash
POST /api/auth/register
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "password": "securepassword"
}
```

**Activate Test Subscription**
```bash
POST /api/subscriptions/activate-test
# Requires authenticated session
# Returns: { message, subscription }
```

---

## File Locations

### Core Files
```
src/
├── app/
│   ├── api/auth/[...nextauth]/route.ts    # NextAuth config
│   ├── api/auth/register/route.ts         # Registration endpoint
│   ├── api/subscriptions/activate-test/   # Test subscriptions
│   ├── auth/sign-in/page.tsx              # Login page
│   ├── auth/sign-up/page.tsx              # Register page
│   ├── billing/[slug]/page.tsx            # Billing page
│   └── dashboard/[slug]/page.tsx          # Dashboard page
├── lib/
│   ├── auth.ts                            # Auth utilities
│   ├── prisma.ts                          # Prisma client
│   ├── username.ts                        # Slug generation
│   └── utils.ts                           # Utilities
├── types/
│   └── next-auth.d.ts                     # NextAuth types
└── middleware.ts                          # Route protection

prisma/
├── schema.prisma                          # Database schema
└── prisma.config.ts                       # Prisma config
```

### Configuration Files
```
.env                  # Environment variables (gitignored)
.env.example          # Example environment variables
next.config.ts        # Next.js configuration
tsconfig.json         # TypeScript configuration
tailwind.config.ts    # Tailwind CSS configuration
components.json       # shadcn/ui configuration
```

---

## Common Tasks

### Add a New Page
```bash
# 1. Create file
src/app/my-page/page.tsx

# 2. Create component
'use client'  # If using hooks/state
export default function MyPage() {
  return <div>My Page</div>
}

# 3. Access at http://localhost:3000/my-page
```

### Add a New API Endpoint
```bash
# 1. Create file
src/app/api/my-endpoint/route.ts

# 2. Create handler
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const body = await req.json()
  return NextResponse.json({ success: true })
}

# 3. Access at /api/my-endpoint
```

### Add Database Model
```prisma
# 1. Edit prisma/schema.prisma
model MyModel {
  id        String   @id @default(cuid())
  name      String
  createdAt DateTime @default(now())
}

# 2. Push to database
npx prisma db push --url="DB_URL"

# 3. Generate client
npx prisma generate

# 4. Use in code
import { prisma } from '@/lib/prisma'
const item = await prisma.myModel.create({ data: { name: "Test" } })
```

### Protect a Route
```typescript
// In src/middleware.ts
export const config = {
  matcher: [
    '/billing/:path*',
    '/dashboard/:path*',
    '/my-protected-route/:path*',  // Add your route
  ],
}
```

### Add Environment Variable
```bash
# 1. Add to .env
MY_NEW_VAR="value"

# 2. Add to .env.example
MY_NEW_VAR="example-value-or-description"

# 3. Use in code
const myVar = process.env.MY_NEW_VAR
```

---

## Troubleshooting

### Build Errors

**Prisma Client out of sync**
```bash
npx prisma generate
rm -rf .next
npm run dev
```

**TypeScript errors**
```bash
npm run build
# Fix errors shown
```

### Runtime Errors

**"Prisma Client validation error"**
- Check schema matches database
- Run `npx prisma generate`
- Verify DATABASE_URL is correct

**"Session not found"**
- Check NEXTAUTH_SECRET is set
- Clear browser cookies
- Restart dev server

**"Redirect loop"**
- Check middleware logic
- Verify session is being created
- Check slug validation

**"Subscription not detected"**
- Verify status is lowercase `'active'`
- Check JWT validation interval
- Force session update by signing out/in

### Database Issues

**Can't connect to database**
```bash
# Test connection
npx prisma db push --url="postgresql://..."
# Check DATABASE_URL format
# Verify database is running
```

**Schema out of sync**
```bash
npx prisma db push --url="postgresql://..."
npx prisma generate
```

---

## Testing Features

### Test Subscription Flow
1. Register at `/auth/sign-up`
2. Redirected to `/billing/{slug}`
3. Click "Activate Test Subscription"
4. Redirected to `/dashboard/{slug}`
5. Verify access granted

### Test Authentication
```bash
# Credential login
POST /api/auth/signin
{ email, password }

# Google OAuth
# Click "Sign in with Google" button
# Follow OAuth flow
```

---

## Useful Snippets

### Get Current User in API Route
```typescript
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'

const session = await getServerSession(authOptions)
if (!session?.user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
const userId = session.user.id
```

### Get Current User in Server Component
```typescript
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export default async function MyPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/auth/sign-in')
  
  return <div>Hello {session.user.name}</div>
}
```

### Get Current User in Client Component
```typescript
'use client'
import { useSession } from 'next-auth/react'

export default function MyComponent() {
  const { data: session, status } = useSession()
  
  if (status === 'loading') return <div>Loading...</div>
  if (!session) return <div>Not logged in</div>
  
  return <div>Hello {session.user.name}</div>
}
```

### Query Database
```typescript
import { prisma } from '@/lib/prisma'

// Find one
const user = await prisma.user.findUnique({
  where: { email: 'user@example.com' }
})

// Find many
const users = await prisma.user.findMany({
  where: { emailVerified: { not: null } }
})

// Create
const newUser = await prisma.user.create({
  data: { email: 'new@example.com', name: 'New User' }
})

// Update
const updated = await prisma.user.update({
  where: { id: userId },
  data: { name: 'Updated Name' }
})
```

---

## Documentation Links

- **[README.md](./README.md)** - Project overview
- **[DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md)** - Complete development guide
- **[CHANGELOG.md](./CHANGELOG.md)** - Version history
- **[CONTRIBUTING.md](./CONTRIBUTING.md)** - Contribution guidelines

---

## Quick Tips

- 💡 Always run `npx prisma generate` after schema changes
- 💡 Restart dev server after changing `.env` file
- 💡 Use TypeScript types for better IDE support
- 💡 Check browser console for client-side errors
- 💡 Check terminal for server-side errors
- 💡 Use Prisma Studio to inspect database
- 💡 Clear `.next` folder if build seems cached

---

**For detailed information, see [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md)**
