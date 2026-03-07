import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function POST() {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }

        // Return our own upload endpoint — the actual Uploadthing upload
        // happens server-side in the upload route.
        const uploadUrl = `/api/moodboard/upload`

        return NextResponse.json({ uploadUrl })
    } catch (error) {
        console.error('Error generating upload URL:', error)
        return NextResponse.json({ error: 'Failed to generate upload URL' }, { status: 500 })
    }
}
