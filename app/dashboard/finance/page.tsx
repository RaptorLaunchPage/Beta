"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { useAuthV2 as useAuth } from "@/hooks/use-auth-v2"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ResponsiveTabs, TabsContent } from "@/components/ui/enhanced-tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { 
  IndianRupee, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Download, 
  Trophy,
  CreditCard,
  Wallet,
  PieChart,
  BarChart3,
  Calendar,
  RefreshCw,
  Trash2,
  Save,
  X,
  AlertCircle
} from "lucide-react"
import { DashboardPermissions, type UserRole } from "@/lib/dashboard-permissions"
import { SendToDiscordButton } from "@/components/discord-portal/send-to-discord-button"
import type { Database } from "@/lib/supabase"

type Team = Database["public"]["Tables"]["teams"]["Row"]
type SlotExpense = Database["public"]["Tables"]["slot_expenses"]["Row"] & {
  team?: { name: string } | null
  slot?: Database["public"]["Tables"]["slots"]["Row"] | null
}
type Winning = Database["public"]["Tables"]["winnings"]["Row"] & {
  team?: { name: string } | null
  slot?: Database["public"]["Tables"]["slots"]["Row"] | null
}

interface FinancialSummary {
  totalExpenses: number
  totalWinnings: number
  netProfitLoss: number
  monthlyExpenses: number
  monthlyWinnings: number
  expensesByCategory: { [key: string]: number }
  winningsByTeam: { [key: string]: number }
}

interface NewExpense {
  team_id: string
  organizer: string
  amount: number
  description: string
  date: string
}

interface NewWinning {
  team_id: string
  organizer: string
  amount: number
  position: number
  date: string
}

