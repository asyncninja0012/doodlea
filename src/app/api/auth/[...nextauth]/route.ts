/**
 * Next.js route handler for NextAuth.
 *
 * IMPORTANT: This file must ONLY export HTTP method handlers (GET, POST, etc.)
 * and the allowed Next.js route exports. Exporting anything else (e.g. authOptions)
 * causes a TypeScript build error.
 *
 * authOptions lives in src/lib/auth-options.ts — import from there instead.
 */
import { handler } from '@/lib/auth-options'

export { handler as GET, handler as POST }
