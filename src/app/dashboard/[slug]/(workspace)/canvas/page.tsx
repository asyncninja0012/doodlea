import ProjectsProvider from '@/components/projects/provider'
import { ProjectQuery } from './queries'
import InfiniteCanvas from '@/components/canvas'

interface CanvasPageProps {
  searchParams: Promise<{project?: string}>
}

const Page = async ({ searchParams }: CanvasPageProps) => {
  const params = await searchParams

  const projectId = params.project
  if(!projectId) {
    return (
      <div className='w-full h-screen flex items-center justify-center'>
        <p className="text-muted-foreground">
          No Project Selected
        </p>
      </div>
    )
  }
 
  const {project, profile} = await ProjectQuery(projectId);
  if(!profile){
    return (
      <div className='w-full h-screen flex items-center justify-center'>
        <p className='text-muted-foreground'>Authentication Required</p>
      </div>
    )
  }

  if(!project){
    return (
      <div className='w-full h-screen flex items-center justify-center'>
        <p className='text-red-500'>Project not found or access denied</p>
      </div>
    )
  }
  return(
    <ProjectsProvider initialProject={project}>
      <InfiniteCanvas />
    </ProjectsProvider>
  )
}

export default Page