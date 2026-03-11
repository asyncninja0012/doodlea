# Doodlea

A modern SaaS platform built with Next.js 15, featuring authentication, subscription management, and dynamic user profiles.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your database URL and secrets

# Push database schema
npx prisma db push --url="YOUR_DATABASE_URL"
npx prisma generate

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## ✨ Features

- 🔐 **Authentication** - Credential and Google OAuth with NextAuth.js
- 👤 **Dynamic User Profiles** - Unique slug-based URLs (`/dashboard/john-doe-a7x9k2`)
- 💳 **Subscription System** - Multi-tier plans with credit management
- 🛡️ **Route Protection** - Middleware-based access control
- 📊 **Protected Dashboard** - Subscription-gated user dashboard
- 🧪 **Test Mode** - Easy subscription activation for development
- 📦 **Redux State Management** - RTK with server-side preloaded state
- 🎨 **Project Creation** - Auto-numbered projects with gradient thumbnails
- 🖼️ **Infinite Canvas** - Full drawing canvas with 9 tools, pan, zoom, and shape management
- 🌐 **Navbar** - Glassmorphism navbar with project context, tabs, and avatar
- 🗂️ **Style Guide** - Per-project style guide with colours, typography, and moodboard tabs
- 📸 **Moodboard** - Drag-and-drop image board with Uploadthing cloud storage (up to 5 images)
- ⚡ **Optimistic UI** - Instant image removal with background server sync

## 📚 Documentation

Complete documentation for developers:

| Document | Description |
|----------|-------------|
| **[DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md)** | Complete development guide with architecture, schemas, and workflows |
| **[QUICK_REFERENCE.md](./QUICK_REFERENCE.md)** | Quick commands, snippets, and common tasks |
| **[CHANGELOG.md](./CHANGELOG.md)** | Version history and changes |
| **[CONTRIBUTING.md](./CONTRIBUTING.md)** | Contribution guidelines and coding standards |

**📖 For new developers:** Start with [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md)  
**⚡ For quick lookups:** Use [QUICK_REFERENCE.md](./QUICK_REFERENCE.md)  
**🔄 When updating:** Update [CHANGELOG.md](./CHANGELOG.md) and relevant guides

## 🛠️ Tech Stack

- **Framework**: Next.js 15.4.6 with App Router
- **Auth**: NextAuth.js 4.24.13
- **Database**: PostgreSQL with Prisma ORM 7.4.0
- **State Management**: Redux Toolkit 2.8.2
- **Cloud Storage**: Uploadthing 7.7.4 (moodboard images)
- **Styling**: Tailwind CSS 4.x
- **UI Components**: shadcn/ui (Radix UI)
- **Language**: TypeScript

## 📋 Environment Variables

Required environment variables:

```env
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"
GOOGLE_CLIENT_ID="optional-for-oauth"
GOOGLE_CLIENT_SECRET="optional-for-oauth"
UPLOADTHING_TOKEN="your-uploadthing-token"    # Required for moodboard image uploads
```

