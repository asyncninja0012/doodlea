import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import { getPreloadedProfile } from '@/lib/profile'

export const ProjectQuery = async (projectId: string) => {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id

  const profile = await getPreloadedProfile()

  if (!profile?.id || !userId || !projectId) {
    return { project: null, profile: null }
  }

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      userId,
    },
  })

  if (!project) {
    return { project: null, profile }
  }

  return { project, profile }
}
