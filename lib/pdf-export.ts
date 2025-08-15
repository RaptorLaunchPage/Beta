import jsPDF from 'jspdf'
import 'jspdf-autotable'
import html2canvas from 'html2canvas'

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF
  }
}

interface ExportData {
  title: string
  subtitle?: string
  userInfo: {
    name: string
    role: string
    timeframe: string
  }
  sections: {
    title: string
    data: any[]
    headers?: string[]
    chartElement?: HTMLElement
  }[]
}

export class PDFExporter {
  private doc: jsPDF
  private currentY: number = 20

  constructor() {
    this.doc = new jsPDF()
    this.setupDefaults()
  }

  private setupDefaults() {
    // Set default font
    this.doc.setFont('helvetica')
  }

  private addHeader(title: string, subtitle?: string) {
    // Add logo area (placeholder)
    this.doc.setFillColor(220, 38, 38) // Red color for Raptor Esports
    this.doc.rect(20, 10, 60, 15, 'F')
    this.doc.setTextColor(255, 255, 255)
    this.doc.setFontSize(10)
    this.doc.text('RAPTOR', 22, 18)
    this.doc.text('ESPORTS HUB', 22, 22)

    // Reset text color
    this.doc.setTextColor(0, 0, 0)
    
    // Add title
    this.doc.setFontSize(20)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text(title, 80, 20)
    
    if (subtitle) {
      this.doc.setFontSize(12)
      this.doc.setFont('helvetica', 'normal')
      this.doc.text(subtitle, 80, 27)
    }

    this.currentY = 40
  }

  private addUserInfo(userInfo: any) {
    this.doc.setFontSize(10)
    this.doc.setFont('helvetica', 'normal')
    
    const infoText = [
      `Generated for: ${userInfo.name} (${userInfo.role})`,
      `Time Period: ${userInfo.timeframe}`,
      `Generated on: ${new Date().toLocaleDateString()}`
    ]

    infoText.forEach((text, index) => {
      this.doc.text(text, 20, this.currentY + (index * 5))
    })

    this.currentY += 25
  }

  private addSectionTitle(title: string) {
    // Add some space before section
    this.currentY += 10
    
    this.doc.setFontSize(14)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text(title, 20, this.currentY)
    
    // Add underline
    this.doc.setDrawColor(59, 130, 246)
    this.doc.line(20, this.currentY + 2, 20 + this.doc.getTextWidth(title), this.currentY + 2)
    
    this.currentY += 15
  }

