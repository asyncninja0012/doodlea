# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.0] - 2026-03-11

### Added
- **Infinite Canvas** (`src/components/canvas/`)
  - `InfiniteCanvas` client component — full pointer-event driven canvas with pan, zoom, and multi-tool drawing
  - `attachCanvasRef` pattern — passive `wheel` listener attached via ref callback to avoid React synthetic event limitations
  - Shape renderer (`src/components/canvas/shapes/`) — renders all shape types: `frame`, `rect`, `ellipse`, `arrow`, `line`, `text`, `freedraw`, `generatedui`
  - Selection overlay with resize handles (`selection.tsx`) dispatching custom `shape-resize-*` events
  - Draft shape preview rendered during draw gestures (before pointer-up commit)
  - Stroke sub-component for consistent shape border rendering

- **Canvas Toolbar** (`src/components/canvas/toolbar/`)
  - `ToolbarShapes` — pill-shaped glassmorphism toolbar with all 9 tools: Select, Frame, Rectangle, Ellipse, Free Draw, Arrow, **Line**, Text, Eraser
  - `ZoomBar` — displays live zoom percentage; dispatches `wheelZoom` / `zoomBy`
  - `HistoryPill` — undo/redo controls

- **Text Sidebar** (`src/components/canvas/text-sidebar/`)
  - Slides in when a text shape is selected
  - Controls: font family, font size (slider + input), bold/italic/underline/strikethrough toggles, colour picker

- **`useInfiniteCanvas` Hook** (`src/hooks/use-canvas.ts`)
  - Unified pointer event handlers: `onPointerDown`, `onPointerMove`, `onPointerUp`, `onPointerCancel`
  - **Pan fix** — panning state tracked via `isPanningRef` (ref, not Redux selector) to avoid stale-closure bug in pointer event handlers
  - **Select-tool pan** — dragging on empty canvas with Select tool pans (no key held needed); middle-mouse drag also pans
  - Multi-shape move with `initialShapePositionsRef` snapshot on pointer-down
  - Freehand drawing with RAF throttle (`RAF_INTERVAL_MS = 8ms`)
  - Resize via custom DOM events (`shape-resize-start/move/end`) dispatched by shape handles
  - `isSidebarOpen` / `hasSelectedText` derived state for text sidebar visibility

- **`LiquidGlassButton`** (`src/components/buttons/liquid-glass/`)
  - Reusable glassmorphism button with `size` (`sm`/`md`/`lg`) and `variant` (`default`/`subtle`) props
  - Used in the Frame overlay for "Inspiration" and "Generate Design" actions

- **Canvas page & queries** (`src/app/dashboard/[slug]/(workspace)/canvas/`)
  - `page.tsx` — async server component; loads project via `ProjectQuery`, guards auth and project-not-found states, renders `<InfiniteCanvas>` wrapped in `<ProjectsProvider>`
  - `queries.ts` — `ProjectQuery(projectId)` fetches project + profile from DB

- **Redux shapes slice** (`src/redux/slice/shapes/index.ts`)
  - Entity adapter for all shape types
  - Actions: `addFrame`, `addRect`, `addEllipse`, `addArrow`, `addLine`, `addText`, `addFreeDrawShape`, `updateShape`, `removeShape`, `selectShape`, `clearSelection`, `setTool`
  - Tool type: `"select" | "frame" | "rect" | "ellipse" | "freedraw" | "arrow" | "line" | "text" | "eraser"`

- **`ProjectsProvider`** (`src/components/projects/provider/`)
  - Client component that hydrates Redux store with server-fetched project on mount

### Fixed
- **Canvas zoom not applying** — CSS transform string had stray `'` (`0'`) making `translate3d` invalid; corrected to `0`
- **Pan never firing** — `onPointerMove` checked `viewport.mode` from a stale React closure; replaced with `isPanningRef` which is always current
- **Pan mode string mismatch** — code checked for non-existent `'isPanning'` mode; corrected to `'panning'`
- **`schedulePanMove` throttle inverted** — condition was `!= null` (always skipped RAF); corrected to `=== null`
- **Cursor not changing** — `cursor-crosshair` and `cursor-default` had identical conditions; fixed so crosshair applies for all non-select tools and eraser uses `cursor: cell`
- **`"use client"` missing** — added to `canvas/index.tsx` and `text-sidebar/index.tsx` (both use hooks)

### Changed
- **Select tool behaviour** — dragging on empty canvas now pans; Space key no longer required
- **Cursor** — crosshair for all drawing tools, `cell` cursor for eraser, grab/grabbing for pan modes

---

## [1.2.0] - 2026-03-07

### Added
- **Style Guide System**
  - New workspace route: `src/app/dashboard/[slug]/(workspace)/style-guide/`
  - `StyleGuideContent` client component managing Colours / Typography / Moodboard tabs via CSS `hidden` class (avoids unmount on tab switch in Radix UI v2)
  - Server-side `queries.ts` with `styleGuideQuery` and `MoodBoardImagesQuery` fetching and resolving Uploadthing CDN URLs
  - `ThemeContent` and `ColorTheme` components for colour sections
  - `StyleGuideTypography` component for typography sections
  - `ColorSwatch` component for individual colour display
  - Style guide TypeScript interfaces (`StyleGuide`, `ColorSection`, `ColorSwatch`, `TypographySection`, `TypographyStyle`) in `src/redux/api/style-guide/index.ts`

