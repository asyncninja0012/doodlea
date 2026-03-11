import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const polylineBox = (
    points: ReadonlyArray<{x: number, y: number}>,
) => {
  let minX = Infinity,
   maxX = -Infinity,
   minY = Infinity,
   maxY = -Infinity;

  for(let i=0; i<points.length; i++){
    const {x,y} = points[i]
    if(x < minX) minX = x
    if(y< minY) minY = y
    if(x > maxX) maxX = x
    if(y > maxY) maxY = y 
  }

  return {minX, minY, maxX, maxY, width: maxX-minX, height: maxY-minY}
}