import { prisma } from './prisma'

/**
 * Generate a unique slug from name with random alphanumeric suffix
 * Example: "John Doe" -> "john-doe-a7x9k2"
 */
export function generateSlug(name: string, email: string): string {
  // Clean the name or use email username as fallback
  let baseName = name?.trim() || email.split('@')[0]
  
  // Convert to lowercase, replace spaces with hyphens, remove special chars
  baseName = baseName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  
  // Generate random 6-character alphanumeric suffix
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let suffix = ''
  for (let i = 0; i < 6; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  
  return `${baseName}-${suffix}`
}

/**
 * Get slug for a user by ID
 */
export async function getUserSlugById(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { slug: true },
  })

  return user?.slug || null
}

/**
 * Verify if the slug matches the current user
 */
export async function verifyUserSlug(userId: string, slug: string): Promise<boolean> {
  const actualSlug = await getUserSlugById(userId)
  return actualSlug === slug
}

/**
 * Check if slug already exists
 */
export async function slugExists(slug: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { slug },
  })
  return !!user
}
