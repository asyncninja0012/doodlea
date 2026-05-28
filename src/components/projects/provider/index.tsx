'use client'

import { loadProject } from "@/redux/slice/shapes";
import { restoreViewport } from "@/redux/slice/viewport";
import { useAppDispatch } from "@/redux/store";
import { useEffect } from "react";

type InitialProject = {
    sketchesData?: unknown
    viewportData?: unknown
}

type Props = {children: React.ReactNode; initialProject: InitialProject | null | undefined}

const ProjectsProvider = ({ children, initialProject }: Props) => {
    const dispatch = useAppDispatch();
    useEffect(() => {
        if(initialProject?.sketchesData){
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            dispatch(loadProject(initialProject.sketchesData as any))

            if(initialProject.viewportData){
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                dispatch(restoreViewport(initialProject.viewportData as any))
            }
        }
    },[dispatch, initialProject])

    return <>{children}</>
}

export default ProjectsProvider