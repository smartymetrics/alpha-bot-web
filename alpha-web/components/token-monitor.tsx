"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Play, Pause, ExternalLink, Wifi, WifiOff } from "lucide-react"
import { useState, useEffect, useCallback } from "react"

interface Token {
  id: string
  symbol: string
  name: string
  address: string
  grade: string
  overlap_percentage: number
  concentration: number
  discovered_at: string
  dexscreener_url: string
}

interface TokensResponse {
  tokens: Token[]
  last_updated: string
  total_count: number
}

const ALL_GRADES = ["CRITICAL", "HIGH", "MEDIUM", "LOW"]

const getGradeColor = (grade: string) => {
  switch (grade) {
    case "CRITICAL":
      return "text-red-600 bg-red-50 border-red-200"
    case "HIGH":
      return "text-orange-600 bg-orange-50 border-orange-200"
    case "MEDIUM":
      return "text-yellow-600 bg-yellow-50 border-yellow-200"
    case "LOW":
      return "text-blue-600 bg-blue-50 border-blue-200"
    default:
      return "text-gray-600 bg-gray-50 border-gray-200"
  }
}

export function TokenMonitor() {
  const [tokens, setTokens] = useState<Token[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedGrades, setSelectedGrades] = useState<string[]>([...ALL_GRADES])
  const [isStreaming, setIsStreaming] = useState(true)
  const [isConnected, setIsConnected] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<string>("")

  const fetchTokens = useCallback(async () => {
    try {
      console.log("[v1] Fetching tokens from API")
      const response = await fetch("/api/tokens")
      if (!response.ok) throw new Error("Failed to fetch tokens")

      const data: TokensResponse | TokensResponse[] = await response.json()

      let snapshot: TokensResponse
      if (Array.isArray(data)) {
        snapshot = data.reduce((latest, current) =>
          new Date(current.last_updated).getTime() >
          new Date(latest.last_updated).getTime()
            ? current
            : latest
        )
      } else {
        snapshot = data
      }

      const sortedTokens = [...(snapshot.tokens || [])].sort(
        (a, b) => new Date(b.discovered_at).getTime() - new Date(a.discovered_at).getTime()
      )

      setTokens(sortedTokens)
      setLastUpdated(snapshot.last_updated)
      setIsConnected(true)
      console.log("[v1] Successfully fetched", sortedTokens.length, "tokens")
    } catch (error) {
      console.error("[v1] Error fetching tokens:", error)
      setIsConnected(false)
    }
  }, [])

  // Polling with visibility check
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    const startPolling = () => {
      if (!isStreaming || document.hidden) return
      fetchTokens()
      interval = setInterval(fetchTokens, 10000)
    }

    const stopPolling = () => {
      if (interval) clearInterval(interval)
    }

    startPolling()

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling()
        console.log("[v1] Tab hidden, polling paused")
      } else if (isStreaming) {
        startPolling()
        console.log("[v1] Tab visible, polling resumed")
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      stopPolling()
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [isStreaming, fetchTokens])

  const toggleStreaming = () => setIsStreaming(!isStreaming)

  const toggleGrade = (grade: string) => {
    setSelectedGrades((prev) =>
      prev.includes(grade) ? prev.filter((g) => g !== grade) : [...prev, grade]
    )
  }

  const selectAllGrades = () => setSelectedGrades([...ALL_GRADES])
  const clearAllGrades = () => setSelectedGrades([])

  const filteredTokens = tokens.filter((token) => {
    const matchesSearch =
      token.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      token.symbol.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesGrade = selectedGrades.includes(token.grade)
    return matchesSearch && matchesGrade
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-bold text-balance">Token Monitor</h2>
          <p className="text-muted-foreground">Real-time monitoring of new Solana tokens with grading</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            {isConnected ? (
              <>
                <Wifi className="h-4 w-4 text-green-600" />
                <span className="text-green-600">Live</span>
              </>
            ) : (
              <>
                <WifiOff className="h-4 w-4 text-red-600" />
                <span className="text-red-600">Disconnected</span>
              </>
            )}
          </div>
          <Button
            onClick={toggleStreaming}
            variant={isStreaming ? "default" : "outline"}
            className="flex items-center gap-2"
          >
            {isStreaming ? (
              <>
                <Pause className="h-4 w-4" />
                Pause Stream
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Start Stream
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Search + Grade Filter */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search tokens..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap py-1">
          <Button size="sm" variant="outline" onClick={selectAllGrades}>Select All</Button>
          <Button size="sm" variant="outline" onClick={clearAllGrades}>Clear All</Button>
          {ALL_GRADES.map((grade) => (
            <Button
              key={grade}
              size="sm"
              className="rounded-full px-4"
              variant={selectedGrades.includes(grade) ? "default" : "outline"}
              onClick={() => toggleGrade(grade)}
            >
              {grade}
            </Button>
          ))}
        </div>
      </div>

      {/* Token Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Live Token Feed
            {lastUpdated && (
              <span className="text-sm font-normal text-muted-foreground">
                Last updated: {new Date(lastUpdated).toLocaleTimeString()}
              </span>
            )}
          </CardTitle>
          <CardDescription>
            Tokens are graded based on wallet overlap analysis with previously successful tokens
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Token</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Overlap %</TableHead>
                  <TableHead>Concentration</TableHead>
                  <TableHead>Discovered</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTokens.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {isStreaming ? "Loading token data..." : "Click 'Start Stream' to see live token data"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTokens.map((token) => (
                    <TableRow key={token.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{token.symbol}</div>
                          <div className="text-sm text-muted-foreground">{token.name}</div>
                          <div className="text-xs text-muted-foreground font-mono">{token.address}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getGradeColor(token.grade)}>{token.grade}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{token.overlap_percentage.toFixed(1)}%</span>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{token.concentration.toFixed(1)}%</span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(token.discovered_at).toLocaleTimeString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(token.dexscreener_url, "_blank")}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
