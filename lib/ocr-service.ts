import { createWorker, type ImageLike, PSM } from "tesseract.js"

export interface OCRResult {
  text: string
  confidence: number
}

export interface ParsedPerformanceData {
  player_name: string
  kills: string
  assists: string
  damage: string
  survival_time: string
}

const getWorker = async () => {
  const worker = await createWorker()
  return worker
}

export class OCRService {
  static async extractTextFromImage(imageFile: File, onProgress?: (progress: number) => void): Promise<OCRResult> {
    const imageUrl = URL.createObjectURL(imageFile)
    const worker = await getWorker()

    // Set progress callback
    worker.setParameters({
      logger: (m: any) => {
        if (m.status === "recognizing text") {
          const progress = Math.round((m.progress ?? 0) * 100)
          console.log(`[Tesseract] progress ${progress}%`)
          onProgress?.(progress)
        }
      }
    })

    try {
      onProgress?.(10)
      await worker.reinitialize("eng")
      onProgress?.(20)
      await worker.setParameters({ tessedit_pageseg_mode: PSM.AUTO })
      onProgress?.(40)

      const {
        data: { text, confidence },
      } = await worker.recognize(imageUrl as ImageLike)

      onProgress?.(100)
      return { text, confidence }
    } catch (err) {
      console.error("OCR extraction failed:", err)
      onProgress?.(0)
      throw new Error("Failed to extract text from image. Check console for details.")
    } finally {
      await worker.terminate()
      URL.revokeObjectURL(imageUrl)
    }
  }

  static parsePerformanceData(text: string): ParsedPerformanceData[] {
    console.log("Raw OCR text:", text)

    const lines = text.split("\n").filter((line) => line.trim().length > 0)
    const results: ParsedPerformanceData[] = []

    // Pattern 1: Full line with player name and stats
    // Example: "PlayerName 15 5 2500 8.5" or "PlayerName | 15 | 5 | 2500 | 8.5"
    const fullLinePattern =
      /([A-Za-z][A-Za-z0-9_]{2,15})\s*[|\s]+(\d+)\s*[|\s]+(\d+)\s*[|\s]+(\d+)\s*[|\s]+(\d+\.?\d*)/g

    // Pattern 2: Player name followed by numbers in separate lines
    const playerNamePattern = /^[A-Za-z][A-Za-z0-9_]{2,15}$/
    const numbersPattern = /(\d+)\s+(\d+)\s+(\d+)\s+(\d+\.?\d*)/

    // Try Pattern 1 first - complete lines
    let match
    while ((match = fullLinePattern.exec(text)) !== null) {
      results.push({
        player_name: match[1],
        kills: match[2],
        assists: match[3],
        damage: match[4],
        survival_time: match[5],
      })
    }

    // If Pattern 1 didn't work, try Pattern 2 - separate lines
    if (results.length === 0) {
      let currentPlayer = ""

      for (const line of lines) {
        const trimmedLine = line.trim()

        // Check if this line is a player name
        if (playerNamePattern.test(trimmedLine)) {
          currentPlayer = trimmedLine
        }
        // Check if this line contains stats
        else {
          const statsMatch = numbersPattern.exec(trimmedLine)
          if (statsMatch && currentPlayer) {
            results.push({
              player_name: currentPlayer,
              kills: statsMatch[1],
              assists: statsMatch[2],
              damage: statsMatch[3],
              survival_time: statsMatch[4],
            })
            currentPlayer = "" // Reset after using
          }
        }
      }
    }

    // Pattern 3: Extract all numbers and try to group them
    if (results.length === 0) {
      const allNumbers = text.match(/\d+\.?\d*/g) || []
      const playerNames = text.match(/[A-Za-z][A-Za-z0-9_]{2,15}/g) || []

      // Group numbers into sets of 4 (kills, assists, damage, survival)
      for (let i = 0; i < Math.min(playerNames.length, Math.floor(allNumbers.length / 4)); i++) {
        const startIndex = i * 4
        results.push({
          player_name: playerNames[i] || `Player${i + 1}`,
          kills: allNumbers[startIndex] || "0",
          assists: allNumbers[startIndex + 1] || "0",
          damage: allNumbers[startIndex + 2] || "0",
          survival_time: allNumbers[startIndex + 3] || "0",
        })
      }
    }

    // Ensure we have exactly 4 entries for team games
    while (results.length < 4) {
      results.push({
        player_name: `Player${results.length + 1}`,
        kills: "",
        assists: "",
        damage: "",
        survival_time: "",
      })
    }

    console.log("Parsed results:", results.slice(0, 4))
    return results.slice(0, 4)
  }

  static async processScreenshot(
    file: File,
    onProgress?: (progress: number) => void,
  ): Promise<ParsedPerformanceData[]> {
    const { text, confidence } = await this.extractTextFromImage(file, onProgress)
    if (confidence < 30) {
      throw new Error(`OCR confidence only ${Math.round(confidence)}%. Try a clearer screenshot.`)
    }
    return this.parsePerformanceData(text)
  }
}
