"use client";

import { useInfiniteCanvas } from "@/hooks/use-canvas"
import TextSidebar from "./text-sidebar"
import ShapeRenderer from "./shapes";
import { cn } from "@/lib/utils";
import { RectanglePreview } from "./shapes/rectangle/preview";
import { FramePreview } from "./shapes/frame/preview";
import { ElipsePreview } from "./shapes/elipse/preview";
import { ArrowPreview } from "./shapes/arrow/preview";
import { LinePreview } from "./shapes/line/preview";
import { FreeDrawStrokePreview } from "./shapes/stroke/preview";
import { SelectionOverlay } from "./shapes/selection";

type Props = {

}

const InfiniteCanvas = (props: Props) => {
    const {
        viewport,
        shapes,
        currentTool,
        selectedShapes,
        onPointerDown,
        onPointerMove,
        onPointerUp,
        onPointerCancel,
        attachCanvasRef,
        getDraftShape,
        getFreeDrawPoints,
        isSidebarOpen,
        hasSelectedText,

    } = useInfiniteCanvas()

    const draftShape = getDraftShape()
    const freeDrawPoints = getFreeDrawPoints()

    return (
        <>
            <TextSidebar isOpen = {isSidebarOpen && hasSelectedText} />

            <div
                ref={attachCanvasRef}
                role="application"
                aria-label="Infinite Canvas"
                className={cn(
                    'relative w-full h-full overflow-hidden select-none z-0',
                    {
                        'cursor-grabbing': viewport.mode==='panning',
                        'cursor-grab': viewport.mode === 'shiftPanning',
                        'cursor-crosshair': currentTool !== 'select' && currentTool !== 'eraser' && viewport.mode === 'idle',
                        'cursor-default': currentTool === 'select' && viewport.mode === 'idle'
                    }
                )}
                style={{
                    touchAction: 'none',
                    cursor: currentTool === 'eraser' && viewport.mode === 'idle' ? 'cell' : undefined,
                }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerCancel}
                onContextMenu={(e)=>e.preventDefault()}
                draggable={false}
            >
                <div className='absolute origin-top-left pointer-events-none' style={{
                    transform: `translate3d(${viewport.translate.x}px, ${viewport.translate.y}px, 0) scale(${viewport.scale})`,
                    transformOrigin: '0 0',
                    willChange: 'transform'
                }}>
                    {shapes.map((shape)=>(
                        <ShapeRenderer
                            key={shape.id}
                            shape={shape}
                            // toggleInspiration={toggleInspiration}
                            // toggleChat={toggleChat}
                            // generateWorkflow={generateWorkflow}
                            // exportDesign={exportDesign}
                        >


                        </ShapeRenderer>
                    ))}

                    {shapes.map((shape) => (
                        <SelectionOverlay key={`selection-${shape.id}`} shape={shape} isSelected={!!selectedShapes[shape.id]} />
                    ))}

                     {draftShape && draftShape.type==='frame' && (
                        <FramePreview startWorld={draftShape.startWorld} currentWorld={draftShape.currentWorld} />
                    )}

                    {draftShape && draftShape.type==='rect' && (
                        <RectanglePreview startWorld={draftShape.startWorld} currentWorld={draftShape.currentWorld} />
                    )}

                     {draftShape && draftShape.type==='ellipse' && (
                        <ElipsePreview startWorld={draftShape.startWorld} currentWorld={draftShape.currentWorld} />
                    )}

                     {draftShape && draftShape.type==='arrow' && (
                        <ArrowPreview startWorld={draftShape.startWorld} currentWorld={draftShape.currentWorld} />
                    )}

                     {draftShape && draftShape.type==='line' && (
                        <LinePreview startWorld={draftShape.startWorld} currentWorld={draftShape.currentWorld} />
                    )}

                    {currentTool === 'freedraw' && freeDrawPoints.length > 1 && (
                        <FreeDrawStrokePreview points = {freeDrawPoints} />
                    )}

                </div>
            </div>
        </>
    )
    
}

export default InfiniteCanvas