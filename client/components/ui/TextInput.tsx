"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

const TextInput = React.forwardRef<HTMLInputElement, TextInputProps>(
  ({ className, type, label, error, icon, ...props }, ref) => {
    return (
      <div className="w-full space-y-2">
        {label && (
          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none [&_svg]:h-4 [&_svg]:w-4">
              {icon}
            </div>
          )}

          <input
            type={type}
            className={cn(
              "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground transition-colors placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
              icon && "pl-9",
              error && "border-destructive focus-visible:ring-destructive",
              className
            )}
            ref={ref}
            {...props}
          />
        </div>
        
        {error && (
          <p className="text-xs font-medium text-destructive">
            {error}
          </p>
        )}
      </div>
    );
  }
);
TextInput.displayName = "TextInput";

export { TextInput };
