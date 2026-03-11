import HistoryPill from "./history"
import ToolbarShapes from "./shapes"
import ZoomBar from "./zoom"

const Toolbar = () => {
    return (
        <div className='fixed bottom-0 w-full grid grid-cols-3 z-50 p-5'>
            <HistoryPill />
            <ToolbarShapes />
            <ZoomBar />
            
        </div>
    )
}

export default Toolbar