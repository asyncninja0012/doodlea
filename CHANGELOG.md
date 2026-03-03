# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-03-03

### Added
- **Redux State Management**
  - Redux Toolkit v2.8.2 integration with preloaded server state
  - `ReduxProvider` component with `makeStore(preloadedState)` pattern
  - Profile slice (`id`, `name`, `email`, `image`, `slug`, `credits`, `plan`, `hasSubscription`)
  - Projects slice with full CRUD actions (`addProject`, `updateProject`, `deleteProject`, `createProjectStart/Success/Failure`)
  - Shapes slice for canvas state (shapes entity adapter, tool selection, selection map, frame counter)
  - Viewport slice for canvas zoom/pan state (scale, translate, pan modes, screen↔world transforms)
  - Typed hooks (`useAppDispatch`, `useAppSelector`) exported from store
  - Server-side `getPreloadedProfile()` helper for SSR → Redux hydration

- **Navbar Component**
  - Database-driven project name fetching via `/api/projects/[id]`
  - Canvas and Style Guide tab navigation with active state
  - User avatar with Google image support and fallback icon
  - Credits placeholder display
  - Help button with glassmorphism styling
  - "New Project" creation button (rightmost position)
  - Integrated with Redux for user profile data
  - Glassmorphism design with `backdrop-blur`, `saturate-150`, semi-transparent borders

- **Project Creation System**
  - `POST /api/projects` — Create project with auto-incrementing number per user
  - `GET /api/projects` — List user's projects with summary data
  - `GET /api/projects/[id]` — Fetch single project by ID
  - `useProjectCreation` hook with Redux integration
  - SVG gradient thumbnail auto-generation (`generateGradientThumbnail`)
  - `ProjectCounter` model for atomic per-user project numbering via `upsert`
  - Passes current Redux shapes state (`shapes`, `tool`, `selected`, `frameCounter`) to API
  - `CreateProject` button component with loading state

- **Root Layout Providers**
  - `AuthProvider` → `ThemeProvider` → `ReduxProvider` chain in root layout
  - Server-side profile preloading with `getPreloadedProfile()`
  - `suppressHydrationWarning` on `<html>` for VS Code dev compatibility

### Changed
- **Dashboard Page**
  - Stripped to only render `<Navbar />` (removed previous content)
  - Added minimal passthrough layout (`layout.tsx`)

- **Billing Page**
  - Uses `useSession().update()` for proper session refresh after test subscription activation
  - Hard navigation to dashboard after activation instead of client-side redirect

- **Auth Pages**
  - Google OAuth `callbackUrl` changed from `/` to `/dashboard` on both sign-in and sign-up pages

- **Middleware**
  - Updated to not redirect slugless OAuth users to `/auth/error`
  - Lets slugless users through gracefully during OAuth slug generation

- **NextAuth JWT Callback**
  - Auto-generates slug for OAuth users who don't have one (using `generateSlug`)
  - Handles `trigger === 'update'` for session refresh after subscription changes

### Fixed
- **Google OAuth Registration** — `OAuthCreateAccount` error due to required `password` field; changed to `password String?` (optional)
- **Post-OAuth Redirect** — Users redirected to landing page instead of dashboard after Google sign-in
- **Slugless OAuth Users** — Middleware redirect loop for users without a slug
- **Test Subscription Activation** — `fetch('/api/auth/session?update=true')` doesn't trigger JWT refresh; switched to `useSession().update()`
- **Hydration Mismatch** — VS Code injecting `--vsc-domain` style attribute on `<html>` tag
- **Avatar Fallback** — Radix Avatar not showing fallback when `src=""`; added conditional render
- **Avatar Icon Visibility** — `text-black` class on `User` icon invisible on dark theme; removed
- **Navbar Positioning** — Fixed `justifty-end` typo and added `ml-auto` for right-aligned section
- **Duplicate Import** — Removed duplicate `LayoutTemplate` import in navbar

### Database Changes
- `User.password` changed from `String` (required) to `String?` (optional) for OAuth support

### New Dependencies
- `@reduxjs/toolkit` v2.8.2

---

## [1.0.0] - 2026-02-24

### Added
- **Authentication System**
  - Credential-based authentication with email/password
  - Google OAuth integration
  - NextAuth.js v4.24.13 with JWT sessions
  - Password hashing with bcryptjs (10 rounds)
  - Session validation every 5 minutes
  
