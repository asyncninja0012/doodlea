'use client'

import { fetchProjectsSuccess } from "@/redux/slice/projects";
import { useAppDispatch } from "@/redux/store";
import { useEffect } from "react";

// Mirrors the ProjectSummary interface from the Redux slice
type ProjectSummary = {
    _id: string
    name: string
    projectNumber: number
    thumbnail?: string
    lastModified: number
    createdAt: number
    isPublic?: boolean
}

// Shape of the Prisma JsonValue wrapper passed from server components
type PrismaJsonValue = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _valueJSON?: any[]
}

type Props = {
    children?: React.ReactNode;
    initialProjects: PrismaJsonValue | null | undefined;
}

const ProjectsProvider = ({children, initialProjects}: Props) => {
    const dispatch = useAppDispatch()

    useEffect(() => {
        if(initialProjects?._valueJSON){
            const projectsData = initialProjects._valueJSON as ProjectSummary[]
            dispatch(
                fetchProjectsSuccess({
                    projects: projectsData,
                    total: projectsData.length,
                })
            )
        }
    }, [dispatch, initialProjects])

    return <>{children}</>
}

export default ProjectsProvider