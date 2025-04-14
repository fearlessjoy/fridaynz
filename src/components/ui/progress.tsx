import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "@/lib/utils"

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, ...props }, ref) => {
  // Determine the color based on progress value
  let progressColor = "bg-slate-600"; // Default
  
  if (value !== undefined) {
    if (value <= 0) {
      progressColor = "bg-slate-600"; // Todo 
    } else if (value <= 33) {
      progressColor = "bg-green-500"; // In Progress - light green
    } else if (value <= 66) {
      progressColor = "bg-green-600"; // Under Review - medium green
    } else {
      progressColor = "bg-green-800"; // Completed - dark green
    }
  }
  
  return (
    <ProgressPrimitive.Root
      ref={ref}
      className={cn(
        "relative h-4 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700",
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className={cn(
          "h-full w-full flex-1 transition-all duration-300 ease-in-out shadow-inner", 
          progressColor
        )}
        style={{ 
          transform: `translateX(-${100 - (value || 0)}%)`,
        }}
      />
    </ProgressPrimitive.Root>
  );
})
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }
