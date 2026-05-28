import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const userId = session?.user?.id

        if (!userId) throw new Error('Not authenticated')

        const url = new URL(req.url)
        const projectId = url.searchParams.get('projectId')

        if (!projectId) throw new Error('Project ID is required')

        const project = await prisma.project.findUnique({
            where: { id: projectId },
            select: { userId: true, inspirationImages: true },
        })

        if (!project) throw new Error('Project not found')
        if (project.userId !== userId) throw new Error('Not authorized to view this project')

        const storageIds = project.inspirationImages || []

        const images = storageIds.map((storageId, index) => ({
            id: `inspiration-${storageId}`,
            storageId,
            url: `https://utfs.io/f/${storageId}`,
            preview: `https://utfs.io/f/${storageId}`,
            uploaded: true,
            uploading: false,
            isFromServer: true,
            index,
        }))

        return NextResponse.json(images)
    } catch (error) {
        console.error('Error fetching inspiration images:', error)
        return NextResponse.json({ error: (error as Error).message }, { status: 500 })
    }
}
