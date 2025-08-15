"use client"

import { useState, useEffect } from "react"
import { useAuthV2 as useAuth } from "@/hooks/use-auth-v2"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Bug, 
  Database, 
  User, 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Play,
  Calendar,
  Users
} from "lucide-react"

export default function DebugPage() {
  const { profile, getToken } = useAuth()
  const [debugLogs, setDebugLogs] = useState<any[]>([])
  const [userInfo, setUserInfo] = useState<any>(null)
  const [databaseInfo, setDatabaseInfo] = useState<any>(null)
  const [testResults, setTestResults] = useState<any>({})
  const [loading, setLoading] = useState(false)

  // Test performance data
  const [testPerformance, setTestPerformance] = useState({
    match_number: "1",
    slot: "",
    map: "Erangle",
    placement: "1",
    kills: "5",
    assists: "2",
    damage: "1500",
    survival_time: "20"
  })

  // Test session data
  const [testSession, setTestSession] = useState({
    team_id: "",
    session_type: "practice",
    session_subtype: "Evening",
    date: new Date().toISOString().split('T')[0],
    start_time: "18:00",
    end_time: "20:00",
    title: "Test Session",
    description: "Debug test session"
  })

  useEffect(() => {
    if (profile) {
      loadDebugInfo()
    }
  }, [profile])

  const addLog = (level: string, message: string, data?: any) => {
    const log = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data
    }
    setDebugLogs(prev => [log, ...prev.slice(0, 49)]) // Keep last 50 logs
  }

  const loadDebugInfo = async () => {
    setLoading(true)
    addLog('info', 'Loading debug information...')

    try {
      // Get user info
      const token = await getToken()
      const userRes = await fetch('/api/auth/session', { 
        headers: { Authorization: `Bearer ${token}` } 
      })
      const userData = await userRes.json()
      setUserInfo(userData)
      addLog('info', 'User info loaded', userData)

      // Get database info
      const dbRes = await fetch('/api/public/stats', { 
        headers: { Authorization: `Bearer ${token}` } 
      })
      const dbData = await dbRes.json()
      setDatabaseInfo(dbData)
      addLog('info', 'Database info loaded', dbData)

    } catch (error) {
      addLog('error', 'Failed to load debug info', error)
    } finally {
      setLoading(false)
    }
  }

  const testPerformanceCreation = async () => {
    setLoading(true)
    addLog('info', 'Testing performance creation...', testPerformance)

    try {
      const token = await getToken()
      
      // Step 1: Test authentication
      addLog('info', 'Step 1: Testing authentication')
      const authRes = await fetch('/api/auth/session', { 
        headers: { Authorization: `Bearer ${token}` } 
      })
      if (!authRes.ok) {
        throw new Error(`Auth failed: ${authRes.status}`)
      }
      addLog('success', 'Authentication successful')

      // Step 2: Test slot availability
      addLog('info', 'Step 2: Testing slot availability')
      const slotsRes = await fetch('/api/slots?view=current', { 
        headers: { Authorization: `Bearer ${token}` } 
      })
      const slotsData = await slotsRes.json()
      addLog('info', 'Slots data', slotsData)

      if (Array.isArray(slotsData) && slotsData.length > 0) {
        const selectedSlotId = slotsData[0].id
        setTestPerformance(prev => ({ ...prev, slot: selectedSlotId }))
        addLog('info', 'Using first available slot', slotsData[0])
        
        // Step 3: Test performance creation
        addLog('info', 'Step 3: Testing performance creation')
        const payload = {
          player_id: profile?.id,
          team_id: profile?.team_id,
          match_number: parseInt(testPerformance.match_number),
          slot: selectedSlotId,
          map: testPerformance.map,
          placement: parseInt(testPerformance.placement),
          kills: parseInt(testPerformance.kills),
          assists: parseInt(testPerformance.assists),
          damage: parseInt(testPerformance.damage),
          survival_time: parseInt(testPerformance.survival_time),
          added_by: profile?.id
        }
      } else {
        addLog('warning', 'No slots available, creating test slot')
        // Create a test slot
        const createSlotRes = await fetch('/api/slots', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json', 
            Authorization: `Bearer ${token}` 
          },
          body: JSON.stringify({
            team_id: profile?.team_id,
            organizer: 'Debug Test',
            time_range: '18:00 - 20:00',
            date: new Date().toISOString().split('T')[0],
            slot_rate: 0,
            match_count: 1
          })
        })
        const slotData = await createSlotRes.json()
        if (createSlotRes.ok) {
          const selectedSlotId = slotData.id
          setTestPerformance(prev => ({ ...prev, slot: selectedSlotId }))
          addLog('success', 'Test slot created', slotData)
          
          // Step 3: Test performance creation
          addLog('info', 'Step 3: Testing performance creation')
          const payload = {
            player_id: profile?.id,
            team_id: profile?.team_id,
            match_number: parseInt(testPerformance.match_number),
            slot: selectedSlotId,
            map: testPerformance.map,
            placement: parseInt(testPerformance.placement),
            kills: parseInt(testPerformance.kills),
            assists: parseInt(testPerformance.assists),
            damage: parseInt(testPerformance.damage),
            survival_time: parseInt(testPerformance.survival_time),
            added_by: profile?.id
          }
        } else {
          addLog('error', 'Failed to create test slot', slotData)
          setTestResults(prev => ({ ...prev, performance: { success: false, error: 'Failed to create test slot' } }))
          return
        }
      }
      
      addLog('info', 'Performance payload', payload)

      const perfRes = await fetch('/api/performances', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(payload)
      })

      const perfData = await perfRes.json()
      addLog('info', 'Performance response', { status: perfRes.status, data: perfData })

      if (perfRes.ok) {
        setTestResults(prev => ({ ...prev, performance: { success: true, data: perfData } }))
        addLog('success', 'Performance created successfully', perfData)
      } else {
        setTestResults(prev => ({ ...prev, performance: { success: false, error: perfData } }))
        addLog('error', 'Performance creation failed', perfData)
      }

    } catch (error) {
      addLog('error', 'Performance test failed', error)
      setTestResults(prev => ({ ...prev, performance: { success: false, error } }))
    } finally {
      setLoading(false)
    }
  }

  const testSessionCreation = async () => {
    setLoading(true)
    addLog('info', 'Testing session creation...', testSession)

    try {
      const token = await getToken()
      
      // Step 1: Test authentication
      addLog('info', 'Step 1: Testing authentication')
      const authRes = await fetch('/api/auth/session', { 
        headers: { Authorization: `Bearer ${token}` } 
      })
      if (!authRes.ok) {
        throw new Error(`Auth failed: ${authRes.status}`)
      }
      addLog('success', 'Authentication successful')

      // Step 2: Test team availability
      addLog('info', 'Step 2: Testing team availability')
      const teamsRes = await fetch('/api/teams', { 
        headers: { Authorization: `Bearer ${token}` } 
      })
      const teamsData = await teamsRes.json()
      addLog('info', 'Teams data', teamsData)

      if (Array.isArray(teamsData) && teamsData.length > 0) {
        const selectedTeamId = teamsData[0].id
        setTestSession(prev => ({ ...prev, team_id: selectedTeamId }))
        addLog('info', 'Using first available team', teamsData[0])
        
        // Step 3: Test session creation
        addLog('info', 'Step 3: Testing session creation')
        const payload = {
          team_id: selectedTeamId,
          session_type: testSession.session_type,
          session_subtype: testSession.session_subtype,
          date: testSession.date,
          start_time: testSession.start_time,
          end_time: testSession.end_time,
          title: testSession.title,
          description: testSession.description,
          is_mandatory: true
        }
      } else {
        addLog('warning', 'No teams available')
        setTestResults(prev => ({ ...prev, session: { success: false, error: 'No teams available' } }))
        return
      }
      addLog('info', 'Session payload', payload)

      const sessionRes = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(payload)
      })

      const sessionData = await sessionRes.json()
      addLog('info', 'Session response', { status: sessionRes.status, data: sessionData })

      if (sessionRes.ok) {
        setTestResults(prev => ({ ...prev, session: { success: true, data: sessionData } }))
        addLog('success', 'Session created successfully', sessionData)
      } else {
        setTestResults(prev => ({ ...prev, session: { success: false, error: sessionData } }))
        addLog('error', 'Session creation failed', sessionData)
      }

    } catch (error) {
      addLog('error', 'Session test failed', error)
      setTestResults(prev => ({ ...prev, session: { success: false, error } }))
    } finally {
      setLoading(false)
    }
  }

  const testDatabaseConnection = async () => {
    setLoading(true)
    addLog('info', 'Testing database connection...')

    try {
      const token = await getToken()
      
      // Test various API endpoints
      const endpoints = [
        '/api/teams',
        '/api/users', 
        '/api/slots',
        '/api/performances',
        '/api/sessions',
        '/api/attendances'
      ]

      const results = {}
      
      for (const endpoint of endpoints) {
        try {
          const res = await fetch(endpoint, { 
            headers: { Authorization: `Bearer ${token}` } 
          })
          const data = await res.json()
          results[endpoint] = { status: res.status, success: res.ok, data }
          addLog(res.ok ? 'success' : 'error', `${endpoint} test`, { status: res.status, success: res.ok })
        } catch (error) {
          results[endpoint] = { error: error.message }
          addLog('error', `${endpoint} test failed`, error)
        }
      }

      setTestResults(prev => ({ ...prev, database: results }))
      addLog('info', 'Database connection test completed', results)

    } catch (error) {
      addLog('error', 'Database connection test failed', error)
    } finally {
      setLoading(false)
    }
  }

  const clearLogs = () => {
    setDebugLogs([])
    setTestResults({})
  }

  if (!profile) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bug className="h-5 w-5" />
              Debug Page
            </CardTitle>
            <CardDescription>Authentication required to access debug tools</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Please log in to access the debug page.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bug className="h-5 w-5" />
            Debug Console
          </CardTitle>
          <CardDescription>
            Debug tools for troubleshooting performance and session creation issues
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Button onClick={testDatabaseConnection} disabled={loading}>
              <Database className="h-4 w-4 mr-2" />
              Test Database
            </Button>
            <Button onClick={testPerformanceCreation} disabled={loading}>
              <Play className="h-4 w-4 mr-2" />
              Test Performance
            </Button>
            <Button onClick={testSessionCreation} disabled={loading}>
              <Calendar className="h-4 w-4 mr-2" />
              Test Session
            </Button>
            <Button onClick={clearLogs} variant="outline">
              Clear Logs
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="logs" className="space-y-4">
        <TabsList>
          <TabsTrigger value="logs">Debug Logs</TabsTrigger>
          <TabsTrigger value="user">User Info</TabsTrigger>
          <TabsTrigger value="database">Database Info</TabsTrigger>
          <TabsTrigger value="tests">Test Results</TabsTrigger>
        </TabsList>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Debug Logs</CardTitle>
              <CardDescription>Real-time debug information</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-h-96 overflow-y-auto space-y-2">
                {debugLogs.map((log, index) => (
                  <div key={index} className="text-sm p-2 rounded border">
                    <div className="flex items-center gap-2">
                      {log.level === 'error' && <XCircle className="h-4 w-4 text-red-500" />}
                      {log.level === 'success' && <CheckCircle className="h-4 w-4 text-green-500" />}
                      {log.level === 'warning' && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
                      {log.level === 'info' && <Shield className="h-4 w-4 text-blue-500" />}
                      <Badge variant={log.level === 'error' ? 'destructive' : 'secondary'}>
                        {log.level}
                      </Badge>
                      <span className="text-muted-foreground">{log.timestamp}</span>
                    </div>
                    <div className="mt-1 font-mono">{log.message}</div>
                    {log.data && (
                      <details className="mt-1">
                        <summary className="cursor-pointer text-muted-foreground">Data</summary>
                        <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-x-auto">
                          {JSON.stringify(log.data, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
                {debugLogs.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    No debug logs yet. Run a test to see logs.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="user" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                User Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              {userInfo ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>User ID</Label>
                      <div className="font-mono text-sm">{userInfo.id}</div>
                    </div>
                    <div>
                      <Label>Email</Label>
                      <div className="font-mono text-sm">{userInfo.email}</div>
                    </div>
                    <div>
                      <Label>Role</Label>
                      <Badge>{userInfo.role}</Badge>
                    </div>
                    <div>
                      <Label>Team ID</Label>
                      <div className="font-mono text-sm">{userInfo.team_id || 'None'}</div>
                    </div>
                    <div>
                      <Label>Status</Label>
                      <Badge variant={userInfo.status === 'Active' ? 'default' : 'secondary'}>
                        {userInfo.status}
                      </Badge>
                    </div>
                  </div>
                  <details>
                    <summary className="cursor-pointer">Full User Data</summary>
                    <pre className="text-xs bg-muted p-2 rounded mt-2 overflow-x-auto">
                      {JSON.stringify(userInfo, null, 2)}
                    </pre>
                  </details>
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  User information not loaded
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="database" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Database Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              {databaseInfo ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Active Teams</Label>
                      <div className="text-2xl font-bold">{databaseInfo.stats?.activeTeams || 0}</div>
                    </div>
                    <div>
                      <Label>Active Players</Label>
                      <div className="text-2xl font-bold">{databaseInfo.stats?.activePlayers || 0}</div>
                    </div>
                    <div>
                      <Label>Total Matches</Label>
                      <div className="text-2xl font-bold">{databaseInfo.stats?.totalMatches || 0}</div>
                    </div>
                    <div>
                      <Label>Total WWCD</Label>
                      <div className="text-2xl font-bold">{databaseInfo.stats?.totalWWCD || 0}</div>
                    </div>
                  </div>
                  <details>
                    <summary className="cursor-pointer">Full Database Data</summary>
                    <pre className="text-xs bg-muted p-2 rounded mt-2 overflow-x-auto">
                      {JSON.stringify(databaseInfo, null, 2)}
                    </pre>
                  </details>
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  Database information not loaded
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tests" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Test Results</CardTitle>
              <CardDescription>Results from debug tests</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(testResults).map(([testName, result]) => (
                  <div key={testName} className="border rounded p-4">
                    <h3 className="font-semibold capitalize">{testName} Test</h3>
                    {result.success ? (
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        <span>Success</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-red-600">
                        <XCircle className="h-4 w-4" />
                        <span>Failed</span>
                      </div>
                    )}
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm">Details</summary>
                      <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-x-auto">
                        {JSON.stringify(result, null, 2)}
                      </pre>
                    </details>
                  </div>
                ))}
                {Object.keys(testResults).length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    No test results yet. Run tests to see results.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}