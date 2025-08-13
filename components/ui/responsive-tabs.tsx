"use client"

import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const ResponsiveTabs = TabsPrimitive.Root

const ResponsiveTabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, children, ...props }, ref) => {
  const scrollContainerRef = React.useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = React.useState(false)
  const [canScrollRight, setCanScrollRight] = React.useState(false)
  const [isOverflowing, setIsOverflowing] = React.useState(false)

  const checkOverflow = React.useCallback(() => {
    const container = scrollContainerRef.current
    if (container) {
      const isOverflowingNow = container.scrollWidth > container.clientWidth
      setIsOverflowing(isOverflowingNow)
      setCanScrollLeft(container.scrollLeft > 0)
      setCanScrollRight(
        container.scrollLeft < container.scrollWidth - container.clientWidth
      )
    }
  }, [])

  React.useEffect(() => {
    const container = scrollContainerRef.current
    if (container) {
      checkOverflow()
      
      const resizeObserver = new ResizeObserver(checkOverflow)
      resizeObserver.observe(container)
      
      container.addEventListener('scroll', checkOverflow)
      window.addEventListener('resize', checkOverflow)

      return () => {
        resizeObserver.disconnect()
        container.removeEventListener('scroll', checkOverflow)
        window.removeEventListener('resize', checkOverflow)
      }
    }
  }, [checkOverflow])

  const scrollLeft = () => {
    const container = scrollContainerRef.current
    if (container) {
      container.scrollBy({ left: -200, behavior: 'smooth' })
    }
  }

  const scrollRight = () => {
    const container = scrollContainerRef.current
    if (container) {
      container.scrollBy({ left: 200, behavior: 'smooth' })
    }
  }

  return (
    <div className="relative">
      {isOverflowing && (
        <>
          {canScrollLeft && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 p-0 bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20"
              onClick={scrollLeft}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
          {canScrollRight && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 p-0 bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20"
              onClick={scrollRight}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </>
      )}
      
      <div 
        ref={scrollContainerRef}
        className={cn(
          "overflow-x-auto scrollbar-hide",
          isOverflowing && "px-10"
        )}
        style={{ 
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }}
      >
        <TabsPrimitive.List
          ref={ref}
          className={cn(
            "inline-flex h-10 items-center justify-center rounded-md bg-white/6 backdrop-blur-md border border-white/15 p-1 text-white min-w-max",
            className
          )}
          {...props}
        >
          {children}
        </TabsPrimitive.List>
      </div>
      
      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  )
})
ResponsiveTabsList.displayName = TabsPrimitive.List.displayName

const ResponsiveTabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-white/15 data-[state=active]:text-white data-[state=active]:shadow-sm text-white/80 hover:text-white hover:bg-white/10 min-w-max",
      className
    )}
    {...props}
  />
))
ResponsiveTabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const ResponsiveTabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className
    )}
    {...props}
  />
))
ResponsiveTabsContent.displayName = TabsPrimitive.Content.displayName

export { ResponsiveTabs, ResponsiveTabsList, ResponsiveTabsTrigger, ResponsiveTabsContent }
