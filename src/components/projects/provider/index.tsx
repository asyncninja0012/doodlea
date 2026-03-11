'use client'

import { loadProject } from "@/redux/slice/shapes";
import { restoreViewport } from "@/redux/slice/viewport";
import { useAppDispatch } from "@/redux/store";
import { useEffect } from "react";

type Props = {children: React.ReactNode; initialProject: any}

const ProjectsProvider = ({ children, initialProject }: Props) => {
    const dispatch = useAppDispatch();
    useEffect(() => {
        if(initialProject?.sketchesData){
            dispatch(loadProject(initialProject.sketchesData))

            if(initialProject.viewportData){
                dispatch(restoreViewport(initialProject.viewportData))
            }
        }
    },[dispatch, initialProject])

    return <>{children}</>
}

export default ProjectsProvider