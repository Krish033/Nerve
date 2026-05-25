"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface HeadingProps {
  title: string;
  description?: string;
  className?: string;
  titleClassName?: string;
}

export const Heading: React.FC<HeadingProps> = ({
  title,
  description,
  className,
  titleClassName,
}) => {
  return (
    <div className={cn("space-y-1 mb-6", className)}>
      <h1 className={cn("text-xl font-semibold tracking-tight text-foreground", titleClassName)}>
        {title}
      </h1>
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
    </div>
  );
};
