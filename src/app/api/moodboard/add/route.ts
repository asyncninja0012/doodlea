import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

type StoredImage = { storageId: string; url: string }

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const userId = session?.user?.id

        if (!userId) {
            throw new Error('Not authenticated')
        }

        const { projectId, storageId, url } = await req.json()

        // Get the project and verify ownership
        const project = await prisma.project.findUnique({
            where: { id: projectId },
            select: { userId: true, moodBoardImages: true },
        })

        if (!project) {
            throw new Error('Project not found')
        }

        if (project.userId !== userId) {
            throw new Error('Access denied')
        }

        const raw = project.moodBoardImages
        const currentImages: StoredImage[] = Array.isArray(raw) ? (raw as StoredImage[]) : []

        if (currentImages.length >= 5) {
            throw new Error('Maximum 5 mood board images allowed')
        }

        const updatedImages: StoredImage[] = [...currentImages, { storageId, url }]

        await prisma.project.update({
            where: { id: projectId },
            data: {
                moodBoardImages: updatedImages,
                lastModified: new Date(),
            },
        })

        return NextResponse.json({ success: true, imageCount: updatedImages.length })
    } catch (error) {
        console.error('Error adding mood board image:', error)
        return NextResponse.json({ error: (error as Error).message }, { status: 500 })
    }
}