- **Moodboard Feature**
  - Drag-and-drop image upload zone with visual glow ring on active drag (`ring-4 ring-primary/30`)
  - Desktop scattered layout with seeded-random rotation and overlap positioning (`hidden lg:flex`)
  - Mobile scattered layout with absolute positioned image cards (`lg:hidden`)
  - "Add More" button (bottom-right, visible when ≥1 image, toast if at 5-image cap)
  - Empty-state prompt with `ImagePlus` icon and click-to-browse overlay
  - `ImagesBoard` component — individual image card with hover-reveal X button (red on hover), upload spinner, error icon
  - Upload progress state tracking (`uploading` / `uploaded` / `error` per image)

- **Uploadthing Cloud Storage Integration**
  - Installed `uploadthing` v7.7.4 and `@uploadthing/react` v7.3.3
  - `src/app/api/uploadthing/core.ts` — file router with `moodBoardImage` route (4 MB max, auth middleware)
  - `src/app/api/uploadthing/route.ts` — Uploadthing `GET`/`POST` route handler
  - `src/lib/uploadthing.ts` — `UTApi` singleton (`utapi`) for server-side file operations
  - `next.config.ts` updated with `remotePatterns` for `utfs.io` and `*.ufs.sh` CDN domains

- **Moodboard API Routes**
  - `POST /api/moodboard/upload` — accepts `multipart/form-data`, calls `utapi.uploadFiles()`, returns `{ storageId, url }`
  - `POST /api/moodboard/add` — persists a file key (`storageId`) to `Project.moodBoardImages[]`
  - `POST /api/moodboard/remove` — removes key from DB and calls `utapi.deleteFiles()` to purge from storage
  - `POST /api/moodboard/generate-upload-url` — returns client-side upload endpoint (`/api/moodboard/upload`)

- **`useMoodBoard` Hook** (`src/hooks/use-styles.ts`)
  - `"use client"` directive
  - `useRef(false)` `seededRef` guard — server images seeded into form state only once on mount; prevents ghost images reappearing after tab switch
  - Optimistic `removeImage` — removes from UI instantly, fires server `POST /api/moodboard/remove` in background
  - Upload uses `FormData` + `formData.append('file', file)` (fixed raw-body 500 error)
  - Batch drop via `getValues('images')` to avoid stale closure bug when dropping multiple files
  - `canAddMore` exported (`images.length < 5`) for consumers

- **Workspace Restructure**
  - New route group `(workspace)` under `dashboard/[slug]/` with shared `Navbar` layout
  - `canvas/` page and layout placeholders
  - Dashboard page (`(workspace)/page.tsx`) fetches and dispatches projects to Redux on mount
  - `ProjectsList` component with grid card layout, thumbnails, relative-time via `date-fns`
  - `ProjectsProvider` client component hydrates Redux from server-fetched projects

- **Navbar Fix**
  - Tab `href` now correctly includes `/${me.slug}/` segment (was missing slug in path)

### Fixed
- **Upload 500 Error** — Hook was sending raw file body; fixed to use `FormData` with `formData.append('file', file)`
- **Ghost Images After Deletion** — `seededRef` ensures server images only seed form state once; tab switching no longer replays the seed
- **Tab Persistence** — Moodboard state now survives tab switches; Radix v2 does not support `forceMount`, so `StyleGuideContent` owns all tab panels and hides/shows with CSS `hidden`
- **Desktop Image Positioning** — `marginTop` changed from `-120px` to `0px` for correct vertical centering
- **CSS Typo** — `"relative-border-2"` → `"relative border-2"` in moodboard container (drag zone was invisible)
- **Gradient Overlay Blocking Drag** — Added `pointer-events-none` to the background gradient div
- **X Button Not Showing** — `"absolute-group"` → `"absolute group"` (two separate Tailwind classes) in `ImagesBoard`
- **Tab Value Mismatch** — Old code used `value='mood-board'`; corrected to `value='moodboard'`
- **Stale Closure in Batch Drop** — Drop handler now reads `getValues('images')` once and sets all new images in a single `setValue` call
- **`/dashboard/[slug]` routing** — Removed old top-level `page.tsx` / `layout.tsx`; replaced with `(workspace)` route group

### Changed
- `Project.moodBoardImages` stores Uploadthing file **keys** (not base64 or URLs); `MoodBoardImagesQuery` resolves keys → CDN URLs via `utapi.getFileUrls()` at read time
- Style guide `layout.tsx` simplified to `<>{children}</>` (Tabs UI moved into `StyleGuideContent`)
- `src/app/dashboard/[slug]/layout.tsx` and `page.tsx` deleted; replaced by the `(workspace)` route group

### New Dependencies
- `uploadthing` v7.7.4
- `@uploadthing/react` v7.3.3

### New Environment Variables
- `UPLOADTHING_TOKEN` — Required for moodboard uploads. Obtain from [uploadthing.com/dashboard](https://uploadthing.com/dashboard) → API Keys.

---

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
