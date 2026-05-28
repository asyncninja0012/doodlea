import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const userId = session?.user?.id

        if (!userId) {
            throw new Error('Not authenticated')
        }

        const { projectId, storageId } = await req.json()

        const project = await prisma.project.findUnique({
            where: { id: projectId },
            select: { userId: true, inspirationImages: true },
        })

        if (!project) {
            throw new Error('Project not found')
        }

        if (project.userId !== userId) {
            throw new Error('Not authorized to modify this project')
        }

        const currentImages = project.inspirationImages || []

        if (currentImages.includes(storageId)) {
            return NextResponse.json({ success: true, message: 'Image already added' })
        }

        if (currentImages.length >= 6) {
            throw new Error('Maximum of 6 inspiration images allowed per project')
        }

        const updatedImages = [...currentImages, storageId]

        await prisma.project.update({
            where: { id: projectId },
            data: {
                inspirationImages: updatedImages,
                lastModified: new Date(),
            },
        })

        return NextResponse.json({ 
            success: true, 
            message: 'Inspiration image added successfully',
            totalImages: updatedImages.length 
        })
    } catch (error) {
        console.error('Error adding inspiration image:', error)
        return NextResponse.json({ error: (error as Error).message }, { status: 500 })
    }
}
