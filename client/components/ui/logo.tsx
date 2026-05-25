import * as React from "react"
import { cn } from "@/lib/utils"

interface LogoProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg"
}

export function Logo({ size = "md", className, ...props }: LogoProps) {
  const sizes = {
    sm: "h-6 w-6",
    md: "h-10 w-10",
    lg: "h-14 w-14",
  }

  const innerSizes = {
    sm: "h-2 w-2",
    md: "h-4 w-4",
    lg: "h-6 w-6",
  }

  return (
    <div 
      className={cn(
        "bg-black dark:bg-white rounded-xl flex items-center justify-center transition-transform hover:scale-110 duration-500",
        sizes[size],
        className
      )} 
      {...props}
    >
      <div className={cn("bg-white dark:bg-black rounded-sm rotate-45", innerSizes[size])} />
    </div>
  )
}


