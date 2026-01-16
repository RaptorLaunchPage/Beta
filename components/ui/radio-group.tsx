import * as React from "react"
import { cn } from "@/lib/utils"

const RadioGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return <div className={cn("grid gap-2", className)} ref={ref} {...props} />
})
RadioGroup.displayName = "RadioGroup"

const RadioGroupItem = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { checked?: boolean; onCheckedChange?: (checked: boolean) => void }
>(({ className, children, checked, onCheckedChange, onClick, ...props }, ref) => {
  return (
    <button
        type="button"
        role="radio"
        aria-checked={checked}
        ref={ref}
        className={cn(
            "aspect-square h-4 w-4 rounded-full border border-primary text-primary shadow focus:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
            className
        )}
        onClick={(e) => {
            if (onClick) onClick(e);
            if (onCheckedChange) onCheckedChange(true);
        }}
        {...props}
    >
        {checked && (
            <span className="flex items-center justify-center">
                <span className="h-2.5 w-2.5 rounded-full bg-current" />
            </span>
        )}
    </button>
  )
})
RadioGroupItem.displayName = "RadioGroupItem"

export { RadioGroup, RadioGroupItem }
