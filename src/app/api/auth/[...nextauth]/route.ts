import NextAuth, { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { Adapter } from 'next-auth/adapters'

const VALIDATION_INTERVAL = 1000 * 60 * 5 // 5 minutes

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as Adapter,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Invalid credentials')
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email,
          },
        })

        if (!user || !user.password) {
          throw new Error('Invalid credentials')
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        )

        if (!isPasswordValid) {
          throw new Error('Invalid credentials')
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/auth/sign-in',
    signOut: '/auth/sign-out',
    error: '/auth/error',
  },
  callbacks: {
    async jwt({ token, user, trigger }) {
      // Initial sign in
      if (user) {
        token.id = user.id
        token.email = user.email
        token.lastValidated = Date.now()
        
        // Get user slug and subscription status
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: {
            slug: true,
            subscriptions: {
              where: {
                status: { in: ['active', 'trialing'] },
              },
              take: 1,
            },
          },
        })
        
        token.slug = dbUser?.slug || null
        token.hasSubscription = (dbUser?.subscriptions.length || 0) > 0
        
        // Update lastValidated in database
        await prisma.user.update({
          where: { id: user.id },
          data: { lastValidated: new Date() },
        })
      }

      // Periodic validation to check if user still exists and subscription status
      const lastValidated = token.lastValidated as number
      const now = Date.now()
      
      if (now - lastValidated > VALIDATION_INTERVAL) {
        // Check if user still exists in database
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: {
            slug: true,
            subscriptions: {
              where: {
                status: { in: ['active', 'trialing'] },
              },
              take: 1,
            },
          },
        })

        if (!dbUser) {
          // User was deleted, invalidate session
          return null as any
        }

        // Update slug and subscription status
        token.slug = dbUser.slug || null
        token.hasSubscription = dbUser.subscriptions.length > 0

        // Update last validated timestamp
        token.lastValidated = now
        await prisma.user.update({
          where: { id: token.id as string },
          data: { lastValidated: new Date() },
        })
      }

      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.email = token.email as string
        session.user.slug = token.slug as string | null
        session.user.hasSubscription = token.hasSubscription as boolean
      }
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