export default function FinancePage() {
  // NOTE: data fetching hooks gated by profile.id downstream

  const { profile } = useAuth()
  const { toast } = useToast()
  
  // State management
  const [expenses, setExpenses] = useState<SlotExpense[]>([])
  const [winnings, setWinnings] = useState<Winning[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dataFetched, setDataFetched] = useState(false)
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary>({
    totalExpenses: 0,
    totalWinnings: 0,
    netProfitLoss: 0,
    monthlyExpenses: 0,
    monthlyWinnings: 0,
    expensesByCategory: {},
    winningsByTeam: {}
  })
  const [activeTab, setActiveTab] = useState("overview")
  const [selectedTeam, setSelectedTeam] = useState<string>("all")
  const [isDataFetching, setIsDataFetching] = useState(false)
  const hasInitialized = useRef(false)
  
  // Dialog states
  const [showAddExpense, setShowAddExpense] = useState(false)
  const [showAddWinning, setShowAddWinning] = useState(false)
  
  // Form states
  const [newExpense, setNewExpense] = useState<NewExpense>({
    team_id: "",
    organizer: "",
    amount: 0,
    description: "",
    date: new Date().toISOString().split('T')[0]
  })
  
  const [newWinning, setNewWinning] = useState<NewWinning>({
    team_id: "",
    organizer: "",
    amount: 0,
    position: 1,
    date: new Date().toISOString().split('T')[0]
  })

  const userRole = profile?.role as UserRole
  const financePermissions = DashboardPermissions.getDataPermissions(userRole, 'finance')

  // Filter data based on selected team
  const filteredExpenses = useMemo(() => {
    if (selectedTeam === 'all') return expenses
    return expenses.filter(expense => expense.team_id === selectedTeam)
  }, [expenses, selectedTeam])

  const filteredWinnings = useMemo(() => {
    if (selectedTeam === 'all') return winnings
    return winnings.filter(winning => winning.team_id === selectedTeam)
  }, [winnings, selectedTeam])

  // Calculate filtered financial summary
  const filteredFinancialSummary = useMemo(() => {
    const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + (expense.total || 0), 0)
    const totalWinnings = filteredWinnings.reduce((sum, winning) => sum + (winning.amount_won || 0), 0)
    const netProfitLoss = totalWinnings - totalExpenses
    
    // Calculate monthly figures (current month)
    const currentMonth = new Date().getMonth()
    const currentYear = new Date().getFullYear()
    
    const monthlyExpenses = filteredExpenses
      .filter(expense => {
        const expenseDate = new Date(expense.created_at || '')
        return expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear
      })
      .reduce((sum, expense) => sum + (expense.total || 0), 0)
      
    const monthlyWinnings = filteredWinnings
      .filter(winning => {
        const winningDate = new Date(winning.created_at || '')
        return winningDate.getMonth() === currentMonth && winningDate.getFullYear() === currentYear
      })
      .reduce((sum, winning) => sum + (winning.amount_won || 0), 0)
    
    // Group expenses by category
    const expensesByCategory: { [key: string]: number } = {}
    filteredExpenses.forEach(expense => {
      const category = expense.slot?.organizer || expense.team?.name || 'Unknown'
      expensesByCategory[category] = (expensesByCategory[category] || 0) + (expense.total || 0)
    })
    
    // Group winnings by team
    const winningsByTeam: { [key: string]: number } = {}
    filteredWinnings.forEach(winning => {
      const teamName = winning.team?.name || 'Unknown Team'
      winningsByTeam[teamName] = (winningsByTeam[teamName] || 0) + (winning.amount_won || 0)
    })

    return {
      totalExpenses,
      totalWinnings,
      netProfitLoss,
      monthlyExpenses,
      monthlyWinnings,
      expensesByCategory,
      winningsByTeam
    }
  }, [filteredExpenses, filteredWinnings])

  useEffect(() => {
    // Wait for auth to fully initialize
    if (profile === null) {
      return
    }

    // Only run once when profile becomes available and we haven't initialized yet
    if (hasInitialized.current || isDataFetching) {
      return
    }

    hasInitialized.current = true
    
    if (financePermissions.canView) {
      fetchFinancialData()
    } else {
      setError(`Access denied: ${profile.role} role cannot access finance module. Required: admin or manager role.`)
      setLoading(false)
    }
  }, [profile, financePermissions.canView])

  const fetchFinancialData = async () => {
    if (isDataFetching) return
    
    setIsDataFetching(true)
    setLoading(true)
    setError(null)

    const timeoutId = setTimeout(() => {
      setError("Request timeout. Please try again.")
      setLoading(false)
      setIsDataFetching(false)
    }, 30000)

    try {
      await Promise.all([
        fetchTeams(),
        fetchExpenses(),
        fetchWinnings()
      ])
      
      calculateFinancialSummary()
      
    } catch (error: any) {
      console.error("Error fetching financial data:", error)
      setError(error.message || "Failed to fetch financial data")
      
      toast({
        title: "Error",
        description: error.message || "Failed to fetch financial data",
        variant: "destructive",
      })
    } finally {
      clearTimeout(timeoutId)
      setLoading(false)
      setIsDataFetching(false)
    }
  }

  const fetchExpenses = async () => {
    try {
      const { data, error } = await supabase
        .from("slot_expenses")
        .select(`
          *,
          team:team_id(name),
          slot:slot_id(organizer, time_range, date, number_of_slots, slot_rate, notes)
        `)
        .order("created_at", { ascending: false })

      if (error) {
        console.error('Expenses query failed:', error)
        // Fallback to simple query
        const { data: simpleData, error: simpleError } = await supabase
          .from("slot_expenses")
          .select("*")
          .order("created_at", { ascending: false })
          
        if (simpleError) throw simpleError
        setExpenses(simpleData || [])
        return
      }
      
      setExpenses(data || [])
    } catch (error: any) {
      console.error("Error fetching expenses:", error)
      setExpenses([])
    }
  }

  const fetchWinnings = async () => {
    try {
      const { data, error } = await supabase
        .from("winnings")
        .select(`
          *,
          team:team_id(name),
          slot:slot_id(organizer, time_range, date, number_of_slots, slot_rate, notes)
        `)
        .order("created_at", { ascending: false })

      if (error) {
        console.error('Winnings query failed:', error)
        // Fallback to simple query
        const { data: simpleData, error: simpleError } = await supabase
          .from("winnings")
          .select("*")
          .order("created_at", { ascending: false })
          
        if (simpleError) throw simpleError
        setWinnings(simpleData || [])
        return
      }
      
      setWinnings(data || [])
    } catch (error: any) {
      console.error("Error fetching winnings:", error)
      setWinnings([])
    }
  }

  const fetchTeams = async () => {
    try {
      const { data, error } = await supabase
        .from("teams")
        .select("*")
        .order("name")

      if (error) throw error
      setTeams(data || [])
    } catch (error: any) {
      console.error("Error fetching teams:", error)
      setTeams([])
    }
  }

  const calculateFinancialSummary = () => {
    try {
      const totalExpenses = expenses.reduce((sum, expense) => sum + (expense.total || 0), 0)
      const totalWinnings = winnings.reduce((sum, winning) => sum + (winning.amount_won || 0), 0)
      const netProfitLoss = totalWinnings - totalExpenses
      
      // Calculate monthly figures (current month)
      const currentMonth = new Date().getMonth()
      const currentYear = new Date().getFullYear()
      
      const monthlyExpenses = expenses
        .filter(expense => {
          const expenseDate = new Date(expense.created_at || '')
          return expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear
        })
        .reduce((sum, expense) => sum + (expense.total || 0), 0)
        
      const monthlyWinnings = winnings
        .filter(winning => {
          const winningDate = new Date(winning.created_at || '')
          return winningDate.getMonth() === currentMonth && winningDate.getFullYear() === currentYear
        })
        .reduce((sum, winning) => sum + (winning.amount_won || 0), 0)
      
      // Group expenses by category
      const expensesByCategory: { [key: string]: number } = {}
      expenses.forEach(expense => {
        const category = expense.slot?.organizer || expense.team?.name || 'Unknown'
        expensesByCategory[category] = (expensesByCategory[category] || 0) + (expense.total || 0)
      })
      
      // Group winnings by team
      const winningsByTeam: { [key: string]: number } = {}
      winnings.forEach(winning => {
        const teamName = winning.team?.name || 'Unknown Team'
        winningsByTeam[teamName] = (winningsByTeam[teamName] || 0) + (winning.amount_won || 0)
      })

      setFinancialSummary({
        totalExpenses,
        totalWinnings,
        netProfitLoss,
        monthlyExpenses,
        monthlyWinnings,
        expensesByCategory,
        winningsByTeam
      })
      
    } catch (error: any) {
      console.error("Error calculating financial summary:", error)
    }
  }

  const addExpense = async () => {
    if (!newExpense.team_id || !newExpense.organizer || newExpense.amount <= 0) {
      toast({
        title: "Validation Error",
        description: "Please fill all required fields with valid values",
        variant: "destructive",
      })
      return
    }

    try {
      // Create a slot entry first
      const { data: slotData, error: slotError } = await supabase
        .from("slots")
        .insert({
          team_id: newExpense.team_id,
          organizer: newExpense.organizer,
          time_range: "Custom Entry",
          match_count: 1,
          date: newExpense.date,
          number_of_slots: 1,
          slot_rate: newExpense.amount,
          notes: newExpense.description
        })
        .select()
        .single()

      if (slotError) throw slotError

      // Create the expense entry
      const { error: expenseError } = await supabase
        .from("slot_expenses")
        .insert({
          slot_id: slotData.id,
          team_id: newExpense.team_id,
          rate: newExpense.amount,
          total: newExpense.amount
        })

      if (expenseError) throw expenseError

      toast({
        title: "Success",
        description: "Expense added successfully",
      })

      setShowAddExpense(false)
      setNewExpense({
        team_id: "",
        organizer: "",
        amount: 0,
        description: "",
        date: new Date().toISOString().split('T')[0]
      })
      
      fetchFinancialData()
    } catch (error: any) {
      console.error("Error adding expense:", error)
      toast({
        title: "Error",
        description: `Failed to add expense: ${error.message}`,
        variant: "destructive",
      })
    }
  }

  const addWinning = async () => {
    if (!newWinning.team_id || !newWinning.organizer || newWinning.amount <= 0 || newWinning.position <= 0) {
      toast({
        title: "Validation Error",
        description: "Please fill all required fields with valid values",
        variant: "destructive",
      })
      return
    }

    try {
      // Create a slot entry first
      const { data: slotData, error: slotError } = await supabase
        .from("slots")
        .insert({
          team_id: newWinning.team_id,
          organizer: newWinning.organizer,
          time_range: "Tournament",
          match_count: 1,
          date: newWinning.date,
          number_of_slots: 1,
          slot_rate: 0,
          notes: `Position ${newWinning.position} finish`
        })
        .select()
        .single()

      if (slotError) throw slotError

      // Create the winning entry
      const { error: winningError } = await supabase
        .from("winnings")
        .insert({
          slot_id: slotData.id,
          team_id: newWinning.team_id,
          position: newWinning.position,
          amount_won: newWinning.amount
        })

      if (winningError) throw winningError

      toast({
        title: "Success",
        description: "Winning added successfully",
      })

      setShowAddWinning(false)
      setNewWinning({
        team_id: "",
        organizer: "",
        amount: 0,
        position: 1,
        date: new Date().toISOString().split('T')[0]
      })
      
      fetchFinancialData()
    } catch (error: any) {
      console.error("Error adding winning:", error)
      toast({
        title: "Error",
        description: `Failed to add winning: ${error.message}`,
        variant: "destructive",
      })
    }
  }

  const deleteExpense = async (expenseId: string) => {
    if (!confirm("Are you sure you want to delete this expense?")) {
      return
    }

    try {
      const { error } = await supabase
        .from("slot_expenses")
        .delete()
        .eq("id", expenseId)

      if (error) throw error

      toast({
        title: "Success",
        description: "Expense deleted successfully",
      })

      fetchFinancialData()
    } catch (error: any) {
      console.error("Error deleting expense:", error)
      toast({
        title: "Error",
        description: `Failed to delete expense: ${error.message}`,
        variant: "destructive",
      })
    }
  }

  const deleteWinning = async (winningId: string) => {
    if (!confirm("Are you sure you want to delete this winning?")) {
      return
    }

    try {
      const { error } = await supabase
        .from("winnings")
        .delete()
        .eq("id", winningId)

      if (error) throw error

      toast({
        title: "Success",
        description: "Winning deleted successfully",
      })

      fetchFinancialData()
    } catch (error: any) {
      console.error("Error deleting winning:", error)
      toast({
        title: "Error",
        description: `Failed to delete winning: ${error.message}`,
        variant: "destructive",
      })
    }
  }

  const handleRefresh = () => {
    hasInitialized.current = false
    setError(null)
    setTeams([])
    setExpenses([])
    setWinnings([])
    setIsDataFetching(false)
    setLoading(true)
    
    setTimeout(() => {
      hasInitialized.current = true
      fetchFinancialData()
    }, 100)
  }

  const handleExport = () => {
    // Create CSV data
    const csvData = [
      ['Type', 'Date', 'Team', 'Organizer', 'Amount', 'Description'],
      ...filteredExpenses.map(expense => [
        'Expense',
        expense.slot?.date || expense.created_at?.split('T')[0] || '',
        expense.team?.name || 'Unknown',
        expense.slot?.organizer || 'Unknown',
        expense.total || 0,
        expense.slot?.notes || ''
      ]),
      ...filteredWinnings.map(winning => [
        'Winning',
        winning.slot?.date || winning.created_at?.split('T')[0] || '',
        winning.team?.name || 'Unknown',
        winning.slot?.organizer || 'Unknown',
        winning.amount_won || 0,
        `Position ${winning.position}`
      ])
    ]

    const csvContent = csvData.map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `finance-report-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)

    toast({
      title: "Export Complete",
      description: "Financial data exported successfully",
    })
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <div>
            <h3 className="text-lg font-semibold">Loading Profile</h3>
            <p className="text-gray-600">Checking authentication...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!financePermissions.canView) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
                          <IndianRupee className="h-16 w-16 text-red-500 mx-auto" />
          <div>
            <h3 className="text-xl font-semibold text-white">Access Denied</h3>
            <p className="text-gray-600">You don't have permission to access financial data.</p>
            <p className="text-sm text-gray-500 mt-2">Current role: {profile?.role}</p>
            <p className="text-xs text-gray-400">Required: admin or manager role</p>
          </div>
        </div>
      </div>
    )
  }

  if (loading || isDataFetching) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <div>
            <h3 className="text-lg font-semibold">Loading Finance Data</h3>
            <p className="text-gray-600">Fetching financial information...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Finance Management</h1>
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <AlertCircle className="h-16 w-16 text-red-500 mx-auto" />
              <div>
                <h3 className="text-xl font-semibold text-white">Failed to Load Financial Data</h3>
                <p className="text-gray-600 mt-2">{error}</p>
                <Button onClick={handleRefresh} className="mt-4">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Finance Management</h1>
          <p className="text-muted-foreground">
            Track expenses, winnings, and financial performance
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleRefresh} variant="outline" size="sm" disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {financePermissions.canExport && (
            <Button onClick={handleExport} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          )}
        </div>
      </div>

      {/* Team Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5" />
            Filters
          </CardTitle>
          <CardDescription>Filter financial data by team</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Team</Label>
              <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                <SelectTrigger>
                  <SelectValue placeholder="All Teams" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Teams</SelectItem>
                  {teams.map(team => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <ResponsiveTabs 
        tabs={[
          {
            value: "overview",
            label: "Overview",
            icon: PieChart
          },
          {
            value: "expenses",
            label: "Expenses",
            icon: CreditCard
          },
          {
            value: "winnings",
            label: "Winnings",
            icon: Trophy
          },
          {
            value: "reports",
            label: "Reports",
            icon: BarChart3
          }
        ]}
        value={activeTab}
        onValueChange={setActiveTab}
        defaultValue="overview"
        variant="default"
        size="md"
        responsiveMode="auto"
        className="space-y-6"
      >

        <TabsContent value="overview" className="space-y-6">
          {/* Financial Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-sm font-medium">Total Winnings</p>
                    <p className="text-2xl font-bold">₹{filteredFinancialSummary.totalWinnings.toLocaleString()}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-200" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-red-500 to-red-600 text-white">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-red-100 text-sm font-medium">Total Expenses</p>
                    <p className="text-2xl font-bold">₹{filteredFinancialSummary.totalExpenses.toLocaleString()}</p>
                  </div>
                  <TrendingDown className="h-8 w-8 text-red-200" />
                </div>
              </CardContent>
            </Card>

            <Card className={`${filteredFinancialSummary.netProfitLoss >= 0 ? 'bg-gradient-to-r from-blue-500 to-blue-600' : 'bg-gradient-to-r from-orange-500 to-orange-600'} text-white`}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm font-medium">Net P&L</p>
                                    <p className="text-2xl font-bold">
                ₹{Math.abs(filteredFinancialSummary.netProfitLoss).toLocaleString()}
                {filteredFinancialSummary.netProfitLoss < 0 && <span className="text-sm ml-1">(Loss)</span>}
              </p>
                  </div>
                  <Wallet className="h-8 w-8 text-blue-200" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm font-medium">This Month</p>
                    <p className="text-2xl font-bold">₹{(filteredFinancialSummary.monthlyWinnings - filteredFinancialSummary.monthlyExpenses).toLocaleString()}</p>
                  </div>
                  <Calendar className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Send to Discord */}
          {(filteredExpenses.length > 0 || filteredWinnings.length > 0) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Share Financial Report
                  <SendToDiscordButton
                    messageType="expense_summary"
                    data={{
                      team_name: selectedTeam !== 'all' 
                        ? teams.find(t => t.id === selectedTeam)?.name || 'All Teams'
                        : 'All Teams',
                      date_range: 'Recent period',
                      total_slots: filteredExpenses.length,
                      total_expense: filteredFinancialSummary.totalExpenses,
                      avg_slot_rate: filteredExpenses.length > 0 
                        ? Math.round(filteredFinancialSummary.totalExpenses / filteredExpenses.length)
                        : 0,
                      highest_expense_day: {
                        date: 'Recent',
                        amount: Math.max(...filteredExpenses.map(e => e.total), 0)
                      }
                    }}
                    teamId={selectedTeam !== 'all' ? selectedTeam : profile?.team_id}
                    variant="outline"
                    webhookTypes={['admin']} // Finance data only to admin channels
                  />
                </CardTitle>
                <CardDescription>
                  Send current financial summary to Discord (Admin only)
                </CardDescription>
              </CardHeader>
            </Card>
          )}

          {/* Breakdown sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Expense Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Expense Breakdown</CardTitle>
                <CardDescription>Expenses by organizer/category</CardDescription>
              </CardHeader>
              <CardContent>
                              {Object.keys(filteredFinancialSummary.expensesByCategory).length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(filteredFinancialSummary.expensesByCategory).map(([category, amount]) => (
                    <div key={category} className="flex items-center justify-between">
                      <span className="font-medium">{category}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          ₹{amount.toLocaleString()}
                        </span>
                        <Badge variant="outline">
                          {((amount / filteredFinancialSummary.totalExpenses) * 100).toFixed(1)}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
                ) : (
                  <div className="text-center py-8">
                    <PieChart className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">No Expense Data</h3>
                    <p className="text-muted-foreground">
                      No expenses have been recorded yet.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Winnings Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Winnings by Team</CardTitle>
                <CardDescription>Prize money earned by each team</CardDescription>
              </CardHeader>
              <CardContent>
                              {Object.keys(filteredFinancialSummary.winningsByTeam).length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(filteredFinancialSummary.winningsByTeam).map(([team, amount]) => (
                    <div key={team} className="flex items-center justify-between">
                      <span className="font-medium">{team}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          ₹{amount.toLocaleString()}
                        </span>
                        <Badge variant="outline">
                          {((amount / filteredFinancialSummary.totalWinnings) * 100).toFixed(1)}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
                ) : (
                  <div className="text-center py-8">
                    <Trophy className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">No Winnings Data</h3>
                    <p className="text-muted-foreground">
                      No tournament winnings recorded yet.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="expenses" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Expenses</CardTitle>
                <CardDescription>Manage tournament slot bookings and other expenses</CardDescription>
              </div>
              {financePermissions.canCreate && (
                <Dialog open={showAddExpense} onOpenChange={setShowAddExpense}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Expense
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Expense</DialogTitle>
                      <DialogDescription>
                        Record a new tournament or organization expense
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Team</Label>
                        <Select value={newExpense.team_id} onValueChange={(value) => setNewExpense({...newExpense, team_id: value})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select team" />
                          </SelectTrigger>
                          <SelectContent>
                            {teams.map((team) => (
                              <SelectItem key={team.id} value={team.id}>
                                {team.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Organizer/Event</Label>
                        <Input
                          value={newExpense.organizer}
                          onChange={(e) => setNewExpense({...newExpense, organizer: e.target.value})}
                          placeholder="Tournament or event organizer"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Amount (₹)</Label>
                        <Input
                          type="number"
                          value={newExpense.amount}
                          onChange={(e) => setNewExpense({...newExpense, amount: parseFloat(e.target.value) || 0})}
                          placeholder="0"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Input
                          value={newExpense.description}
                          onChange={(e) => setNewExpense({...newExpense, description: e.target.value})}
                          placeholder="Additional details"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Date</Label>
                        <Input
                          type="date"
                          value={newExpense.date}
                          onChange={(e) => setNewExpense({...newExpense, date: e.target.value})}
                        />
                      </div>
                      
                      <div className="flex gap-2">
                        <Button onClick={addExpense} className="flex-1">
                          <Save className="h-4 w-4 mr-2" />
                          Add Expense
                        </Button>
                        <Button variant="outline" onClick={() => setShowAddExpense(false)}>
                          <X className="h-4 w-4 mr-2" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead>Organizer</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExpenses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        <div className="flex flex-col items-center gap-2">
                          <CreditCard className="h-8 w-8 text-gray-400" />
                          <p className="text-lg font-medium">No expenses recorded yet</p>
                          <p className="text-sm">Add your first expense to get started</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredExpenses.map((expense) => (
                      <TableRow key={expense.id}>
                        <TableCell>
                          {expense.slot?.date || new Date(expense.created_at || '').toLocaleDateString()}
                        </TableCell>
                        <TableCell>{expense.team?.name || 'Unknown Team'}</TableCell>
                        <TableCell>{expense.slot?.organizer || 'Unknown'}</TableCell>
                        <TableCell>₹{(expense.total || 0).toLocaleString()}</TableCell>
                        <TableCell>{expense.slot?.notes || '-'}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {financePermissions.canDelete && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => deleteExpense(expense.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="winnings" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Tournament Winnings</CardTitle>
                <CardDescription>Track prize money and tournament results</CardDescription>
              </div>
              {financePermissions.canCreate && (
                <Dialog open={showAddWinning} onOpenChange={setShowAddWinning}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Winning
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Tournament Winning</DialogTitle>
                      <DialogDescription>
                        Record a new tournament prize winning
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Team</Label>
                        <Select value={newWinning.team_id} onValueChange={(value) => setNewWinning({...newWinning, team_id: value})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select team" />
                          </SelectTrigger>
                          <SelectContent>
                            {teams.map((team) => (
                              <SelectItem key={team.id} value={team.id}>
                                {team.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Tournament/Event</Label>
                        <Input
                          value={newWinning.organizer}
                          onChange={(e) => setNewWinning({...newWinning, organizer: e.target.value})}
                          placeholder="Tournament name or organizer"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Prize Amount (₹)</Label>
                        <Input
                          type="number"
                          value={newWinning.amount}
                          onChange={(e) => setNewWinning({...newWinning, amount: parseFloat(e.target.value) || 0})}
                          placeholder="0"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Position</Label>
                        <Select 
                          value={newWinning.position.toString()} 
                          onValueChange={(value) => setNewWinning({...newWinning, position: parseInt(value)})}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1st Place</SelectItem>
                            <SelectItem value="2">2nd Place</SelectItem>
                            <SelectItem value="3">3rd Place</SelectItem>
                            <SelectItem value="4">4th Place</SelectItem>
                            <SelectItem value="5">5th Place</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Date</Label>
                        <Input
                          type="date"
                          value={newWinning.date}
                          onChange={(e) => setNewWinning({...newWinning, date: e.target.value})}
                        />
                      </div>
                      
                      <div className="flex gap-2">
                        <Button onClick={addWinning} className="flex-1">
                          <Save className="h-4 w-4 mr-2" />
                          Add Winning
                        </Button>
                        <Button variant="outline" onClick={() => setShowAddWinning(false)}>
                          <X className="h-4 w-4 mr-2" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead>Tournament</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Prize Money</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredWinnings.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        <div className="flex flex-col items-center gap-2">
                          <Trophy className="h-8 w-8 text-gray-400" />
                          <p className="text-lg font-medium">No winnings recorded yet</p>
                          <p className="text-sm">Add your first tournament win to get started</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredWinnings.map((winning) => (
                      <TableRow key={winning.id}>
                        <TableCell>
                          {winning.slot?.date || new Date(winning.created_at || '').toLocaleDateString()}
                        </TableCell>
                        <TableCell>{winning.team?.name || 'Unknown Team'}</TableCell>
                        <TableCell>{winning.slot?.organizer || 'Unknown Tournament'}</TableCell>
                        <TableCell>
                          <Badge variant={winning.position === 1 ? "default" : "outline"}>
                            {winning.position === 1 ? "🥇" : winning.position === 2 ? "🥈" : winning.position === 3 ? "🥉" : `#${winning.position}`} 
                            {" "}
                            {winning.position === 1 ? "1st" : winning.position === 2 ? "2nd" : winning.position === 3 ? "3rd" : `${winning.position}th`}
                          </Badge>
                        </TableCell>
                        <TableCell>₹{(winning.amount_won || 0).toLocaleString()}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {financePermissions.canDelete && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => deleteWinning(winning.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Financial Reports</CardTitle>
              <CardDescription>Comprehensive financial analysis and reports</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold mb-2">Total Transactions</h3>
                  <p className="text-2xl font-bold">{filteredExpenses.length + filteredWinnings.length}</p>
                                  <p className="text-sm text-muted-foreground">
                  {filteredExpenses.length} expenses, {filteredWinnings.length} winnings
                </p>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold mb-2">Average Win Amount</h3>
                  <p className="text-2xl font-bold">
                    ₹{filteredWinnings.length > 0 ? Math.round(filteredFinancialSummary.totalWinnings / filteredWinnings.length).toLocaleString() : 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Per tournament win</p>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold mb-2">ROI</h3>
                  <p className="text-2xl font-bold">
                    {filteredFinancialSummary.totalExpenses > 0 
                      ? `${((filteredFinancialSummary.totalWinnings / filteredFinancialSummary.totalExpenses - 1) * 100).toFixed(1)}%`
                      : "N/A"
                    }
                  </p>
                  <p className="text-sm text-muted-foreground">Return on Investment</p>
                </div>
              </div>
              
              <div className="mt-6">
                <Button onClick={handleExport} className="w-full md:w-auto">
                  <Download className="h-4 w-4 mr-2" />
                  Export Detailed Report
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </ResponsiveTabs>
    </div>
  )
}