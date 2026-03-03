import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import { ProfileState } from '@/redux/slice/profile'

export async function getPreloadedProfile(): Promise<ProfileState | null> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return null

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      slug: true,
      createdAt: true,
      subscriptions: {
        where: { status: 'active' },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: {
          planCode: true,
          creditsBalance: true,
        },
      },
    },
  })

  if (!user) return null

  const activeSub = user.subscriptions[0] ?? null

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
    slug: user.slug,
    hasSubscription: !!activeSub,
    credits: activeSub?.creditsBalance ?? 0,
    plan: activeSub?.planCode ?? null,
    createdAt: user.createdAt.toISOString(),
  }
}
