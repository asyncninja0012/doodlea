'use client'

import { CircleQuestionMark, Hash, LayoutTemplate, User, Zap } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '../ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'
import { useAppSelector } from '@/redux/store'
import CreateProject from '../buttons/project'
import AutoSave from '../canvas/autosave'

type TabProps = {
    label: string
    href: string
    icon?: React.ReactNode;
}


type props = Record<string, never>

function CreditsDisplay({ slug }: { slug: string | null }) {
    const [credits, setCredits] = useState<number | null>(null)

    useEffect(() => {
        if (!slug) return

        const fetchCredits = () => {
            fetch('/api/subscriptions/credits', { cache: 'no-store' })
                .then(r => r.ok ? r.json() : null)
                .then(d => { if (d && typeof d.creditsBalance === 'number') setCredits(Math.floor(d.creditsBalance)) })
                .catch(() => {})
        }

        fetchCredits()

        window.addEventListener('credits-consumed', fetchCredits)
        return () => window.removeEventListener('credits-consumed', fetchCredits)
    }, [slug])

    const handleManageBilling = async () => {
        try {
            const res = await fetch('/api/subscriptions/portal')
            const data = await res.json()
            if (data.portalUrl) window.open(data.portalUrl, '_blank')
        } catch {}
    }

    if (credits === null) return null

    return (
        <button
            onClick={handleManageBilling}
            title="Manage billing"
            className='flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.10] hover:bg-white/[0.10] transition-colors'
        >
            <Zap className='w-3.5 h-3.5 text-violet-400' />
            <span className='text-xs font-semibold text-white/70'>{credits}</span>
            <span className='text-xs text-white/30'>credits</span>
        </button>
    )
}

const Navbar = (_props: props) => {
    const params = useSearchParams()
    const pathname = usePathname();
    const hasCanvas = pathname.includes('canvas');
    const hasStyleGuide = pathname.includes('style-guide');
    const projectId = params.get('project')
    const [projectName, setProjectName] = useState<string | null>(null)

    const me = useAppSelector((state) => state.profile)

    useEffect(() => {
        if (!projectId) return

        const fetchProject = async () => {
            try {
                const res = await fetch(`/api/projects/${projectId}`)
                if (res.ok) {
                    const data = await res.json()
                    setProjectName(data.name)
                }
            } catch (error) {
                console.error('Failed to fetch project:', error)
            }
        }

        fetchProject()
    }, [projectId])

    const tabs: TabProps[] = [{
        label: 'Canvas',
        href: `/dashboard/${me.slug}/canvas?project=${projectId}`,
        icon: <Hash className='w-4 h-4' />
    },

    {
        label: 'Style Guide',
        href: `/dashboard/${me.slug}/style-guide?project=${projectId}`,
        icon: <LayoutTemplate className='w-4 h-4' />
    }

    ]


    return (
        <div className='grid grid-cols-2 lg:grid-cols-3 p-6 fixed top-0 left-0 right-0 z-50'>
            <div className='flex items-center gap-4'>
                <Link href={`/dashboard/${me.slug}`} className='w-8 h-8 rounded-full border-3 border-white bg-black flex items-center justify-center'>
                    <div className='w-4 h-4 rounded-full bg-white'>

                    </div>
                </Link>
                {!hasCanvas || (!hasStyleGuide && (
                    <div className='lg:inline block-hidden rounded-full text-primary/60 border border-white/[0.12] backdrop-blur-xl bg-white/[0.08] px-4 py-2 text-sm saturate-150'>
                        Project / {projectName ?? 'Loading...'}
                    </div>
                ))}
            </div>

            <div className='lg:flex hidden items-center justify-center gap-2'>
                <div className='flex items-center gap-2 background-blur-xl bg-white/[0.08] border border-white/[0.12] rounded-full p-2 saturate-150'>
                    {tabs.map((t) => (
                        <Link
                            key={t.href}
                            href={t.href}
                            className={[
                                'group inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm transition',
                                `${pathname}?project=${projectId}` === t.href ? 'bg-white/[0.12] text-white border border-white/[0.16] backdrop-blur-sm' : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06] border border-transparent',].join(' ')}
                        >
                            <span className={`${pathname}?project=${projectId}` === t.href ? 'opacity-100' : 'opacity-70 group-hover:opacity-90'}>
                                {t.icon}
                            </span>
                            <span>{t.label}</span>
                        </Link>
                    ))}

                </div>
            </div>
            <div className='flex items-center gap-4 justify-end ml-auto'>
                <CreditsDisplay slug={me.slug} />
                <Button variant='secondary' className='rounded-full h-12 w-12 flex items-center justify-center backdrop-blur-xl bg-white/[0.08] border border-white/[0.12] saturate-150 hover:bg-white/[0.12]'>
                    <CircleQuestionMark className='size-5 text-white' />
                </Button>
                <Avatar className='size-12'>
                    {me.image && <AvatarImage src={me.image} />}
                    <AvatarFallback>
                        <User className='size-5' />

                    </AvatarFallback>
                </Avatar>

                {hasCanvas && <AutoSave />}
                {!hasCanvas && !hasStyleGuide && <CreateProject />}
            </div>
        </div>
    )
}

export default Navbar