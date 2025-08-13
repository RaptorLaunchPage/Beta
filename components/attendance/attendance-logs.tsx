"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Calendar, 
  RefreshCw, 
  Clock, 
  User, 
  CheckCircle,
  XCircle,
  Bot,
  Users
} from "lucide-react"
import { format } from "date-fns"
import type { UserRole } from "@/lib/dashboard-permissions"

type Attendance = {
  id: string
  player_id: string
  team_id: string
  date: string
  session_time: string
  status: string
  marked_by: string | null
  created_at: string
  users?: {
    id: string
    name: string
    email: string
  } | null
  teams?: {
    id: string
    name: string
  } | null
  marked_by_user?: {
    id: string
    name: string
    email: string
  } | null
}

interface AttendanceLogsProps {
  attendances: Attendance[]
  onRefresh: () => void
  userRole: UserRole | undefined
}

export function AttendanceLogs({ attendances, onRefresh, userRole }: AttendanceLogsProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Present':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">
            <CheckCircle className="h-3 w-3 mr-1" />
            Present
          </Badge>
        )
      case 'Auto (Match)':
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-100">
            <Bot className="h-3 w-3 mr-1" />
            Auto (Match)
          </Badge>
        )
      case 'Absent':
        return (
          <Badge variant="destructive" className="bg-red-100 text-red-800 hover:bg-red-100">
            <XCircle className="h-3 w-3 mr-1" />
            Absent
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getSessionBadge = (session: string) => {
    const sessionColors = {
      'Morning': 'bg-yellow-100 text-yellow-800',
      'Evening': 'bg-orange-100 text-orange-800',
      'Night': 'bg-purple-100 text-purple-800',
      'Match': 'bg-green-100 text-green-800'
    }
    
    return (
      <Badge 
        variant="outline" 
        className={`${sessionColors[session as keyof typeof sessionColors] || 'bg-gray-100 text-gray-800'}`}
      >
        <Clock className="h-3 w-3 mr-1" />
        {session}
      </Badge>
    )
  }

  // Group attendances by date for better organization
  const groupedAttendances = attendances.reduce((groups, attendance) => {
    const date = attendance.date
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(attendance)
    return groups
  }, {} as Record<string, Attendance[]>)

  const sortedDates = Object.keys(groupedAttendances).sort((a, b) => new Date(b).getTime() - new Date(a).getTime())

  if (attendances.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Attendance Records
            </h3>
            <p className="text-gray-600 mb-4">
              No attendance records found for the selected filters.
            </p>
            <Button 
              onClick={onRefresh} 
              variant="outline"
              className="bg-white/8 backdrop-blur-md border-white/25 text-white hover:bg-white/12 hover:border-white/40"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Attendance Logs</h3>
          <p className="text-sm text-gray-600">
            {attendances.length} attendance record(s) found
          </p>
        </div>
        <Button 
          onClick={onRefresh} 
          variant="outline" 
          size="sm"
          className="bg-white/8 backdrop-blur-md border-white/25 text-white hover:bg-white/12 hover:border-white/40"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Attendance Records by Date */}
      {sortedDates.map((date) => (
        <Card key={date}>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              {format(new Date(date), 'EEEE, MMMM d, yyyy')}
            </CardTitle>
            <CardDescription>
              {groupedAttendances[date].length} attendance record(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Desktop Table */}
            <div className="hidden md:block">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-sm text-gray-600">
                      <th className="text-left py-2">Player</th>
                      <th className="text-left py-2">Team</th>
                      <th className="text-left py-2">Session</th>
                      <th className="text-left py-2">Status</th>
                      <th className="text-left py-2">Marked By</th>
                      <th className="text-left py-2">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupedAttendances[date].map((attendance) => (
                      <tr key={attendance.id} className="border-b last:border-b-0 hover:bg-black/20 hover:backdrop-blur-sm">
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-400" />
                            <span className="font-medium">
                              {attendance.users?.name || attendance.users?.email || 'Unknown'}
                            </span>
                          </div>
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-gray-400" />
                            <span>{attendance.teams?.name || 'Unknown Team'}</span>
                          </div>
                        </td>
                        <td className="py-3">
                          {getSessionBadge(attendance.session_time)}
                        </td>
                        <td className="py-3">
                          {getStatusBadge(attendance.status)}
                        </td>
                        <td className="py-3">
                          {attendance.marked_by_user ? (
                            <span className="text-sm text-gray-600">
                              {attendance.marked_by_user.name || attendance.marked_by_user.email}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400 italic">
                              {attendance.status === 'Auto (Match)' ? 'System' : 'Unknown'}
                            </span>
                          )}
                        </td>
                        <td className="py-3">
                          <span className="text-sm text-gray-500">
                            {format(new Date(attendance.created_at), 'HH:mm')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {groupedAttendances[date].map((attendance) => (
                <Card key={attendance.id} className="p-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">
                          {attendance.users?.name || attendance.users?.email || 'Unknown'}
                        </span>
                      </div>
                      {getStatusBadge(attendance.status)}
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Users className="h-4 w-4" />
                      <span>{attendance.teams?.name || 'Unknown Team'}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      {getSessionBadge(attendance.session_time)}
                      <span className="text-sm text-gray-500">
                        {format(new Date(attendance.created_at), 'HH:mm')}
                      </span>
                    </div>
                    
                    {attendance.marked_by_user && (
                      <div className="text-sm text-gray-600">
                        Marked by: {attendance.marked_by_user.name || attendance.marked_by_user.email}
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}