import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

type StoredImage = { storageId: string; url: string }

export const MoodBoardImagesQuery = async (projectId: string) => {
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id

    if (!userId) return []

    const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { userId: true, moodBoardImages: true },
    })

    if (!project || project.userId !== userId) return []

    const raw = project.moodBoardImages
    const stored: StoredImage[] = Array.isArray(raw) ? (raw as StoredImage[]) : []

    return stored.map((item, index) => ({
        id: `ut-${item.storageId}`,
        storageId: item.storageId,
        url: item.url,
        preview: item.url,
        uploaded: true,
        uploading: false,
        isFromServer: true,
        index,
    }))
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
