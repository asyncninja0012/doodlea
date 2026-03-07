# Contributing to Doodlea

Thank you for your interest in contributing to Doodlea! This document provides guidelines and instructions for contributing to the project.

## Table of Contents
- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Database Changes](#database-changes)
- [Documentation](#documentation)
- [Commit Messages](#commit-messages)
- [Pull Request Process](#pull-request-process)

---

## Code of Conduct

- Be respectful and professional
- Write clean, maintainable code
- Test your changes thoroughly
- Document your work
- Follow existing patterns and conventions

---

## Getting Started

1. **Fork the repository** and clone it locally
2. **Install dependencies**: `npm install`
3. **Set up environment**: Copy `.env.example` to `.env` and configure
4. **Add Uploadthing token**: Obtain `UPLOADTHING_TOKEN` from [uploadthing.com/dashboard](https://uploadthing.com/dashboard) and add to `.env`. This is **required** for the moodboard feature to work in development.
5. **Set up database**: Run `npx prisma db push` and `npx prisma generate`
6. **Start development**: Run `npm run dev`

For detailed setup instructions, see [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md).

---

## Development Workflow

### 1. Create a Feature Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/bug-description
```

### 2. Make Your Changes

- Write clean, commented code
- Follow TypeScript best practices
- Use existing UI components where possible
- Test your changes locally

### 3. Test Thoroughly

```bash
# Run the dev server
npm run dev

# Check for TypeScript errors
npm run build

# Run linting
npm run lint

# Test all affected flows manually
```

### 4. Update Documentation

- Update [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md) with new features
- Add entries to [CHANGELOG.md](./CHANGELOG.md)
- Update API documentation if endpoints changed
- Add inline code comments for complex logic

### 5. Commit Your Changes

```bash
git add .
git commit -m "feat: add user profile customization"
```

See [Commit Messages](#commit-messages) for formatting guidelines.

### 6. Push and Create Pull Request

```bash
git push origin feature/your-feature-name
```

Then create a pull request on GitHub with:
- Clear description of changes
- Screenshots (if UI changes)
- Testing instructions
- Related issue numbers

---

## Coding Standards

### TypeScript

- **Use strict TypeScript**: No `any` types unless absolutely necessary
- **Define interfaces**: For complex objects and API responses
- **Use type inference**: When types are obvious
- **Export types**: Share types between files when needed

```typescript
// Good
interface UserProfile {
  id: string
  name: string
  email: string
  slug: string | null
}

// Avoid
const user: any = { ... }
```

### React Components

- **Use functional components** with hooks
- **Keep components small**: Single responsibility principle
- **Extract reusable logic**: Into custom hooks
- **Use client/server components appropriately**

```tsx
// Good - Server Component (default)
export default async function DashboardPage() {
  const data = await getData()
  return <div>{data.title}</div>
}

// Good - Client Component (when needed)
'use client'
export default function InteractiveButton() {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount(count + 1)}>{count}</button>
}
```

### File Naming

- **Components**: PascalCase - `UserProfile.tsx`
- **Utilities**: kebab-case - `format-date.ts`
- **Pages**: kebab-case - `page.tsx`, `[slug]/page.tsx`
- **API Routes**: kebab-case - `route.ts`

### Code Organization

```typescript
// 1. Imports (grouped)
import { useState } from 'react'
import { useRouter } from 'next/navigation'

// 2. Types/Interfaces
interface Props {
  userId: string
}

// 3. Component/Function
export default function MyComponent({ userId }: Props) {
  // 4. Hooks
  const router = useRouter()
  const [state, setState] = useState()
  
  // 5. Functions
  const handleClick = () => { ... }
  
  // 6. Effects
  useEffect(() => { ... }, [])
  
  // 7. Render
  return <div>...</div>
}
```

---

## Database Changes

### Making Schema Changes

1. **Edit the schema**: Modify `prisma/schema.prisma`

```prisma
model User {
  id    String @id @default(cuid())
  email String @unique
  // Add new field
  bio   String?
}
```

2. **Push to database**:

```bash
npx prisma db push --url="YOUR_DATABASE_URL"
```

3. **Regenerate Prisma Client**:

```bash
npx prisma generate
```

4. **Update TypeScript types** if needed in `src/types/`

5. **Update related API endpoints** and components

### Migration Best Practices

- **Make backwards-compatible changes** when possible
- **Test with existing data** before deploying
- **Document breaking changes** in CHANGELOG.md
- **Provide migration scripts** for complex changes

---

## Documentation

### What to Document

1. **New Features**: Add section to DEVELOPMENT_GUIDE.md
2. **API Endpoints**: Document request/response format
3. **Environment Variables**: Add to .env.example
4. **Database Schema**: Update schema section
5. **Breaking Changes**: Highlight in CHANGELOG.md

### Documentation Style

- Use clear, concise language
- Provide code examples
- Include screenshots for UI changes
- Link related documentation sections
- Keep examples up-to-date

---

## Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Build process, dependencies, tooling

### Examples

```bash
feat(auth): add email verification system
fix(billing): resolve subscription status update issue
docs: update API endpoint documentation
refactor(dashboard): extract stats component
chore(deps): upgrade Next.js to 15.5.0
```

### Scope Guidelines

- `auth` - Authentication related
- `billing` - Billing and subscriptions
- `dashboard` - Dashboard features
- `api` - API endpoints
- `db` - Database schema
- `ui` - UI components
- `moodboard` - Moodboard feature (upload, drag-drop, storage)
- `style-guide` - Style guide tabs (colours, typography)
- `storage` - Uploadthing or cloud storage changes

---

## Pull Request Process

### Before Submitting

- ✅ Code builds without errors (`npm run build`)
- ✅ Linting passes (`npm run lint`)
- ✅ All features tested manually
- ✅ Documentation updated
- ✅ Changelog updated
- ✅ No console errors or warnings
- ✅ `UPLOADTHING_TOKEN` present in `.env` if touching moodboard/storage code

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Changes Made
- List of specific changes
- With relevant details

## Testing
How to test these changes:
1. Step 1
2. Step 2
3. Expected result

## Screenshots
(if applicable)

## Checklist
- [ ] Code builds successfully
- [ ] Linting passes
- [ ] Documentation updated
- [ ] Changelog updated
- [ ] Database migrations documented
```

### Review Process

1. At least one maintainer approval required
2. All CI checks must pass
3. No merge conflicts
4. Documentation complete

---

## Patterns & Architecture Notes

### Optimistic UI Updates

When removing items from a list (e.g. moodboard images), apply the **optimistic deletion** pattern:

1. Update client state immediately (so the UI responds instantly)
2. Show a success toast
3. Fire the server request in the background; on failure, show an error toast

```typescript
// Example from useMoodBoard.removeImage
const removeImage = async (imageId: string) => {
  // 1. Remove from UI instantly
  setValue('images', images.filter(img => img.id !== imageId))
  toast.success('Image removed')

  // 2. Server sync in background
  removeMoodBoardImage(projectId, storageId).catch(() =>
    toast.error('Failed to remove from server')
  )
}
```

### CSS-Based Tab Persistence

When using Radix UI v2 (`radix-ui` unified package) tabs and you need a tab panel to remain mounted across tab switches, **do not** use `forceMount` (it is broken in v2). Instead, own the active tab state yourself and hide inactive panels with `className={cn(activeTab !== 'value' && 'hidden')}`.

### seededRef Pattern

When a hook receives server-fetched data as a prop and seeds client state from it, use a `useRef(false)` guard to ensure the seed only runs **once** (on first mount):

```typescript
const seededRef = useRef(false)
useEffect(() => {
  if (seededRef.current) return
  // seed state
  seededRef.current = true
}, [serverData, setValue])
```

Without this, if the parent re-renders (e.g. on tab switch), the effect re-runs and overwrites locally-modified state.

### Cloud Storage (Uploadthing)

- Store only the file **key** in the database, not the URL
- Resolve keys → CDN URLs at read time using `utapi.getFileUrls()`
- Always call `utapi.deleteFiles(key)` when removing a file from the DB
- The `UTApi` singleton is in `src/lib/uploadthing.ts` — import `utapi` for server-side operations

---

## Adding New Features

### Step-by-Step Guide

#### 1. Plan the Feature

- [ ] Define user requirements
- [ ] Design database schema changes
- [ ] Sketch API endpoints needed
- [ ] Plan UI components

#### 2. Implement Backend

```bash
# Update database schema
# Edit prisma/schema.prisma
npx prisma db push --url="DATABASE_URL"
npx prisma generate

# Create API routes
# src/app/api/your-feature/route.ts
```

#### 3. Implement Frontend

```bash
# Create pages/components
# src/app/your-feature/page.tsx
# src/components/YourFeature.tsx
```

#### 4. Add Route Protection (if needed)

```bash
# Update src/middleware.ts
# Add route patterns and protection logic
```

#### 5. Document Everything

- [ ] Update DEVELOPMENT_GUIDE.md
- [ ] Add to CHANGELOG.md
- [ ] Document API endpoints
- [ ] Update README.md if needed

#### 6. Test Thoroughly

- [ ] Test happy path
- [ ] Test error cases
- [ ] Test edge cases
- [ ] Test with different user roles

---

## Questions?

If you have questions about contributing:

1. Check [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md) first
2. Search existing issues
3. Ask in discussions
4. Contact maintainers

---

**Thank you for contributing to Doodlea! 🎉**