- **User Management**
  - User registration with unique slug generation
  - Slug format: `{name}-{6-random-chars}` (e.g., `john-doe-a7x9k2`)
  - Dynamic user profiles with slug-based URLs
  - User model with email, password, slug, and timestamps
  
- **Subscription System**
  - Multi-tier subscription plans (Free, Starter, Pro, Enterprise)
  - Credit-based system with balance tracking
  - Subscription status validation in JWT
  - Active subscription check for dashboard access
  - Test subscription activation for development
  
- **Route Protection**
  - Middleware for authentication checks
  - Subscription-based access control
  - Automatic redirects based on auth/subscription status
  - Slug validation in dynamic routes
  
- **Dynamic Routing**
  - `/billing/[slug]` - User-specific billing page
  - `/dashboard/[slug]` - Protected user dashboard
  - Slug verification against authenticated user
  
- **Database Schema**
  - User model with authentication fields
  - Subscription model with Polar.sh integration fields
  - Project model for user content
  - CreditsLedger for usage tracking
  - ProjectCounter for sequential project numbering
  - Next-Auth models (Account, Session, VerificationToken)
  
- **API Endpoints**
  - `POST /api/auth/register` - User registration
  - `POST /api/subscriptions/create` - Production subscription creation
  - `POST /api/subscriptions/activate-test` - Development test subscriptions
  
- **UI Components**
  - Sign-up page with form validation
  - Sign-in page with credential and OAuth options
  - Billing page with pricing tiers and test activation
  - Dashboard page with project statistics
  - shadcn/ui component library integration
  
- **Development Features**
  - Test subscription activation button on billing page
  - Environment variable configuration
  - Prisma ORM with PostgreSQL
  - TypeScript type safety throughout
  
- **Documentation**
  - Comprehensive DEVELOPMENT_GUIDE.md
  - Updated README.md with quick start
  - .env.example template
  - This CHANGELOG.md

### Technical Details
- Next.js 15.4.6 with App Router
- React 19.1.0
- NextAuth.js 4.24.13
- Prisma 7.4.0
- PostgreSQL database (Neon)
- Tailwind CSS 4.x
- TypeScript
- bcryptjs for password hashing
- Zod for schema validation

### Database Migrations
- Initial schema with User, Account, Session, VerificationToken models
- Added Subscription model with credits system
- Added Project and ProjectCounter models
- Added CreditsLedger for usage tracking
- Added `slug` field to User model (unique)

---

## How to Update This Changelog

When adding new features or making changes:

1. **Choose the appropriate version number:**
   - MAJOR version (X.0.0) for incompatible API changes
   - MINOR version (0.X.0) for new functionality (backwards-compatible)
   - PATCH version (0.0.X) for backwards-compatible bug fixes

2. **Add entries under the correct section:**
   - **Added** for new features
   - **Changed** for changes in existing functionality
   - **Deprecated** for soon-to-be removed features
   - **Removed** for now removed features
   - **Fixed** for any bug fixes
   - **Security** for vulnerability fixes

3. **Use this format:**
   ```markdown
   ## [Version] - YYYY-MM-DD
   
   ### Added
   - Feature description with relevant details
   
   ### Changed
   - What changed and why
   
   ### Fixed
   - Bug description and solution
   ```

4. **Include:**
   - Clear description of the change
   - Reason for the change (if applicable)
   - Breaking changes (if any)
   - Migration instructions (if needed)

---

## Example Future Entry

```markdown
## [1.1.0] - 2026-03-15

### Added
- **Email Verification System**
  - Email verification required before account activation
  - Verification token generation and validation
  - Resend verification email functionality
  - Email templates with Resend/SendGrid integration

### Changed
- **Subscription Flow**
  - Updated Polar.sh webhook handling
  - Changed subscription status from 'active' to 'ACTIVE'
  - Updated credit grant logic for better performance

### Fixed
- **Authentication**
  - Fixed session not updating after subscription activation
  - Resolved redirect loop on billing page
  - Corrected slug validation in middleware

### Database Migrations
- Added `emailVerificationToken` and `emailVerified` to User model
- Updated Subscription model to include `webhookData` JSON field
```
