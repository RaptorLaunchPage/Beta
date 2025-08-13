"use client"

import type React from "react"

import { useState, useRef } from "react"
import { useAuthV2 as useAuth } from "@/hooks/use-auth-v2"
import { supabase } from "@/lib/supabase"
import { OCRService } from "@/lib/ocr-service"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { Upload, Wand2, RefreshCw } from "lucide-react"
import type { Database } from "@/lib/supabase"

type UserProfile = Database["public"]["Tables"]["users"]["Row"]

interface OCRExtractProps {
  users: UserProfile[]
  onPerformanceAdded: () => void
}

interface ParsedRow {
  id: string
  player_name: string
  kills: string
  assists: string
  damage: string
  survival_time: string
  player_id: string
}

const MAPS = ["Erangle", "Miramar", "Sanhok", "Vikendi", "Rondo"]

export function OCRExtract({ users, onPerformanceAdded }: OCRExtractProps) {
  const { profile } = useAuth()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [ocrProgress, setOcrProgress] = useState(0)
  const [screenshot, setScreenshot] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [ocrConfidence, setOcrConfidence] = useState<number | null>(null)
  const [matchData, setMatchData] = useState({
    match_number: "",
    slot: "",
    map: "",
    placement: "",
  })
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([
    { id: "1", player_name: "", kills: "", assists: "", damage: "", survival_time: "", player_id: "default" },
    { id: "2", player_name: "", kills: "", assists: "", damage: "", survival_time: "", player_id: "default" },
    { id: "3", player_name: "", kills: "", assists: "", damage: "", survival_time: "", player_id: "default" },
    { id: "4", player_name: "", kills: "", assists: "", damage: "", survival_time: "", player_id: "default" },
  ])

  const uploadScreenshot = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!profile || !event.target.files || event.target.files.length === 0) {
      return
    }

    const file = event.target.files[0]
    setSelectedFile(file)

    // Create preview URL
    const previewUrl = URL.createObjectURL(file)
    setScreenshot(previewUrl)

    const fileExt = file.name.split(".").pop()
    const fileName = `${Date.now()}.${fileExt}`
    const filePath = `${profile.id}/${fileName}`

    setUploading(true)
    try {
      const { error: uploadError } = await supabase.storage.from("ocr_uploads").upload(filePath, file)

      if (uploadError) throw uploadError

      toast({
        title: "Success",
        description: "Screenshot uploaded successfully. Click 'Extract Data' to process it.",
      })
    } catch (error) {
      console.error("Error uploading screenshot:", error)
      toast({
        title: "Error",
        description: "Failed to upload screenshot",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  const extractDataFromImage = async () => {
    if (!selectedFile) {
      toast({
        title: "Error",
        description: "Please upload a screenshot first",
        variant: "destructive",
      })
      return
    }

    setProcessing(true)
    setOcrProgress(0)

    try {
      const extractedData = await OCRService.processScreenshot(selectedFile, (progress) => {
        setOcrProgress(progress)
      })

      // Update parsed rows with extracted data
      const updatedRows = parsedRows.map((row, index) => {
        const data = extractedData[index]
        if (data) {
          return {
            ...row,
            player_name: data.player_name || row.player_name,
            kills: data.kills || row.kills,
            assists: data.assists || row.assists,
            damage: data.damage || row.damage,
            survival_time: data.survival_time || row.survival_time,
          }
        }
        return row
      })

      setParsedRows(updatedRows)
      setOcrConfidence(85)

      toast({
        title: "Success",
        description: `Data extracted successfully! Review player names and map to your team members.`,
      })

      // Reset progress after showing completion
      setTimeout(() => {
        setOcrProgress(0)
      }, 2000)
    } catch (error: any) {
      console.error("OCR processing error:", error)
      setOcrProgress(0)

      toast({
        title: "OCR Error",
        description: error.message || "Failed to extract data from image",
        variant: "destructive",
      })
    } finally {
      setProcessing(false)
    }
  }

  const updateParsedRow = (id: string, field: keyof ParsedRow, value: string) => {
    setParsedRows((rows) => rows.map((row) => (row.id === id ? { ...row, [field]: value } : row)))
  }

  const clearAllData = () => {
    setParsedRows([
      { id: "1", player_name: "", kills: "", assists: "", damage: "", survival_time: "", player_id: "default" },
      { id: "2", player_name: "", kills: "", assists: "", damage: "", survival_time: "", player_id: "default" },
      { id: "3", player_name: "", kills: "", assists: "", damage: "", survival_time: "", player_id: "default" },
      { id: "4", player_name: "", kills: "", assists: "", damage: "", survival_time: "", player_id: "default" },
    ])
    setOcrConfidence(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return

    // Validate that each player is only mapped once
    const mappedPlayers = parsedRows.filter((row) => row.player_id !== "default").map((row) => row.player_id)
    const uniquePlayers = new Set(mappedPlayers)

    if (mappedPlayers.length !== uniquePlayers.size) {
      toast({
        title: "Error",
        description: "Each player can only be mapped to one row",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const performancesToInsert = parsedRows
        .filter((row) => row.player_id !== "default" && (row.kills || row.assists || row.damage || row.survival_time))
        .map((row) => {
          const selectedPlayer = users.find((u) => u.id === row.player_id)
          return {
            player_id: row.player_id,
            team_id: selectedPlayer?.team_id || null,
            match_number: Number.parseInt(matchData.match_number),
            slot: Number.parseInt(matchData.slot),
            map: matchData.map,
            placement: matchData.placement ? Number.parseInt(matchData.placement) : null,
            kills: Number.parseInt(row.kills) || 0,
            assists: Number.parseInt(row.assists) || 0,
            damage: Number.parseFloat(row.damage) || 0,
            survival_time: Number.parseFloat(row.survival_time) || 0,
            added_by: profile.id,
          }
        })

      if (performancesToInsert.length === 0) {
        toast({
          title: "Error",
          description: "Please map at least one row to a player with performance data",
          variant: "destructive",
        })
        return
      }

      const token = await supabase.auth.getSession().then(s => s.data.session?.access_token)
      const res = await fetch('/api/performances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(performancesToInsert[0])
      })
      if (!res.ok) throw new Error('Failed to submit performances')

      toast({
        title: "Success",
        description: `${performancesToInsert.length} performance records added successfully`,
      })

      // Reset form
      setMatchData({ match_number: "", slot: "", map: "", placement: "" })
      setParsedRows([
        { id: "1", player_name: "", kills: "", assists: "", damage: "", survival_time: "", player_id: "default" },
        { id: "2", player_name: "", kills: "", assists: "", damage: "", survival_time: "", player_id: "default" },
        { id: "3", player_name: "", kills: "", assists: "", damage: "", survival_time: "", player_id: "default" },
        { id: "4", player_name: "", kills: "", assists: "", damage: "", survival_time: "", player_id: "default" },
      ])
      setScreenshot(null)
      setSelectedFile(null)
      setOcrConfidence(null)

      onPerformanceAdded()
    } catch (error: any) {
      console.error("Error adding performances:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to add performance data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>OCR Screenshot Processing</CardTitle>
          <CardDescription>
            Upload a screenshot of match results to extract: Player Names, Kills, Assists, Damage, and Survival Time
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              <Upload className="h-4 w-4 mr-2" />
              {uploading ? "Uploading..." : "Upload Screenshot"}
            </Button>

            {selectedFile && (
              <Button onClick={extractDataFromImage} disabled={processing} variant="secondary">
                <Wand2 className="h-4 w-4 mr-2" />
                {processing ? "Extracting..." : "Extract Data"}
              </Button>
            )}

            {ocrConfidence && (
              <Button onClick={clearAllData} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Clear Data
              </Button>
            )}

            <input ref={fileInputRef} type="file" accept="image/*" onChange={uploadScreenshot} className="hidden" />
          </div>

          {processing && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Processing image...</span>
                <span>{ocrProgress}%</span>
              </div>
              <Progress value={ocrProgress} className="w-full" />
            </div>
          )}

          {ocrConfidence && (
            <Alert>
              <AlertDescription>
                OCR processing completed with {ocrConfidence}% confidence. Review the extracted player names and stats
                below, then map each row to your team members.
              </AlertDescription>
            </Alert>
          )}

          {screenshot && (
            <div className="mt-4">
              <img
                src={screenshot || "/placeholder.svg"}
                alt="Uploaded screenshot"
                className="max-w-full h-auto rounded-lg border max-h-96 object-contain"
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Match Information</CardTitle>
          <CardDescription>Enter the match details that apply to all players</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="match_number">Match Number</Label>
              <Input
                id="match_number"
                type="number"
                value={matchData.match_number}
                onChange={(e) => setMatchData({ ...matchData, match_number: e.target.value })}
                placeholder="Enter match number"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slot">Slot</Label>
              <Input
                id="slot"
                type="number"
                value={matchData.slot}
                onChange={(e) => setMatchData({ ...matchData, slot: e.target.value })}
                placeholder="Enter slot number"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="map">Map</Label>
              <Select
                value={matchData.map}
                onValueChange={(value) => setMatchData({ ...matchData, map: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select map" />
                </SelectTrigger>
                <SelectContent>
                  {MAPS.map((map) => (
                    <SelectItem key={map} value={map}>
                      {map}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="placement">Team Placement</Label>
              <Input
                id="placement"
                type="number"
                value={matchData.placement}
                onChange={(e) => setMatchData({ ...matchData, placement: e.target.value })}
                placeholder="Final team placement"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Extracted Performance Data</CardTitle>
          <CardDescription>
            Review the OCR-extracted data and map each row to the correct team member. The "Detected Name" shows what
            OCR found.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Row</TableHead>
                  <TableHead>Detected Name</TableHead>
                  <TableHead>Map to Player</TableHead>
                  <TableHead>Kills</TableHead>
                  <TableHead>Assists</TableHead>
                  <TableHead>Damage</TableHead>
                  <TableHead>Survival Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parsedRows.map((row) => (
                  <TableRow
                    key={row.id}
                    className={row.kills || row.assists || row.damage || row.survival_time ? "bg-green-900/20 backdrop-blur-sm" : ""}
                  >
                    <TableCell className="font-medium">{row.id}</TableCell>
                    <TableCell>
                      <Input
                        value={row.player_name}
                        onChange={(e) => updateParsedRow(row.id, "player_name", e.target.value)}
                        placeholder="Detected player name"
                        className={row.player_name ? "bg-blue-900/20 backdrop-blur-sm border-blue-400/30" : ""}
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={row.player_id}
                        onValueChange={(value) => updateParsedRow(row.id, "player_id", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select team member" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="default">No player</SelectItem>
                          {users
                            .filter((u) => u.role === "player")
                            .map((user) => (
                              <SelectItem
                                key={user.id}
                                value={user.id}
                                disabled={parsedRows.some((r) => r.id !== row.id && r.player_id === user.id)}
                              >
                                {user.name || user.email}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={row.kills}
                        onChange={(e) => updateParsedRow(row.id, "kills", e.target.value)}
                        placeholder="0"
                        className={row.kills ? "bg-green-100" : ""}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={row.assists}
                        onChange={(e) => updateParsedRow(row.id, "assists", e.target.value)}
                        placeholder="0"
                        className={row.assists ? "bg-green-100" : ""}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.1"
                        value={row.damage}
                        onChange={(e) => updateParsedRow(row.id, "damage", e.target.value)}
                        placeholder="0"
                        className={row.damage ? "bg-green-100" : ""}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.1"
                        value={row.survival_time}
                        onChange={(e) => updateParsedRow(row.id, "survival_time", e.target.value)}
                        placeholder="0"
                        className={row.survival_time ? "bg-green-100" : ""}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="mt-6 flex gap-2">
              <Button
                type="submit"
                disabled={loading || !matchData.match_number || !matchData.slot || !matchData.map}
                className="flex-1"
              >
                {loading ? "Adding Performances..." : "Add All Performances"}
              </Button>

              {ocrConfidence && (
                <Button type="button" variant="outline" onClick={clearAllData}>
                  Reset Form
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
