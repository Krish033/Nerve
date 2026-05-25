"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium rounded-md transition-colors disabled:opacity-50 disabled:pointer-events-none cursor-pointer focusable-element select-none",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary/90",
        outline:
          "border border-border bg-background text-foreground hover:bg-accent hover:text-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/70",
        ghost: "hover:bg-accent hover:text-foreground",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        link: "text-foreground underline-offset-4 hover:underline",
        theme:
          "bg-card border border-border text-foreground hover:bg-accent",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-10 px-6",
        icon: "h-9 w-9 p-0",
        xs: "h-7 px-2.5 text-xs",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  icon?: LucideIcon;
  iconPlacement?: "left" | "right";
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      icon: Icon,
      iconPlacement = "left",
      loading = false,
      children,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot.Root : "button";

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={loading || props.disabled}
        {...props}
      >
        {loading && (
          <div className="mr-2 h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent shrink-0" />
        )}
        {!loading && Icon && iconPlacement === "left" && (
          <Icon
            className={cn("h-3.5 w-3.5 shrink-0", children ? "mr-2" : "")}
          />
        )}
        {asChild ? <Slot.Slottable>{children}</Slot.Slottable> : children}
        {!loading && Icon && iconPlacement === "right" && (
          <Icon
            className={cn("h-3.5 w-3.5 shrink-0", children ? "ml-2" : "")}
          />
        )}
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
