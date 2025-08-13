"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ResponsiveGridProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  minItemWidth?: number
  gap?: number
  enableSlider?: boolean
}

export function ResponsiveGrid({ 
  children, 
  className, 
  minItemWidth = 280, 
  gap = 16,
  enableSlider = true,
  ...props 
}: ResponsiveGridProps) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [isOverflowing, setIsOverflowing] = React.useState(false)
  const [canScrollLeft, setCanScrollLeft] = React.useState(false)
  const [canScrollRight, setCanScrollRight] = React.useState(false)

  const checkOverflow = React.useCallback(() => {
    const container = containerRef.current
    if (container && enableSlider) {
      const containerWidth = container.clientWidth
      const contentWidth = container.scrollWidth
      const isOverflowingNow = contentWidth > containerWidth
      
      setIsOverflowing(isOverflowingNow)
      setCanScrollLeft(container.scrollLeft > 0)
      setCanScrollRight(
        container.scrollLeft < contentWidth - containerWidth
      )
    }
  }, [enableSlider])

  React.useEffect(() => {
    const container = containerRef.current
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
    const container = containerRef.current
    if (container) {
      container.scrollBy({ left: -minItemWidth, behavior: 'smooth' })
    }
  }

  const scrollRight = () => {
    const container = containerRef.current
    if (container) {
      container.scrollBy({ left: minItemWidth, behavior: 'smooth' })
    }
  }

  return (
    <div className="relative">
      {enableSlider && isOverflowing && (
        <>
          {canScrollLeft && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 h-10 w-10 p-0 bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 shadow-lg"
              onClick={scrollLeft}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          )}
          {canScrollRight && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 h-10 w-10 p-0 bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 shadow-lg"
              onClick={scrollRight}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          )}
        </>
      )}
      
      <div
        ref={containerRef}
        className={cn(
          "grid auto-cols-max gap-4 overflow-x-auto scrollbar-hide pb-4",
          enableSlider ? "grid-flow-col" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
          className
        )}
        style={{
          gridTemplateColumns: enableSlider ? `repeat(auto-fit, minmax(${minItemWidth}px, 1fr))` : undefined,
          gap: `${gap}px`,
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }}
        {...props}
      >
        {children}
      </div>
      
      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  )
}

interface ResponsiveCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function ResponsiveCard({ children, className, ...props }: ResponsiveCardProps) {
  return (
    <div
      className={cn(
        "bg-white/6 backdrop-blur-md border border-white/15 rounded-lg p-4 shadow-lg hover:bg-white/8 transition-all duration-200 min-w-0 flex-shrink-0",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
