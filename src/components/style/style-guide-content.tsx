"use client"

import { useState } from 'react'
import type { MoodBoardImage } from '@/hooks/use-styles'
import type { StyleGuide } from '@/redux/api/style-guide'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Hash, LayoutIcon, Type, Palette } from 'lucide-react'
import { ThemeContent } from '@/components/style/theme'
import StyleGuideTypography from '@/components/style/typography'
import Moodboard from '@/components/style/mood-board'
import { cn } from '@/lib/utils'

const tabs = [
    { value: 'colours', label: 'Colours', icon: Hash },
    { value: 'typography', label: 'Typography', icon: Type },
    { value: 'moodboard', label: 'Moodboard', icon: LayoutIcon },
] as const

type Props = {
    guideImages: MoodBoardImage[]
    colorGuide: any[]
    typographyGuide: any[]
}

export default function StyleGuideContent({ guideImages, colorGuide, typographyGuide }: Props) {
    const [activeTab, setActiveTab] = useState('colours')

    return (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="mt-36 container mx-auto px-4 sm:px-6 py-6 sm:py-8">
                <div className="flex flex-col lg:flex-row gap-4 lg:gap-5 items-center justify-between">
                    <div>
                        <h1 className="text-3xl lg:text-left text-center font-bold text-foreground">
                            Style Guide
                        </h1>
                        <p className="text-muted-foreground mt-2 text-center lg:text-left">
                            Manage your style guide for your project.
                        </p>
                    </div>
                    <TabsList className="flex w-full sm:w-fit items-center rounded-full backdrop-blur-xl bg-white/[0.08] border border-white/[0.12] saturate-150 p-1">
                        {tabs.map((tab) => {
                            const Icon = tab.icon
                            return (
                                <TabsTrigger
                                    key={tab.value}
                                    value={tab.value}
                                    className="h-8 inline-flex items-center justify-center gap-2 rounded-full px-3 sm:px-4 data-[state=active]:bg-white/[0.15] data-[state=active]:backdrop-blur-xl data-[state=active]:border data-[state=active]:border-white/[0.2] transition-all duration-200 text-xs sm:text-sm"
                                >
                                    <Icon className="w-4 h-4" />
                                    <span className="hidden sm:inline">{tab.label}</span>
                                    <span className="sm:hidden">{tab.value}</span>
                                </TabsTrigger>
                            )
                        })}
                    </TabsList>
                </div>
            </div>

            <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
                {/* Colours tab */}
                <div className={cn(activeTab !== 'colours' && 'hidden')}>
                    {!guideImages.length ? (
                        <div className="space-y-8">
                            <div className="text-center py-20">
                                <div className="w-16 h-16 mx-auto mb-4 rounded-lg bg-muted flex items-center justify-center">
                                    <Palette className="w-8 h-8 text-muted-foreground" />
                                </div>
                                <h3 className="text-lg font-medium text-foreground mb-2">
                                    No colors generated yet
                                </h3>
                                <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
                                    Upload images to your mood board and generate an AI-powered style guide with colors and typography.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <ThemeContent colorGuide={colorGuide} />
                    )}
                </div>

                {/* Typography tab */}
                <div className={cn(activeTab !== 'typography' && 'hidden')}>
                    <StyleGuideTypography typographyGuide={typographyGuide} />
                </div>

                {/* Moodboard tab — always mounted, hidden via CSS */}
                <div className={cn(activeTab !== 'moodboard' && 'hidden')}>
                    <Moodboard guideImages={guideImages} />
                </div>
            </div>
        </Tabs>
    )
}
