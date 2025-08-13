"use client"

import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { GLOBAL_THEME } from "@/lib/global-theme"

export interface TabItem {
  value: string
  label: string
  icon?: React.ComponentType<{ className?: string }>
  badge?: string | number
  disabled?: boolean
  hidden?: boolean
}

export interface ResponsiveTabsProps {
  tabs: TabItem[]
  defaultValue?: string
  value?: string
  onValueChange?: (value: string) => void
  className?: string
  variant?: 'default' | 'pills' | 'underline' | 'cards'
  size?: 'sm' | 'md' | 'lg'
  orientation?: 'horizontal' | 'vertical'
  responsiveMode?: 'scroll' | 'dropdown' | 'stack' | 'auto'
  showIcons?: boolean
  showBadges?: boolean
  allowOverflow?: boolean
  children?: React.ReactNode
}

// Base Enhanced Tabs Components
const Tabs = TabsPrimitive.Root

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-4 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      "animate-in fade-in-50 duration-200",
      className
    )}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

// Enhanced Responsive Tabs Component
export function ResponsiveTabs({
  tabs,
  defaultValue,
  value,
  onValueChange,
  className,
  variant = 'default',
  size = 'md',
  orientation = 'horizontal',
  responsiveMode = 'auto',
  showIcons = true,
  showBadges = true,
  allowOverflow = false,
  children,
  ...props
}: ResponsiveTabsProps) {
  const [activeTab, setActiveTab] = React.useState(defaultValue || tabs[0]?.value || '')
  const [canScrollLeft, setCanScrollLeft] = React.useState(false)
  const [canScrollRight, setCanScrollRight] = React.useState(false)

  const scrollContainerRef = React.useRef<HTMLDivElement>(null)
  const tabsListRef = React.useRef<HTMLDivElement>(null)

  const currentValue = value || activeTab
  const visibleTabs = tabs.filter(tab => !tab.hidden)

  // Check if we need responsive behavior
  const [needsResponsive, setNeedsResponsive] = React.useState(false)

  React.useEffect(() => {
    const checkOverflow = () => {
      if (tabsListRef.current && scrollContainerRef.current) {
        const container = scrollContainerRef.current
        const tabsList = tabsListRef.current
        
        const containerWidth = container.clientWidth
        const tabsWidth = tabsList.scrollWidth
        
        setNeedsResponsive(tabsWidth > containerWidth)
        setCanScrollLeft(container.scrollLeft > 0)
        setCanScrollRight(container.scrollLeft < tabsWidth - containerWidth)
      }
    }

    checkOverflow()
    window.addEventListener('resize', checkOverflow)
    
    return () => window.removeEventListener('resize', checkOverflow)
  }, [tabs])

  const handleValueChange = (newValue: string) => {
    setActiveTab(newValue)
    onValueChange?.(newValue)
  }

  const scrollTabs = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 200
      const newScrollLeft = scrollContainerRef.current.scrollLeft + 
        (direction === 'left' ? -scrollAmount : scrollAmount)
      
      scrollContainerRef.current.scrollTo({
        left: newScrollLeft,
        behavior: 'smooth'
      })
    }
  }

  const getVariantStyles = () => {
    const baseStyles = {
      default: {
        container: `${GLOBAL_THEME.glassmorphic.subtle} rounded-lg p-1`,
        trigger: `${GLOBAL_THEME.buttons.ghost} data-[state=active]:${GLOBAL_THEME.glassmorphic.interactive}`,
      },
      pills: {
        container: "bg-transparent",
        trigger: `${GLOBAL_THEME.buttons.outline} data-[state=active]:${GLOBAL_THEME.buttons.primary}`,
      },
      underline: {
        container: "bg-transparent border-b border-white/20",
        trigger: "bg-transparent border-b-2 border-transparent data-[state=active]:border-blue-400 rounded-none",
      },
      cards: {
        container: "bg-transparent gap-2",
        trigger: `${GLOBAL_THEME.cards.interactive} data-[state=active]:border-blue-400/60`,
      }
    }

    return baseStyles[variant]
  }

  const getSizeStyles = () => {
    const sizes = {
      sm: {
        trigger: "px-2 py-1 text-xs",
        icon: "h-3 w-3",
        badge: "text-xs px-1"
      },
      md: {
        trigger: "px-3 py-2 text-sm",
        icon: "h-4 w-4",
        badge: "text-xs px-1.5"
      },
      lg: {
        trigger: "px-4 py-3 text-base",
        icon: "h-5 w-5",
        badge: "text-sm px-2"
      }
    }

    return sizes[size]
  }

  const variantStyles = getVariantStyles()
  const sizeStyles = getSizeStyles()

  // Determine responsive mode
  const effectiveMode = responsiveMode === 'auto' 
    ? (needsResponsive ? (visibleTabs.length > 4 ? 'dropdown' : 'scroll') : 'normal')
    : responsiveMode

  // Mobile dropdown mode
  const [isMobile, setIsMobile] = React.useState(false)
  
  React.useEffect(() => {
    setIsMobile(window.innerWidth < 768)
  }, [])

  if (effectiveMode === 'dropdown' && (needsResponsive || isMobile)) {
    const currentTab = visibleTabs.find(tab => tab.value === currentValue)
    
    return (
      <Tabs value={currentValue} onValueChange={handleValueChange} className={className} {...props}>
        <div className="mb-4">
          <Select value={currentValue} onValueChange={handleValueChange}>
            <SelectTrigger className={`${GLOBAL_THEME.glassmorphic.input} w-full`}>
              <SelectValue>
                <div className="flex items-center gap-2">
                  {showIcons && currentTab?.icon && (
                    <currentTab.icon className={sizeStyles.icon} />
                  )}
                  <span>{currentTab?.label}</span>
                  {showBadges && currentTab?.badge && (
                    <span className={`${sizeStyles.badge} bg-blue-600 text-white rounded-full`}>
                      {currentTab.badge}
                    </span>
                  )}
                </div>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {visibleTabs.map((tab) => (
                <SelectItem 
                  key={tab.value} 
                  value={tab.value}
                  disabled={tab.disabled}
                >
                  <div className="flex items-center gap-2">
                    {showIcons && tab.icon && (
                      <tab.icon className={sizeStyles.icon} />
                    )}
                    <span>{tab.label}</span>
                    {showBadges && tab.badge && (
                      <span className={`${sizeStyles.badge} bg-blue-600 text-white rounded-full`}>
                        {tab.badge}
                      </span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {children}
      </Tabs>
    )
  }

  // Scrollable mode
  if (effectiveMode === 'scroll' && needsResponsive) {
    return (
      <Tabs value={currentValue} onValueChange={handleValueChange} className={className} {...props}>
        <div className="relative">
          {/* Scroll buttons */}
          {canScrollLeft && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 p-0 bg-black/80 backdrop-blur-sm"
              onClick={() => scrollTabs('left')}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
          
          {canScrollRight && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 p-0 bg-black/80 backdrop-blur-sm"
              onClick={() => scrollTabs('right')}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}

          {/* Scrollable tabs container */}
          <div
            ref={scrollContainerRef}
            className="overflow-x-auto scrollbar-hide"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            onScroll={() => {
              if (scrollContainerRef.current && tabsListRef.current) {
                const container = scrollContainerRef.current
                const tabsList = tabsListRef.current
                setCanScrollLeft(container.scrollLeft > 0)
                setCanScrollRight(container.scrollLeft < tabsList.scrollWidth - container.clientWidth)
              }
            }}
          >
            <TabsPrimitive.List
              ref={tabsListRef}
              className={cn(
                "inline-flex items-center justify-start",
                variantStyles.container,
                orientation === 'vertical' && "flex-col",
                "min-w-max px-8"
              )}
            >
              {visibleTabs.map((tab) => (
                <TabsPrimitive.Trigger
                  key={tab.value}
                  value={tab.value}
                  disabled={tab.disabled}
                  className={cn(
                    "inline-flex items-center justify-center whitespace-nowrap font-medium transition-all",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    "disabled:pointer-events-none disabled:opacity-50",
                    variantStyles.trigger,
                    sizeStyles.trigger,
                    variant === 'cards' ? 'rounded-lg' : 'rounded-md'
                  )}
                >
                  <div className="flex items-center gap-2">
                    {showIcons && tab.icon && (
                      <tab.icon className={sizeStyles.icon} />
                    )}
                    <span className="hidden sm:inline">{tab.label}</span>
                    <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                    {showBadges && tab.badge && (
                      <span className={`${sizeStyles.badge} bg-blue-600 text-white rounded-full`}>
                        {tab.badge}
                      </span>
                    )}
                  </div>
                </TabsPrimitive.Trigger>
              ))}
            </TabsPrimitive.List>
          </div>
        </div>
        {children}
      </Tabs>
    )
  }

  // Stack mode (vertical on mobile)
  if (effectiveMode === 'stack') {
    return (
      <Tabs value={currentValue} onValueChange={handleValueChange} className={className} {...props}>
        <TabsPrimitive.List
          className={cn(
            "flex flex-col sm:flex-row items-stretch sm:items-center",
            variantStyles.container,
            "gap-1 sm:gap-0"
          )}
        >
          {visibleTabs.map((tab) => (
            <TabsPrimitive.Trigger
              key={tab.value}
              value={tab.value}
              disabled={tab.disabled}
              className={cn(
                "inline-flex items-center justify-start sm:justify-center w-full sm:w-auto",
                "whitespace-nowrap font-medium transition-all",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                "disabled:pointer-events-none disabled:opacity-50",
                variantStyles.trigger,
                sizeStyles.trigger
              )}
            >
              <div className="flex items-center gap-2">
                {showIcons && tab.icon && (
                  <tab.icon className={sizeStyles.icon} />
                )}
                <span>{tab.label}</span>
                {showBadges && tab.badge && (
                  <span className={`${sizeStyles.badge} bg-blue-600 text-white rounded-full ml-auto sm:ml-0`}>
                    {tab.badge}
                  </span>
                )}
              </div>
            </TabsPrimitive.Trigger>
          ))}
        </TabsPrimitive.List>
        {children}
      </Tabs>
    )
  }

  // Normal mode (default)
  return (
    <Tabs value={currentValue} onValueChange={handleValueChange} className={className} {...props}>
      <TabsPrimitive.List
        className={cn(
          "inline-flex items-center justify-center w-full",
          variantStyles.container,
          orientation === 'vertical' && "flex-col",
          allowOverflow ? "overflow-x-auto" : "overflow-hidden"
        )}
      >
        {visibleTabs.map((tab) => (
          <TabsPrimitive.Trigger
            key={tab.value}
            value={tab.value}
            disabled={tab.disabled}
            className={cn(
              "inline-flex items-center justify-center whitespace-nowrap font-medium transition-all flex-1",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "disabled:pointer-events-none disabled:opacity-50",
              variantStyles.trigger,
              sizeStyles.trigger
            )}
          >
            <div className="flex items-center gap-2">
              {showIcons && tab.icon && (
                <tab.icon className={cn(sizeStyles.icon, "hidden sm:block")} />
              )}
              <span className="hidden md:inline">{tab.label}</span>
              <span className="md:hidden">{tab.label.split(' ')[0]}</span>
              {showBadges && tab.badge && (
                <span className={`${sizeStyles.badge} bg-blue-600 text-white rounded-full`}>
                  {tab.badge}
                </span>
              )}
            </div>
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>
      {children}
    </Tabs>
  )
}

// Enhanced TabsContent with animation
export { Tabs, TabsContent }

// Convenience hook for managing tab state
export function useTabs(defaultValue?: string) {
  const [activeTab, setActiveTab] = React.useState(defaultValue || '')
  
  return {
    activeTab,
    setActiveTab,
    isActive: (value: string) => activeTab === value
  }
}