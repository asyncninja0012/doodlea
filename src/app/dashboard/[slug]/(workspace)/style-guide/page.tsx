import type { MoodBoardImage } from '@/hooks/use-styles'
import { styleGuideQuery, MoodBoardImagesQuery } from './queries'
import { StyleGuide } from '@/redux/api/style-guide'
import StyleGuideContent from '@/components/style/style-guide-content'

type Props = {
    searchParams: Promise<{project: string}>
}

const page = async ({searchParams}: Props) => {
    const projectId = (await searchParams).project
    const existingStyleGuide = await styleGuideQuery(projectId)

    const guide = existingStyleGuide as unknown as StyleGuide

    const colorGuide = guide?.colorSections || []
    const typographyGuide = guide?.typographySections || []

    const existingMoodBoardImages = await MoodBoardImagesQuery(projectId) 

    const guideImages = existingMoodBoardImages as unknown as MoodBoardImage[]

    return (
        <StyleGuideContent
            guideImages={guideImages}
            colorGuide={colorGuide}
            typographyGuide={typographyGuide}
        />
    )
}

export default page