  private async addChart(chartElement: HTMLElement) {
    try {
      const canvas = await html2canvas(chartElement, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false
      })
      
      const imgData = canvas.toDataURL('image/png')
      const imgWidth = 170 // PDF width minus margins
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      
      // Check if we need a new page
      if (this.currentY + imgHeight > 280) {
        this.doc.addPage()
        this.currentY = 20
      }
      
      this.doc.addImage(imgData, 'PNG', 20, this.currentY, imgWidth, imgHeight)
      this.currentY += imgHeight + 10
      
    } catch (error) {
      console.warn('Failed to capture chart:', error)
      // Add placeholder text
      this.doc.setFontSize(10)
      this.doc.text('Chart could not be captured', 20, this.currentY)
      this.currentY += 15
    }
  }

  private addTable(data: any[], headers?: string[]) {
    if (!data || data.length === 0) {
      this.doc.setFontSize(10)
      this.doc.text('No data available', 20, this.currentY)
      this.currentY += 15
      return
    }

    // Auto-generate headers if not provided
    if (!headers && data.length > 0) {
      headers = Object.keys(data[0])
    }

    // Convert data to table format
    const tableData = data.map(row => 
      headers?.map(header => {
        const value = row[header]
        return typeof value === 'number' ? value.toFixed(1) : String(value || '')
      })
    )

    this.doc.autoTable({
      head: [headers],
      body: tableData,
      startY: this.currentY,
      theme: 'grid',
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: [255, 255, 255],
        fontSize: 10,
        fontStyle: 'bold'
      },
      bodyStyles: {
        fontSize: 9,
        textColor: [50, 50, 50]
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      },
      margin: { left: 20, right: 20 },
      didDrawPage: (data: any) => {
        this.currentY = data.cursor.y + 10
      }
    })
  }

  async exportAnalytics(exportData: ExportData): Promise<void> {
    try {
      console.log('Starting PDF export...', exportData.title)
      
      // Validate input data
      if (!exportData || !exportData.title) {
        throw new Error('Invalid export data: missing title')
      }
      
      // Add header
      this.addHeader(exportData.title, exportData.subtitle)
      
      // Add user info
      this.addUserInfo(exportData.userInfo)

      // Process each section
      for (const section of exportData.sections) {
        this.addSectionTitle(section.title)
        
        // Add chart if available
        if (section.chartElement) {
          try {
            await this.addChart(section.chartElement)
          } catch (chartError) {
            console.warn('Failed to add chart:', chartError)
            // Continue without chart
          }
        }
        
        // Add table data
        if (section.data && section.data.length > 0) {
          this.addTable(section.data, section.headers)
        }
        
        // Check if we need a new page for next section
        if (this.currentY > 250) {
          this.doc.addPage()
          this.currentY = 20
        }
      }

      // Add footer with page numbers
      const pageCount = this.doc.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        this.doc.setPage(i)
        this.doc.setFontSize(8)
        this.doc.text(
          `Page ${i} of ${pageCount}`,
          this.doc.internal.pageSize.width - 40,
          this.doc.internal.pageSize.height - 10
        )
      }

      // Save the PDF
      const filename = `${exportData.title.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`
      console.log('Saving PDF:', filename)
      this.doc.save(filename)
      console.log('PDF export completed successfully')
    } catch (error) {
      console.error('PDF export error:', error)
      throw new Error(`PDF export failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}

// Helper function to prepare performance data for PDF export
export function preparePerformanceDataForPDF(
  performanceData: any,
  userInfo: any,
  timeframe: string
): ExportData {
  const sections: any[] = []

  // Player Stats Section
  if (performanceData?.playerStats) {
    sections.push({
      title: 'Performance Summary',
      headers: ['Metric', 'Value'],
      data: Object.entries(performanceData.playerStats).map(([key, value]) => ({
        Metric: key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
        Value: value
      }))
    })
  }

  // Recent Matches
  if (performanceData?.recentMatches) {
    sections.push({
      title: 'Recent Matches',
      data: performanceData.recentMatches,
      headers: ['Match', 'Kills', 'Assists', 'Damage', 'Placement', 'Survival']
    })
  }

  return {
    title: 'Performance Analytics Report',
    subtitle: `Individual Performance Analysis`,
    userInfo: {
      name: userInfo.name || 'Unknown User',
      role: userInfo.role || 'Unknown Role',
      timeframe: `Last ${timeframe} days`
    },
    sections
  }
}

// Helper function to prepare team data for PDF export
export function prepareTeamDataForPDF(
  teamData: any,
  userInfo: any,
  timeframe: string
): ExportData {
  const sections: any[] = []

  // Team Comparison
  if (teamData?.teamComparison) {
    sections.push({
      title: 'Team Performance Comparison',
      data: teamData.teamComparison,
      headers: ['Team', 'Matches', 'Avg Kills', 'Avg Damage', 'Win Rate %', 'Avg Placement']
    })
  }

  // Top Performers
  if (teamData?.topPerformers) {
    const topPerformersData = [
      {
        Category: 'Most Kills',
        Team: teamData.topPerformers.mostKills?.teamName || 'N/A',
        Value: teamData.topPerformers.mostKills?.avgKills || '0'
      },
      {
        Category: 'Most Damage',
        Team: teamData.topPerformers.mostDamage?.teamName || 'N/A',
        Value: teamData.topPerformers.mostDamage?.avgDamage || '0'
      },
      {
        Category: 'Best Win Rate',
        Team: teamData.topPerformers.bestWinRate?.teamName || 'N/A',
        Value: `${teamData.topPerformers.bestWinRate?.winRate || '0'}%`
      }
    ]

    sections.push({
      title: 'Top Performing Teams',
      data: topPerformersData,
      headers: ['Category', 'Team', 'Value']
    })
  }

  return {
    title: 'Team Analytics Report',
    subtitle: 'Team Performance Comparison',
    userInfo: {
      name: userInfo.name || 'Unknown User',
      role: userInfo.role || 'Unknown Role',
      timeframe: `Last ${timeframe} days`
    },
    sections
  }
}

// Helper function to prepare trend data for PDF export
export function prepareTrendDataForPDF(
  trendData: any,
  userInfo: any,
  timeframe: string
): ExportData {
  const sections: any[] = []

  // Trend Data
  if (trendData?.trendData) {
    sections.push({
      title: 'Performance Trends Over Time',
      data: trendData.trendData,
      headers: ['Date', 'Matches', 'Avg Kills', 'Avg Damage', 'Avg Survival', 'Avg Placement']
    })
  }

  // Summary insights
  if (trendData?.summary) {
    const summaryData = [
      {
        Metric: 'Total Active Days',
        Value: trendData.summary.totalDays || 0
      },
      {
        Metric: 'Best Performance Day',
        Value: trendData.summary.bestDay?.date || 'N/A'
      },
      {
        Metric: 'Kill Improvement',
        Value: `${trendData.summary.improvements?.kills || '0'}%`
      }
    ]

    sections.push({
      title: 'Performance Summary',
      data: summaryData,
      headers: ['Metric', 'Value']
    })
  }

  return {
    title: 'Trend Analysis Report',
    subtitle: 'Historical Performance Analysis',
    userInfo: {
      name: userInfo.name || 'Unknown User',
      role: userInfo.role || 'Unknown Role',
      timeframe: `Last ${timeframe} days`
    },
    sections
  }
}