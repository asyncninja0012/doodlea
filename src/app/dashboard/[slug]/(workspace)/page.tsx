'use client'

import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAppDispatch, useAppSelector } from '@/redux/store'
import { fetchProjectsStart, fetchProjectsSuccess, fetchProjectsFailure } from '@/redux/slice/projects'
import ProjectsProvider from '@/components/projects/list/provider'
import ProjectsList from '@/components/projects'

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const dispatch = useAppDispatch()
  const [isValidating, setIsValidating] = useState(true)

  const slug = params.slug as string
  const profile = useAppSelector((state) => state.profile)
  const projectsState = useAppSelector((state) => state.projects)

  useEffect(() => {
    if (status === 'loading') return

    if (!session?.user) {
      router.push('/auth/sign-in')
      return
    }

    const userSlug = session.user.slug
    if (!userSlug) {
      router.push('/auth/sign-in')
      return
    }

    if (slug !== userSlug) {
      router.push(`/dashboard/${userSlug}`)
      return
    }

    setIsValidating(false)

    if (!session.user.hasSubscription) {
      router.push(`/billing/${userSlug}`)
    }
  }, [session, status, slug, router])

  // Fetch projects on mount
  useEffect(() => {
    if (isValidating || !session?.user?.id) return

    const fetchProjects = async () => {
      dispatch(fetchProjectsStart())
      try {
        const res = await fetch('/api/projects')
        if (!res.ok) throw new Error('Failed to fetch projects')
        const data = await res.json()
        dispatch(fetchProjectsSuccess({
          projects: data.projects.map((p: { id: string; name: string; projectNumber: number; thumbnail?: string; lastModified: string; createdAt: string; isPublic?: boolean }) => ({
            _id: p.id,
            name: p.name,
            projectNumber: p.projectNumber,
            thumbnail: p.thumbnail,
            lastModified: new Date(p.lastModified).getTime(),
            createdAt: new Date(p.createdAt).getTime(),
            isPublic: p.isPublic ?? false,
          })),
          total: data.total,
        }))
      } catch (error) {
        dispatch(fetchProjectsFailure(error instanceof Error ? error.message : 'Failed to fetch projects'))
      }
    }

    fetchProjects()
  }, [isValidating, session?.user?.id, dispatch])

  if (status === 'loading' || isValidating) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  const { projects } = projectsState

  if(!profile){
    return (
      <div className='container mx-auto py-8'>
        <div className='text-center'>
          <h1 className='text-2xl font-bold text-foreground mb-4'>Authentication Required</h1>
          <p className='text-muted-foreground'>Please signin to view your Projects</p>
        </div>
      </div>
    )
  }

  return (
    <ProjectsProvider initialProjects={projects}>
      <div className='container mx-auto py-36'>
        <ProjectsList />
      </div>
    </ProjectsProvider>
  ) 
}
