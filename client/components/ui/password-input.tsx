"use client"

import * as React from "react"
import { TextInput } from "@/components/ui/TextInput"
import { Eye, EyeOff } from "lucide-react"
import { cn } from "@/lib/utils"

type PasswordInputProps = React.ComponentProps<"input">

const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, ...props }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false)

    return (
      <div className="relative group">
        <TextInput
          type={showPassword ? "text" : "password"}
          className={cn("pr-10", className)}
          ref={ref}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/30 hover:text-primary transition-colors outline-none z-20 group-focus-within:text-muted-foreground/50"
          tabIndex={-1}
        >
          {showPassword ? (
            <EyeOff className="size-4" strokeWidth={2.5} />
          ) : (
            <Eye className="size-4" strokeWidth={2.5} />
          )}
        </button>
      </div>
    )
  }
)
PasswordInput.displayName = "PasswordInput"

export { PasswordInput }