> Get `UPLOADTHING_TOKEN` from [uploadthing.com/dashboard](https://uploadthing.com/dashboard) → API Keys.

## 🖼️ Canvas Tools

The infinite canvas supports 9 tools accessible via the bottom toolbar:

| Tool | Shortcut | Behaviour |
|------|----------|-----------|
| Select | — | Click to select shapes; drag empty area to pan |
| Frame | — | Draw labelled frame containers |
| Rectangle | — | Draw filled/stroked rectangles |
| Ellipse | — | Draw ellipses |
| Free Draw | — | Freehand pen drawing |
| Arrow | — | Draw arrows between points |
| Line | — | Draw straight lines |
| Text | — | Click to place a text block |
| Eraser | — | Click/drag to delete shapes |

**Pan:** Drag on empty canvas with Select tool, or middle-mouse drag anywhere.  
**Zoom:** Trackpad pinch or scroll wheel (Ctrl/Cmd + scroll).

## 📚 Documentation

Complete documentation for developers:

| Document | Description |
|----------|-------------|
| **[DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md)** | Complete development guide with architecture, schemas, and workflows |
| **[QUICK_REFERENCE.md](./QUICK_REFERENCE.md)** | Quick commands, snippets, and common tasks |
| **[CHANGELOG.md](./CHANGELOG.md)** | Version history and changes |
| **[CONTRIBUTING.md](./CONTRIBUTING.md)** | Contribution guidelines and coding standards |

**📖 For new developers:** Start with [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md)  
**⚡ For quick lookups:** Use [QUICK_REFERENCE.md](./QUICK_REFERENCE.md)  
**🔄 When updating:** Update [CHANGELOG.md](./CHANGELOG.md) and relevant guides

## 🛠️ Tech Stack

- **Framework**: Next.js 15.4.6 with App Router
- **Auth**: NextAuth.js 4.24.13
- **Database**: PostgreSQL with Prisma ORM 7.4.0
- **State Management**: Redux Toolkit 2.8.2
- **Cloud Storage**: Uploadthing 7.7.4 (moodboard images)
- **Styling**: Tailwind CSS 4.x
- **UI Components**: shadcn/ui (Radix UI)
- **Language**: TypeScript

## 📋 Environment Variables

Required environment variables:

```env
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"
GOOGLE_CLIENT_ID="optional-for-oauth"
GOOGLE_CLIENT_SECRET="optional-for-oauth"
UPLOADTHING_TOKEN="your-uploadthing-token"    # Required for moodboard image uploads
```

> Get `UPLOADTHING_TOKEN` from [uploadthing.com/dashboard](https://uploadthing.com/dashboard) → API Keys.

## 🔑 Key Commands

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run ESLint

# Database
npx prisma generate      # Generate Prisma Client
npx prisma db push       # Push schema to database
npx prisma studio        # Open Prisma Studio GUI
```

## 📁 Project Structure

```
src/
├── app/
│   ├── api/                 # API routes
│   │   ├── auth/           # Authentication endpoints
│   │   ├── moodboard/      # Moodboard CRUD (add, remove, upload, generate-upload-url)
│   │   ├── projects/       # Project CRUD (POST, GET, GET by ID)
│   │   ├── style-guide/    # Style guide generation
│   │   ├── subscriptions/  # Subscription management
│   │   └── uploadthing/    # Uploadthing file router (core.ts + route.ts)
│   ├── auth/               # Auth pages (sign-in, sign-up)
│   ├── billing/[slug]/     # Dynamic billing page
│   └── dashboard/[slug]/   # Protected dashboard
│       └── (workspace)/    # Workspace layout with Navbar
│           ├── canvas/     # Canvas page
│           └── style-guide/ # Style guide (colours, typography, moodboard)
├── components/             # React components
│   ├── buttons/            # Action buttons (New Project)
│   ├── navbar/             # Main navigation bar
│   ├── projects/           # Projects list + provider
│   ├── style/              # Style guide components
│   │   ├── mood-board/     # Moodboard drop zone + image cards
│   │   ├── swatch/         # Color swatch component
│   │   ├── theme/          # Color theme grid
│   │   ├── typography/     # Typography guide
│   │   └── style-guide-content.tsx  # Client component managing tabs + CSS hidden
│   └── ui/                 # shadcn/ui components
├── hooks/                  # Custom hooks
│   ├── use-project.ts      # Project creation hook
│   ├── use-mobile.ts       # Mobile detection
│   └── use-styles.ts       # Moodboard state, drag-drop, upload logic
├── lib/                    # Utilities
│   ├── auth.ts             # NextAuth config
│   ├── prisma.ts           # Prisma client
│   ├── profile.ts          # Profile helpers
│   ├── uploadthing.ts      # UTApi singleton for server-side usage
│   └── utils.ts            # cn() and helpers
├── redux/                  # Redux store, provider, and slices
│   └── slice/              # profile, projects, shapes, viewport
├── types/                  # TypeScript type definitions
└── middleware.ts           # Route protection middleware
```

## 🧪 Testing Features

### Test Subscription Activation

During development, you can bypass payment and activate a test subscription:

1. Register or log in
2. Navigate to billing page
3. Click "Activate Test Subscription"
4. Instant access to dashboard with 30-day active subscription

## 🚦 User Flow

```
Registration → /billing/{slug} → Subscribe → /dashboard/{slug}
                                    ↓
                            Test Activation (Dev Mode)
```

## 🔒 Authentication

- **Credential-based**: Email/password with bcrypt hashing
- **Google OAuth**: Sign in with Google account
- **JWT Sessions**: 30-day expiration with 5-minute revalidation
- **Route Protection**: Middleware validates authentication and subscription status

## 💾 Database Schema

Key models:
- **User**: Authentication and profile data with unique slug
- **Subscription**: Plan details, status, and credits
- **Project**: User-created projects
- **CreditsLedger**: Credit usage tracking

See [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md) for complete schema documentation.

## 👨‍💻 Development

When adding new features:

1. Update database schema in `prisma/schema.prisma`
2. Run `npx prisma db push` and `npx prisma generate`
3. Create API routes in `src/app/api/`
4. Build UI components
5. Update middleware for route protection
6. For file uploads, use the Uploadthing file router at `src/app/api/uploadthing/core.ts`
7. **Update [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md) with your changes**

## 🐛 Troubleshooting

Common issues and solutions are documented in the [Development Guide](./DEVELOPMENT_GUIDE.md#troubleshooting).

## 📖 Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

## 📄 License

[Your License Here]

---

**For detailed development information, architecture diagrams, and API documentation, see [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md)**

