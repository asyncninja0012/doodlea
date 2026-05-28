import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'

export default async function Home() {
  const session = await getServerSession(authOptions)

  if (session?.user?.slug) {
    redirect(`/dashboard/${session.user.slug}`)
  }

  redirect('/auth/sign-in')
}
