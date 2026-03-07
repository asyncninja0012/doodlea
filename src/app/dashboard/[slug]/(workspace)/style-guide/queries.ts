import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import { utapi } from '@/lib/uploadthing'

export const MoodBoardImagesQuery = async (projectId: string) => {
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id

    if (!userId) return []

    const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { userId: true, moodBoardImages: true },
    })

    if (!project || project.userId !== userId) return []

    const storageIds = project.moodBoardImages ?? []

    const images = await Promise.all(
        storageIds.map(async (storageId, index) => {
            try {
                // Resolve the Uploadthing file key → CDN URL
                const urlResult = await utapi.getFileUrls(storageId)
                const url = urlResult.data[0]?.url
                if (!url) return null

                return {
                    id: `ut-${storageId}`,
                    storageId,
                    url,
                    uploaded: true,
                    uploading: false,
                    index,
                }
            } catch (error) {
                console.error(`Failed to resolve URL for key ${storageId}:`, error)
                return null
            }
        })
    )

    return images
        .filter((image) => image !== null)
        .sort((a, b) => a!.index - b!.index)
}

export const styleGuideQuery = async (projectId: string) => {
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id

    if (!userId) throw new Error('Not authenticated')

    const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { styleGuide: true, userId: true, isPublic: true },
    })

    if (!project) throw new Error('Project not found')

    if (project.userId !== userId && !project.isPublic) {
        throw new Error('Access denied')
    }

    return project.styleGuide ? JSON.parse(project.styleGuide) : null
}
