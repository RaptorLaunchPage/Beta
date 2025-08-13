"use client"

import { useEffect, useState } from "react"
import { useAuthV2 as useAuth } from "@/hooks/use-auth-v2"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3 } from "lucide-react"

export function PerformanceReportSimple() {
  console.log('🎯 PerformanceReportSimple rendering - BUILDING REAL PERFORMANCE REPORT')
  
  // All hooks must be called unconditionally at the top level
  const { profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [performances, setPerformances] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [teams, setTeams] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  
  console.log('✅ All hooks called successfully')

  useEffect(() => {
    console.log('🚀 useEffect triggered')
      
                const loadPerformanceReport = async () => {
        try {
          console.log('⏳ Loading performance report...')
          setLoading(true)
          setError(null)
          
                    if (!profile) {
            console.log('⏸️ No profile yet, waiting...')
            return
          }
          
          console.log('👤 Profile loaded:', profile.id, profile.role)
          
          // Load real performance data
          console.log('📊 Loading performance data...')
          
          // Get all performances via API (with role-based filtering)
          const token = await supabase.auth.getSession().then(s => s.data.session?.access_token)
          const perfParams = new URLSearchParams()
          if (profile.role === 'player') perfParams.set('playerId', profile.id)
          if (profile.role === 'coach' && profile.team_id) perfParams.set('teamId', profile.team_id)
          const perfsRes = await fetch(`/api/performances?${perfParams.toString()}`, { headers: { Authorization: `Bearer ${token}` } })
          const performancesData = perfsRes.ok ? await perfsRes.json() : []
          console.log('✅ Loaded', performancesData?.length || 0, 'performances')
          setPerformances(performancesData || [])
          
          // Load users data via API
          const usersRes = await fetch('/api/users', { headers: { Authorization: `Bearer ${token}` } })
          const usersData = usersRes.ok ? await usersRes.json() : []
          console.log('✅ Loaded', usersData?.length || 0, 'users')
          setUsers(usersData || [])
          
          // Load teams data via API
          const teamsRes = await fetch('/api/teams', { headers: { Authorization: `Bearer ${token}` } })
          const teamsData = teamsRes.ok ? await teamsRes.json() : []
          console.log('✅ Loaded', teamsData?.length || 0, 'teams')
          setTeams(teamsData || [])
          
          // Calculate statistics
          if (performancesData && performancesData.length > 0) {
            const totalPerformances = performancesData.length
            const recentPerformances = performancesData.filter(p => {
              const createdDate = new Date(p.created_at)
              const weekAgo = new Date()
              weekAgo.setDate(weekAgo.getDate() - 7)
              return createdDate >= weekAgo
            })
            
            // Calculate team distribution
            const teamDistribution = performancesData.reduce((acc, perf) => {
              acc[perf.team_id] = (acc[perf.team_id] || 0) + 1
              return acc
            }, {} as Record<string, number>)
            
            // Calculate player distribution
            const playerDistribution = performancesData.reduce((acc, perf) => {
              acc[perf.player_id] = (acc[perf.player_id] || 0) + 1
              return acc
            }, {} as Record<string, number>)
            
            setStats({
              totalPerformances,
              recentPerformances: recentPerformances.length,
              teamsActive: Object.keys(teamDistribution).length,
              playersActive: Object.keys(playerDistribution).length,
              teamDistribution,
              playerDistribution
            })
          } else {
            setStats({
              totalPerformances: 0,
              recentPerformances: 0,
              teamsActive: 0,
              playersActive: 0,
              teamDistribution: {},
              playerDistribution: {}
            })
          }
          
          console.log('✅ Performance report loaded successfully')
                } catch (err) {
          console.error('❌ Error loading performance data:', err)
          setError(err instanceof Error ? err.message : String(err))
        } finally {
          setLoading(false)
          console.log('✅ Performance data loaded')
        }
      }
      
      loadPerformanceReport()
    }, [profile?.id])
    
    console.log('✅ useEffect hook setup successfully')
    
    if (loading) {
      return (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Performance Report
              </CardTitle>
              <CardDescription>Loading performance data...</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-center py-8 text-muted-foreground">
                Loading performance report... ⏳
              </p>
            </CardContent>
          </Card>
        </div>
      )
    }
    
    if (error) {
      return (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-red-600">Database Query Error</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-red-600">Error: {error}</p>
              <div className="mt-4 text-sm text-muted-foreground">
                <p><strong>Profile ID:</strong> {profile?.id || 'None'}</p>
                <p><strong>Role:</strong> {profile?.role || 'None'}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }
    
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Performance Report
            </CardTitle>
            <CardDescription>
              Performance report ready - {profile ? `Logged in as ${profile.name || profile.email}` : 'Not logged in'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats ? (
              <div className="space-y-6">
                {/* Summary Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-primary">{stats.totalPerformances}</div>
                    <div className="text-sm text-muted-foreground">Total Performances</div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{stats.recentPerformances}</div>
                    <div className="text-sm text-muted-foreground">This Week</div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{stats.teamsActive}</div>
                    <div className="text-sm text-muted-foreground">Active Teams</div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">{stats.playersActive}</div>
                    <div className="text-sm text-muted-foreground">Active Players</div>
                  </div>
                </div>

                {/* Recent Performances */}
                {performances.length > 0 ? (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Recent Performances</h3>
                    <div className="space-y-2">
                      {performances.slice(0, 5).map((perf, index) => (
                        <div key={perf.id} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                          <div>
                            <div className="font-medium">Performance #{perf.id.slice(0, 8)}</div>
                            <div className="text-sm text-muted-foreground">
                              {new Date(perf.created_at).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm">
                              Player: {users.find(u => u.id === perf.player_id)?.name || 'Unknown'}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Team: {teams.find(t => t.id === perf.team_id)?.name || 'Unknown'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {performances.length > 5 && (
                      <div className="text-center mt-3 text-sm text-muted-foreground">
                        +{performances.length - 5} more performances
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-muted-foreground">No performance data found</div>
                    <div className="text-sm text-muted-foreground mt-2">
                      {profile.role === 'player' 
                        ? 'Submit your first performance to see data here' 
                        : 'Performances will appear here as they are submitted'
                      }
                    </div>
                  </div>
                )}

                {/* Debug Info */}
                <div className="text-xs text-muted-foreground border-t pt-4">
                  <p>User: {profile?.role} | Loaded: {users.length} users, {teams.length} teams</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Loading performance data...
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )

    // Error case handled by state, not try-catch wrapper
    if (error) {
      return (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-red-600">Error</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-red-600">
                Error loading performance data: {error}
              </p>
            </CardContent>
          </Card>
        </div>
      )
    }
}