"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { ChevronDown, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"

interface FilterOption {
  value: string
  label: string
  count?: number
}

interface ResponsiveFiltersProps {
  filters: FilterOption[]
  activeFilter?: string
  onFilterChange: (value: string) => void
  className?: string
  showCounts?: boolean
  placeholder?: string
}

export function ResponsiveFilters({
  filters,
  activeFilter,
  onFilterChange,
  className,
  showCounts = false,
  placeholder = "All"
}: ResponsiveFiltersProps) {
  const [isMobile, setIsMobile] = React.useState(false)

  React.useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkScreenSize()
    window.addEventListener('resize', checkScreenSize)
    
    return () => window.removeEventListener('resize', checkScreenSize)
  }, [])

  const activeFilterLabel = filters.find(f => f.value === activeFilter)?.label || placeholder

  if (isMobile) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "bg-white/8 backdrop-blur-md border-white/25 text-white hover:bg-white/12 hover:border-white/40",
              className
            )}
          >
            <Filter className="h-4 w-4 mr-2" />
            {activeFilterLabel}
            <ChevronDown className="h-4 w-4 ml-2" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          align="start" 
          className="bg-white/10 backdrop-blur-md border-white/20 text-white min-w-[200px]"
        >
          {filters.map((filter) => (
            <DropdownMenuItem
              key={filter.value}
              onClick={() => onFilterChange(filter.value)}
              className={cn(
                "text-white/90 hover:bg-white/12 hover:text-white cursor-pointer",
                activeFilter === filter.value && "bg-white/15 text-white"
              )}
            >
              <div className="flex items-center justify-between w-full">
                <span>{filter.label}</span>
                {showCounts && filter.count !== undefined && (
                  <Badge variant="secondary" className="bg-white/20 text-white border-white/30 text-xs">
                    {filter.count}
                  </Badge>
                )}
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {filters.map((filter) => (
        <Button
          key={filter.value}
          variant={activeFilter === filter.value ? "default" : "outline"}
          size="sm"
          onClick={() => onFilterChange(filter.value)}
          className={cn(
            "transition-all duration-200",
            activeFilter === filter.value
              ? "bg-primary/80 backdrop-blur-md border-primary/40 text-white hover:bg-primary/90"
              : "bg-white/8 backdrop-blur-md border-white/25 text-white/90 hover:bg-white/12 hover:border-white/40 hover:text-white"
          )}
        >
          {filter.label}
          {showCounts && filter.count !== undefined && (
            <Badge 
              variant="secondary" 
              className={cn(
                "ml-2 text-xs",
                activeFilter === filter.value
                  ? "bg-white/20 text-white border-white/30"
                  : "bg-white/15 text-white/80 border-white/20"
              )}
            >
              {filter.count}
            </Badge>
          )}
        </Button>
      ))}
    </div>
  )
}

interface ResponsiveSearchProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onSearch: (value: string) => void
  placeholder?: string
}

export function ResponsiveSearch({ 
  onSearch, 
  placeholder = "Search...", 
  className,
  ...props 
}: ResponsiveSearchProps) {
  const [value, setValue] = React.useState("")

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setValue(newValue)
    onSearch(newValue)
  }

  return (
    <div className={cn("relative", className)}>
      <input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className={cn(
          "w-full px-4 py-2 bg-white/8 backdrop-blur-md border border-white/25 rounded-md",
          "text-white placeholder:text-white/60",
          "focus:bg-white/12 focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/10",
          "transition-all duration-200"
        )}
        {...props}
      />
    </div>
  )
}
