import 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      image?: string | null
      slug?: string | null
      hasSubscription?: boolean
    }
  }

  interface User {
    id: string
    email: string
    name?: string | null
    image?: string | null
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    email: string
    lastValidated: number
    slug?: string | null
    hasSubscription?: boolean
  }
}
