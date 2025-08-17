"use client"

import { useState } from "react"
import { useAuthV2 as useAuth } from "@/hooks/use-auth-v2"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Bug, 
  Database, 
  Play,
  Calendar,
  CheckCircle,
  XCircle
} from "lucide-react"

export default function DebugSimplePage() {
  const { profile, getToken } = useAuth()
  const [results, setResults] = useState<any>({})
  const [loading, setLoading] = useState(false)

  const testPerformanceCreation = async () => {
    setLoading(true)
    console.log('Testing performance creation...')
    
    try {
      const token = await getToken()
      console.log('Token obtained:', !!token)
      
      // Get available slots
      const slotsRes = await fetch('/api/slots?view=current', { 
        headers: { Authorization: `Bearer ${token}` } 
      })
      const slotsData = await slotsRes.json()
      console.log('Slots response:', slotsRes.status, slotsData)
      
      if (!slotsRes.ok) {
        throw new Error(`Slots API failed: ${slotsRes.status}`)
      }
      
      let slotId = null
      if (Array.isArray(slotsData) && slotsData.length > 0) {
        slotId = slotsData[0].id
        console.log('Using slot:', slotId)
      } else {
        console.log('No slots available, creating one...')
        // Create a test slot
        const createSlotRes = await fetch('/api/slots', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json', 
            Authorization: `Bearer ${token}` 
          },
          body: JSON.stringify({
            team_id: profile?.team_id || '5532bedf-c307-4626-8c96-30e46b2afbb5', // Use first team if no team assigned
            organizer: 'Debug Test',
            time_range: '18:00 - 20:00',
            date: new Date().toISOString().split('T')[0],
            slot_rate: 0,
            match_count: 1
          })
        })
        const slotData = await createSlotRes.json()
        console.log('Create slot response:', createSlotRes.status, slotData)
        
        if (createSlotRes.ok) {
          slotId = slotData.id
          console.log('Created slot:', slotId)
        } else {
          throw new Error(`Failed to create slot: ${slotData.error}`)
        }
      }
      
      // Create performance
      const payload = {
        player_id: profile?.id,
        team_id: profile?.team_id || '5532bedf-c307-4626-8c96-30e46b2afbb5',
        match_number: 1,
        slot: slotId,
        map: 'Erangle',
        placement: 1,
        kills: 5,
        assists: 2,
        damage: 1500,
        survival_time: 20,
        added_by: profile?.id
      }
      
      console.log('Performance payload:', payload)
      
      const perfRes = await fetch('/api/performances', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(payload)
      })
      
      const perfData = await perfRes.json()
      console.log('Performance response:', perfRes.status, perfData)
      
      if (perfRes.ok) {
        setResults(prev => ({ ...prev, performance: { success: true, data: perfData } }))
        console.log('Performance created successfully!')
      } else {
        setResults(prev => ({ ...prev, performance: { success: false, error: perfData } }))
        console.log('Performance creation failed:', perfData)
      }
      
    } catch (error) {
      console.error('Performance test error:', error)
      setResults(prev => ({ ...prev, performance: { success: false, error: error.message } }))
    } finally {
      setLoading(false)
    }
  }

  const testSessionCreation = async () => {
    setLoading(true)
    console.log('Testing session creation...')
    
    try {
      const token = await getToken()
      console.log('Token obtained:', !!token)
      
      // Get available teams
      const teamsRes = await fetch('/api/teams', { 
        headers: { Authorization: `Bearer ${token}` } 
      })
      const teamsData = await teamsRes.json()
      console.log('Teams response:', teamsRes.status, teamsData)
      
      if (!teamsRes.ok) {
        throw new Error(`Teams API failed: ${teamsRes.status}`)
      }
      
      if (!Array.isArray(teamsData) || teamsData.length === 0) {
        throw new Error('No teams available')
      }
      
      const teamId = teamsData[0].id
      console.log('Using team:', teamId)
      
      // Create session
      const payload = {
        team_id: teamId,
        session_type: 'practice',
        session_subtype: 'Evening',
        date: new Date().toISOString().split('T')[0],
        start_time: '18:00',
        end_time: '20:00',
        title: 'Debug Test Session',
        description: 'Test session for debugging',
        is_mandatory: true
      }
      
      console.log('Session payload:', payload)
      
      const sessionRes = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(payload)
      })
      
      const sessionData = await sessionRes.json()
      console.log('Session response:', sessionRes.status, sessionData)
      
      if (sessionRes.ok) {
        setResults(prev => ({ ...prev, session: { success: true, data: sessionData } }))
        console.log('Session created successfully!')
      } else {
        setResults(prev => ({ ...prev, session: { success: false, error: sessionData } }))
        console.log('Session creation failed:', sessionData)
      }
      
    } catch (error) {
      console.error('Session test error:', error)
      setResults(prev => ({ ...prev, session: { success: false, error: error.message } }))
    } finally {
      setLoading(false)
    }
  }

  if (!profile) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bug className="h-5 w-5" />
              Simple Debug Page
            </CardTitle>
            <CardDescription>Authentication required</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Please log in to access the debug tools.</p>
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
            Simple Debug Console
          </CardTitle>
          <CardDescription>
            Simple debug tools with console logging
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Button onClick={testPerformanceCreation} disabled={loading}>
              <Play className="h-4 w-4 mr-2" />
              Test Performance
            </Button>
            <Button onClick={testSessionCreation} disabled={loading}>
              <Calendar className="h-4 w-4 mr-2" />
              Test Session
            </Button>
          </div>
          
          <div className="text-sm text-muted-foreground">
            Check the browser console for detailed logs.
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Test Results</CardTitle>
          <CardDescription>Results from debug tests</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(results).map(([testName, result]) => (
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
            {Object.keys(results).length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                No test results yet. Run tests to see results.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}