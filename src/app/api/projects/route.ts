import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { thumbnail, name: requestedName, sketchesData } = body

    // Get or create the project counter for this user
    const counter = await prisma.projectCounter.upsert({
      where: { userId: session.user.id },
      update: { nextProjectNumber: { increment: 1 } },
      create: { userId: session.user.id, nextProjectNumber: 2 },
    })

    const projectNumber = counter.nextProjectNumber - 1 || 1
    const name = requestedName || `Project ${projectNumber}`

    // Default sketchesData if not provided (matches Redux shapes initial state)
    const defaultSketchesData = { shapes: {}, tool: 'select', selected: {}, frameCounter: 0 }

    const project = await prisma.project.create({
      data: {
        userId: session.user.id,
        name,
        projectNumber,
        thumbnail: thumbnail || null,
        sketchesData: sketchesData || defaultSketchesData,
        viewportData: { scale: 1, translate: { x: 0, y: 0 } },
        moodBoardImages: [],
        inspirationImages: [],
        tags: [],
      },
    })

    return NextResponse.json(project, { status: 201 })
  } catch (error) {
    console.error('Error creating project:', error)
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const projects = await prisma.project.findMany({
      where: { userId: session.user.id },
      select: {
        id: true,
        name: true,
        projectNumber: true,
        thumbnail: true,
        lastModified: true,
        createdAt: true,
        isPublic: true,
      },
      orderBy: { lastModified: 'desc' },
    })

    return NextResponse.json({ projects, total: projects.length })
  } catch (error) {
    console.error('Error fetching projects:', error)
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 })
  }
}
