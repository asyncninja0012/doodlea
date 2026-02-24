import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  })

  const isAuthPage = request.nextUrl.pathname.startsWith('/auth')
  const isBillingPage = request.nextUrl.pathname.startsWith('/billing')
  const isDashboard = request.nextUrl.pathname.startsWith('/dashboard')

  // If user is not logged in and trying to access protected routes
  if (!token && (isDashboard || isBillingPage)) {
    return NextResponse.redirect(new URL('/auth/sign-in', request.url))
  }

  // If user is logged in and trying to access auth pages, redirect to appropriate page
  if (token && isAuthPage) {
    const hasSubscription = token.hasSubscription as boolean
    const userSlug = token.slug as string | null
    
    if (!userSlug) {
      // If user doesn't have a slug (old user), create one or handle appropriately
      return NextResponse.redirect(new URL('/auth/error', request.url))
    }
    
    if (hasSubscription) {
      return NextResponse.redirect(new URL(`/dashboard/${userSlug}`, request.url))
    } else {
      return NextResponse.redirect(new URL(`/billing/${userSlug}`, request.url))
    }
  }

  // If user is logged in, verify they're accessing their own slug
  if (token && (isDashboard || isBillingPage)) {
    const userSlug = token.slug as string | null
    
    if (!userSlug) {
      return NextResponse.redirect(new URL('/auth/sign-in', request.url))
    }
    
    const pathParts = request.nextUrl.pathname.split('/')
    const slugInUrl = pathParts[2] // /dashboard/{slug} or /billing/{slug}

    // If slug doesn't match, redirect to correct URL
    if (slugInUrl && slugInUrl !== userSlug) {
      const newPath = `/${pathParts[1]}/${userSlug}`
      return NextResponse.redirect(new URL(newPath, request.url))
    }

    // If user doesn't have subscription and trying to access dashboard
    const hasSubscription = token.hasSubscription as boolean
    if (isDashboard && !hasSubscription) {
      return NextResponse.redirect(new URL(`/billing/${userSlug}`, request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/billing/:path*', '/auth/:path*'],
}
