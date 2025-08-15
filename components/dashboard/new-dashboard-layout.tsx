"use client"

import { useState, useEffect } from 'react'
import { useAuthV2 as useAuth } from '@/hooks/use-auth-v2'
import { DashboardPermissions, type UserRole } from '@/lib/dashboard-permissions'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { VideoBackground } from '@/components/video-background'
import { DashboardContentWrapper } from './dashboard-content-wrapper'
import { 
  Menu, 
  Home, 
  BarChart3, 
  Users, 
  Target, 
  IndianRupee, 
  UserCheck, 
  User, 
  Bell, 
  Settings, 
  LogOut,
  ChevronDown,
  CalendarCheck,
  UserPlus,
  FileText
} from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

const iconMap = {
  Home,
  BarChart3,
  Users,
  Target,
  IndianRupee,
  UserCheck,
  User,
  CalendarCheck,
  UserPlus,
  Settings,
  FileText
}

interface NewDashboardLayoutProps {
  children: React.ReactNode
}

export function NewDashboardLayout({ children }: NewDashboardLayoutProps) {
  const { profile, isLoading, signOut } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isVisible, setIsVisible] = useState(false)

  // Add smooth transition when component mounts
  useEffect(() => {
    if (!isLoading && profile) {
      const timer = setTimeout(() => setIsVisible(true), 100)
      return () => clearTimeout(timer)
    }
      }, [isLoading, profile])

  if (isLoading) {
    return null // Let GlobalLoading handle the loading UI to avoid flicker
  }

  if (!profile) {
    return null
  }

  const userRole = profile.role as UserRole
  const navigationModules = DashboardPermissions.getNavigationModules(userRole)
  const roleInfo = DashboardPermissions.getRoleInfo(userRole)

  const isActiveRoute = (path: string) => {
    if (path === '/dashboard' && pathname === '/dashboard') return true
    if (path !== '/dashboard' && pathname.startsWith(path)) return true
    return false
  }

  const handleSignOut = async () => {
    try {
      console.log('🚪 Dashboard: Starting sign out...')
      await signOut()
      // Don't manually redirect - let the auth hook handle the redirect
      console.log('✅ Dashboard: Sign out complete, auth hook will handle redirect')
    } catch (error) {
      console.error('❌ Dashboard sign out error:', error)
      // Fallback redirect only on error
      router.push('/')
    }
  }

  const NavigationItems = () => (
    <>
      {navigationModules.map((module) => {
        const IconComponent = iconMap[module.icon as keyof typeof iconMap] || Home
        const isActive = isActiveRoute(module.path)
        
        return (
          <Link
            key={module.id}
            href={module.path}
            onClick={() => setMobileMenuOpen(false)}
            className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              isActive
                ? 'bg-white/20 text-white border border-white/30 backdrop-blur-sm'
                : 'text-white/80 hover:text-white hover:bg-white/10'
            }`}
          >
            <IconComponent className="h-5 w-5 flex-shrink-0" />
            <span className="truncate">{module.title}</span>
          </Link>
        )
      })}
    </>
  )

  return (
    <VideoBackground>
      {/* Ambient glowing dots */}
      <div className="pointer-events-none fixed left-1/6 top-1/4 z-10 h-6 w-6 rounded-full bg-white opacity-40 blur-2xl animate-pulse" />
      <div className="pointer-events-none fixed right-1/5 bottom-1/3 z-10 h-4 w-4 rounded-full bg-white opacity-30 blur-md animate-pulse" />
      <div className="pointer-events-none fixed left-3/4 top-1/2 z-10 h-3 w-3 rounded-full bg-white opacity-20 blur-lg animate-pulse" />
      
      <div className={`min-h-screen transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
        {/* Mobile Header */}
        <div className="lg:hidden bg-black/70 backdrop-blur-lg border-b border-white/30">
          <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-3">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[85vw] max-w-[280px] p-0 bg-white/10 backdrop-blur-md border-white/20">
                                  <div className="flex flex-col h-full">
                    {/* Mobile Menu Header */}
                    <div className="p-6 border-b border-white/20 bg-white/20 backdrop-blur-md">
                    <div className="flex items-center space-x-3">
                                              <Avatar className="h-10 w-10 border-2 border-white/30">
                          <AvatarImage src={profile.avatar_url || undefined} />
                          <AvatarFallback className="bg-white/20 text-white font-semibold">
                            {profile.name?.charAt(0) || profile.email?.charAt(0) || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium truncate">
                            {profile.name || profile.email}
                          </p>
                                                    <Badge 
                            variant="secondary" 
                            className="bg-white/20 text-white border-white/30 text-xs"
                            style={{ color: 'white !important' }}
                          >
                            <span className="text-white font-medium">{roleInfo.label}</span>
                          </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Mobile Navigation */}
                  <div className="flex-1 p-4 space-y-2">
                    <NavigationItems />
                  </div>

                  {/* Mobile Footer */}
                  <div className="p-4 border-t space-y-2">
                    <Link
                      href="/dashboard/profile"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium text-white/80 hover:text-white hover:bg-white/10"
                    >
                      <Settings className="h-5 w-5" />
                      <span>Profile Settings</span>
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium text-red-300 hover:text-red-100 hover:bg-red-500/20"
                    >
                      <LogOut className="h-5 w-5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
            <h1 className="text-xl font-bold text-white">Raptor Hub</h1>
          </div>

          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
              <Bell className="h-5 w-5" />
            </Button>
            <Avatar className="h-8 w-8 border-2 border-white/30">
              <AvatarImage src={profile.avatar_url || undefined} />
              <AvatarFallback className="text-xs bg-white/20 text-white">
                {profile.name?.charAt(0) || profile.email?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </div>

              <div className="lg:flex">
          {/* Desktop Sidebar */}
          <div className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 z-20">
            <div className="flex flex-col flex-1 bg-white/10 backdrop-blur-md shadow-xl border-r border-white/20">
                          {/* Desktop Header */}
              <div className="p-6 bg-white/20 backdrop-blur-md border-b border-white/20">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <img 
                      src="/RLogo.ico" 
                      alt="Raptor Hub" 
                      className="h-10 w-10 rounded-full bg-white/20 backdrop-blur-sm p-1"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h1 className="text-xl font-bold text-white">Raptor Hub</h1>
                    <p className="text-white/70 text-sm truncate">{profile.email}</p>
                  </div>
                </div>
              </div>

              {/* Role Badge */}
              <div className="px-6 py-4 border-b border-white/20">
                <Badge 
                  variant="secondary" 
                  className="bg-white/20 text-white border-white/30 w-full justify-center py-2"
                  style={{ color: 'white !important' }}
                >
                  <span className="text-white font-medium">{roleInfo.label}</span>
                </Badge>
              </div>

            {/* Desktop Navigation */}
            <nav className="flex-1 px-4 py-6 space-y-2">
              <NavigationItems />
            </nav>

                          {/* Desktop Footer */}
              <div className="px-4 py-4 border-t border-white/20 space-y-2">
                <Link
                  href="/dashboard/profile"
                  className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium text-white/80 hover:text-white hover:bg-white/10"
                >
                  <Settings className="h-5 w-5" />
                  <span>Profile Settings</span>
                </Link>
              
                              <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium text-white/80 hover:text-white hover:bg-white/10">
                      <Avatar className="h-5 w-5 border border-white/30">
                        <AvatarImage src={profile.avatar_url || undefined} />
                        <AvatarFallback className="text-xs bg-white/20 text-white">
                          {profile.name?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="flex-1 text-left truncate">
                        {profile.name || 'Profile'}
                      </span>
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 bg-white/10 backdrop-blur-md border-white/20">
                    <DropdownMenuItem 
                      onClick={() => router.push('/dashboard/profile')}
                      className="text-white hover:bg-white/10"
                    >
                      <User className="mr-2 h-4 w-4" />
                      Profile Settings
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={handleSignOut} 
                      className="text-red-300 hover:text-red-100 hover:bg-red-500/20"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
            </div>
          </div>
        </div>

                  {/* Main Content */}
          <div className="lg:pl-64 flex flex-col min-h-screen">
            <main className="flex-1 p-4 lg:p-8">
              <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 shadow-lg p-6">
                <DashboardContentWrapper>
                  {children}
                </DashboardContentWrapper>
              </div>
            </main>
          </div>
        </div>
      </div>
    </VideoBackground>
  )
}