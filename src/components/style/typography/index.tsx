import { Type, Info } from 'lucide-react'

type TypographyStyle = {
    name: string
    description?: string
    fontFamily: string
    fontSize: number | string
    fontWeight: number | string
    lineHeight: number | string
    letterSpacing?: number | string
}

type TypographySection = {
    title: string
    styles?: TypographyStyle[]
}

type Props = {
    typographyGuide: TypographySection[]
}

const StyleGuideTypography = ({ typographyGuide }: Props) => {
    const sections = Array.isArray(typographyGuide) ? typographyGuide : []
    return (
        <>
            {sections.length === 0 ? (
                <div className="text-center py-20">
                    <Type className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-medium text-foreground mb-2">
                        No typography generated yet
                    </h3>
                    <p className="text-sm text-muted-foreground mb-6">
                        Generate a style guide to see typography recommendations.
                    </p>
                </div>
            ) : (
                <div className="flex flex-col gap-10">
                    {sections.map((section, index) => (
                        <div
                            key={index}
                            className="flex flex-col gap-5"
                        >
                            <div>
                                <h3 className="text-lg font-medium text-foreground/50">
                                    {section.title}
                                </h3>
                            </div>
                            <div className='flex flex-col gap-10 mt-2'>
                                {section.styles?.map((style: TypographyStyle, styleIndex: number) => (
                                    <div key={styleIndex} className='flex flex-col gap-1'>
                                        <div className='flex flex-col gap-1'>
                                            <h4 className='text-sm font-medium text-foreground'>{style.name}</h4>
                                            {style.description && (
                                                <div className='flex items-center gap-1.5 text-xs text-muted-foreground'>
                                                    <span>{style.description}</span>
                                                    <Info className="w-3 h-3" />
                                                </div>
                                            )}
                                        </div>
                                        <div className='text-foreground mt-2' style={{
                                            fontFamily: style.fontFamily,
                                            fontSize: style.fontSize,
                                            fontWeight: style.fontWeight,
                                            lineHeight: style.lineHeight,
                                            letterSpacing: style.letterSpacing || 'normal',
                                        }}>
                                            The quick brown fox jumps over the lazy dog
                                        </div>
                                    </div>
                                ))}
                            </div> 
                        </div>
                    ))}
                </div>
            )}
        </>
    )
}

export default StyleGuideTypography