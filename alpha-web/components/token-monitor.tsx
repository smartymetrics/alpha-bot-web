"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Play, Pause, ExternalLink, Wifi, WifiOff, ArrowUp, ArrowDown, Copy, Check } from "lucide-react"
import { useState, useEffect, useCallback, useRef } from "react"

// Custom table components using standard HTML elements
const Table = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <table className={`w-full border-collapse ${className}`}>{children}</table>
)

const TableHeader = ({ children }: { children: React.ReactNode }) => (
  <thead>{children}</thead>
)

const TableBody = ({ children }: { children: React.ReactNode }) => (
  <tbody>{children}</tbody>
)

const TableRow = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <tr className={`border-b border-gray-200 hover:bg-gray-50 ${className}`}>{children}</tr>
)

const TableHead = ({ 
  children, 
  className = "", 
  title,
  onClick 
}: { 
  children: React.ReactNode; 
  className?: string;
  title?: string;
  onClick?: () => void;
}) => (
  <th 
    className={`px-2 py-3 text-left text-xs font-medium text-gray-900 ${className}`}
    title={title}
    onClick={onClick}
  >
    {children}
  </th>
)

const TableCell = ({ 
  children, 
  className = "",
  colSpan
}: { 
  children: React.ReactNode; 
  className?: string;
  colSpan?: number;
}) => (
  <td className={`px-2 py-2 text-xs ${className}`} colSpan={colSpan}>
    {children}
  </td>
)

// Copyable address component
function CopyableAddress({ address }: { address: string }) {
  const [copied, setCopied] = useState(false)
  const safe = address || ""
  const truncated = safe.length > 8 ? `${safe.slice(0, 4)}...${safe.slice(-4)}` : safe

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(safe)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch (err) {
      console.error("Copy failed", err)
    }
  }

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 text-xs text-gray-600 hover:text-blue-600 font-mono bg-gray-100 hover:bg-blue-50 px-1 py-0.5 rounded transition-colors duration-200"
      title={`Click to copy: ${safe}`}
      type="button"
    >
      <span className="truncate max-w-[60px]">{truncated}</span>
      {copied ? (
        <Check className="h-2 w-2 text-green-500" />
      ) : (
        <Copy className="h-2 w-2" />
      )}
    </button>
  )
}

interface Token {
  id: string
  symbol: string
  name: string
  address: string
  grade: string
  discovered_at: string
  dexscreener_url: string

  // Full Dexscreener enriched fields
  price_usd?: number
  price_change_5m?: number
  price_change_1h?: number
  price_change_6h?: number
  price_change_24h?: number
  buys_5m?: number
  buys_1h?: number
  buys_6h?: number
  buys_24h?: number
  sells_5m?: number
  sells_1h?: number
  sells_6h?: number
  sells_24h?: number
  volume_5m?: number
  volume_1h?: number
  volume_6h?: number
  volume_24h?: number
  liquidity_usd?: number
  marketcap?: number
  fdv?: number
  pair_address?: string
  pair_created_at?: string
  dex?: string
  base_token_name?: string
  base_token_symbol?: string
  quote_token_name?: string
  quote_token_symbol?: string
  price_native?: number
  // holders?: number
  website?: string
  twitter?: string
  telegram?: string
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

// Format numbers nicely (1.2M, 3.4K, etc.)
const formatNumber = (value?: number): string => {
  if (value === undefined || value === null) return "-"
  return Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 2 }).format(value)
}

// Format time ago
const formatTimeAgo = (dateString?: string): string => {
  if (!dateString) return "-"
  const diff = Date.now() - new Date(dateString).getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  
  if (days > 0) return `${days}d`
  if (hours > 0) return `${hours}h`
  if (minutes > 0) return `${minutes}m`
  return "now"
}

export function TokenMonitor() {
  const [tokens, setTokens] = useState<Token[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedGrades, setSelectedGrades] = useState<string[]>([...ALL_GRADES])
  const [isStreaming, setIsStreaming] = useState(true)
  const [isConnected, setIsConnected] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<string>("")
  const [newTokenIds, setNewTokenIds] = useState<string[]>([])
  const prevTokenIdsRef = useRef<Set<string>>(new Set())

  // store first-seen prices in a Map, persisted to localStorage to survive refresh
  const initialPricesRef = useRef<Map<string, number>>(new Map())

  // load initialPrices from localStorage once on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem("tm_initial_prices_v1")
      if (raw) {
        const obj = JSON.parse(raw) as Record<string, number>
        const map = new Map<string, number>()
        for (const [k, v] of Object.entries(obj)) map.set(k, v)
        initialPricesRef.current = map
      }
    } catch (e) {
      console.warn("Failed to load initial prices from localStorage", e)
    }
  }, [])

  // helper to persist Map -> localStorage
  const persistInitialPrices = () => {
    try {
      const obj: Record<string, number> = {}
      initialPricesRef.current.forEach((v, k) => (obj[k] = v))
      localStorage.setItem("tm_initial_prices_v1", JSON.stringify(obj))
    } catch (e) {
      console.warn("Failed to persist initial prices", e)
    }
  }

  const enrichWithDexscreener = async (token: Token): Promise<Token> => {
    try {
      const resp = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${token.address}`)
      const data = await resp.json()
      const pair = data?.pairs?.[0]
      if (!pair) return token

      return {
        ...token,
        price_usd: pair.priceUsd ? parseFloat(pair.priceUsd) : undefined,
        price_native: pair.priceNative ? parseFloat(pair.priceNative) : undefined,
        price_change_5m: pair.priceChange?.m5,
        price_change_1h: pair.priceChange?.h1,
        price_change_6h: pair.priceChange?.h6,
        price_change_24h: pair.priceChange?.h24,
        buys_5m: pair.txns?.m5?.buys,
        buys_1h: pair.txns?.h1?.buys,
        buys_6h: pair.txns?.h6?.buys,
        buys_24h: pair.txns?.h24?.buys,
        sells_5m: pair.txns?.m5?.sells,
        sells_1h: pair.txns?.h1?.sells,
        sells_6h: pair.txns?.h6?.sells,
        sells_24h: pair.txns?.h24?.sells,
        volume_5m: pair.volume?.m5,
        volume_1h: pair.volume?.h1,
        volume_6h: pair.volume?.h6,
        volume_24h: pair.volume?.h24,
        liquidity_usd: pair.liquidity?.usd,
        marketcap: pair.marketCap,
        fdv: pair.fdv,
        pair_address: pair.pairAddress,
        pair_created_at: pair.pairCreatedAt ? new Date(pair.pairCreatedAt).toISOString() : undefined,
        dex: pair.dexId,
        base_token_name: pair.baseToken?.name,
        base_token_symbol: pair.baseToken?.symbol,
        quote_token_name: pair.quoteToken?.name,
        quote_token_symbol: pair.quoteToken?.symbol,
        // holders: pair.info?.holders,
        website: pair.info?.websites?.[0],
        twitter: pair.info?.socials?.find((s: any) => s.type === 'twitter')?.url,
        telegram: pair.info?.socials?.find((s: any) => s.type === 'telegram')?.url,
        dexscreener_url: pair.url || token.dexscreener_url,
      }
    } catch (e) {
      console.error(`Dexscreener fetch failed for ${token.symbol}`, e)
      return token
    }
  }

  const fetchTokens = useCallback(async () => {
    try {
      const response = await fetch("/api/tokens")
      if (!response.ok) throw new Error("Failed to fetch tokens")
      const data: TokensResponse | TokensResponse[] = await response.json()

      // handle both list or single snapshot shape (keeps your original logic)
      let snapshot: TokensResponse
      if (Array.isArray(data)) {
        snapshot = data.reduce((latest, current) =>
          new Date(current.last_updated).getTime() > new Date(latest.last_updated).getTime()
            ? current
            : latest
        )
      } else {
        snapshot = data
      }

      let sortedTokens = [...(snapshot.tokens || [])].sort(
        (a, b) => new Date(b.discovered_at).getTime() - new Date(a.discovered_at).getTime()
      )

      // Enrich with Dexscreener
      sortedTokens = await Promise.all(sortedTokens.map(enrichWithDexscreener))

      // NEW: maintain initialPricesRef (first-seen price)
      const prevIds = prevTokenIdsRef.current
      const currentIds = new Set(sortedTokens.map((t) => t.id))

      // 1) Add initial price for tokens not yet cached (only if we have a price)
      for (const t of sortedTokens) {
        if (t.price_usd !== undefined && t.price_usd !== null && !initialPricesRef.current.has(t.id)) {
          initialPricesRef.current.set(t.id, t.price_usd)
        }
      }

      // 2) Remove cached initial prices for tokens that disappeared
      const toDelete: string[] = []
      initialPricesRef.current.forEach((_, id) => {
        if (!currentIds.has(id)) toDelete.push(id)
      })
      if (toDelete.length > 0) {
        toDelete.forEach((id) => initialPricesRef.current.delete(id))
      }

      // persist updates
      persistInitialPrices()

      // compute newly seen tokens for highlight
      const newIds = sortedTokens.filter((t) => !prevIds.has(t.id)).map((t) => t.id)
      if (newIds.length > 0) {
        setNewTokenIds(newIds)
        setTimeout(() => setNewTokenIds([]), 2000)
      }

      prevTokenIdsRef.current = currentIds
      setTokens(sortedTokens)
      setLastUpdated(snapshot.last_updated)
      setIsConnected(true)
    } catch (error) {
      console.error("Error fetching tokens:", error)
      setIsConnected(false)
    }
  }, [])

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    const startPolling = () => {
      if (!isStreaming || document.hidden) return
      fetchTokens()
      interval = setInterval(fetchTokens, 15000) // every 15s
    }

    const stopPolling = () => {
      if (interval) clearInterval(interval)
    }

    startPolling()
    const handleVisibilityChange = () => {
      if (document.hidden) stopPolling()
      else if (isStreaming) startPolling()
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => {
      stopPolling()
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [isStreaming, fetchTokens])

  const toggleStreaming = () => {
    if (isStreaming) {
      setIsStreaming(false)
      setIsConnected(false)
    } else {
      setIsStreaming(true)
      setIsConnected(true)
    }
  }

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
      {/* Sticky top status bar */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-200 p-2 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          {isConnected ? (
            <>
              <Wifi className="h-5 w-5 text-green-600 animate-pulse" />
              <span className="text-green-600 font-medium">Live</span>
            </>
          ) : (
            <>
              <WifiOff className="h-5 w-5 text-red-600 animate-pulse" />
              <span className="text-red-600 font-medium">Disconnected</span>
            </>
          )}
          <span className="ml-4 text-sm text-gray-500 animate-pulse">
            Last updated: {lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : "-"}
          </span>
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

      {/* Search + Grade Filter */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
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

      {/* Token Table with Sticky Elements */}
      <Card>
        <CardHeader>
          <CardTitle>Live Token Feed</CardTitle>
          <CardDescription>
            Tokens are graded and enriched with comprehensive market data
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Combined vertical + horizontal scrolling container for proper sticky positioning */}
          <div style={{ maxHeight: "700px" }} className="overflow-auto border rounded-md">
            <Table className="min-w-max">
              <TableHeader>
                <TableRow>
                  {/* Sticky Token column header - reduced width */}
                  <TableHead className="sticky top-0 left-0 z-30 bg-white/95 backdrop-blur-sm border-r border-gray-200 min-w-[140px] max-w-[140px]">
                    Token
                  </TableHead>
                  {/* Other sticky headers */}
                  <TableHead className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm">Grade</TableHead>
                  <TableHead className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm">Price</TableHead>
                  {/* NEW: % From Call column immediately after Price */}
                  <TableHead className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm">% From Call</TableHead>
                  <TableHead className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm">Age</TableHead>
                  <TableHead className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm">DEX</TableHead>
                  <TableHead className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm">5m %</TableHead>
                  <TableHead className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm">1h %</TableHead>
                  <TableHead className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm">6h %</TableHead>
                  <TableHead className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm">24h %</TableHead>
                  <TableHead className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm">Txns 5m</TableHead>
                  <TableHead className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm">Txns 1h</TableHead>
                  <TableHead className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm">Txns 6h</TableHead>
                  <TableHead className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm">Txns 24h</TableHead>
                  <TableHead className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm">Vol 5m</TableHead>
                  <TableHead className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm">Vol 1h</TableHead>
                  <TableHead className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm">Vol 6h</TableHead>
                  <TableHead className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm">Vol 24h</TableHead>
                  <TableHead className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm">Liquidity</TableHead>
                  <TableHead className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm">MCap/FDV</TableHead>
                  {/* <TableHead className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm">Holders</TableHead> */}
                  <TableHead className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm">Links</TableHead>
                  <TableHead className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTokens.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={22} className="text-center py-8 text-gray-500">
                      {isStreaming ? (
                        <span className="animate-pulse">Loading token data...</span>
                      ) : (
                        "Click 'Start Stream' to see live token data"
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTokens.map((token) => {
                    const priceChange24h = token.price_change_24h ?? 0
                    const priceChange6h = token.price_change_6h ?? 0
                    const priceChange1h = token.price_change_1h ?? 0
                    const priceChange5m = token.price_change_5m ?? 0
                    const hasMarketCap = token.marketcap !== undefined && token.marketcap !== null

                    const getPriceChangeColor = (change: number) => 
                      change > 0 ? "text-green-600" : change < 0 ? "text-red-600" : "text-gray-500"

                    const getPriceChangeIcon = (change: number) => {
                      if (change > 0) return <ArrowUp className="h-3 w-3" />
                      if (change < 0) return <ArrowDown className="h-3 w-3" />
                      return null
                    }

                    const formatTxns = (buys?: number, sells?: number) => {
                      if (buys === undefined && sells === undefined) return "-"
                      return (
                        <div className="flex gap-1">
                          <span className="text-green-600">{formatNumber(buys)}</span>
                          <span>/</span>
                          <span className="text-red-600">{formatNumber(sells)}</span>
                        </div>
                      )
                    }

                    // Calculate % From Call using initialPricesRef (first-seen price)
                    const initial = initialPricesRef.current.get(token.id)
                    const current = token.price_usd
                    let fromCallPct: number | null = null
                    if (initial !== undefined && initial !== null && current !== undefined && current !== null && initial !== 0) {
                      fromCallPct = ((current - initial) / initial) * 100
                    }

                    return (
                      <TableRow
                        key={token.id}
                        className={`transition-colors duration-700 ${
                          newTokenIds.includes(token.id) ? "bg-green-50" : ""
                        }`}
                      >
                        {/* Sticky Token column - reduced padding and width */}
                        <TableCell className="sticky left-0 z-10 bg-white border-r border-gray-200 min-w-[140px] max-w-[140px]">
                          <div className="space-y-1">
                            <div className="font-medium text-gray-900 text-xs truncate">{token.symbol}</div>
                            <div className="text-xs text-gray-600 truncate" title={token.name}>{token.name}</div>
                            <CopyableAddress address={token.address} />
                          </div>
                        </TableCell>
                        
                        {/* Grade */}
                        <TableCell>
                          <Badge className={`${getGradeColor(token.grade)} border text-xs`}>{token.grade}</Badge>
                        </TableCell>
                        
                        {/* Price */}
                        <TableCell className="font-mono">
                          {token.price_usd ? `$${token.price_usd.toFixed(6)}` : "-"}
                        </TableCell>

                        {/* % From Call (new) */}
                        <TableCell className={`font-medium ${fromCallPct !== null ? (fromCallPct > 0 ? "text-green-600" : fromCallPct < 0 ? "text-red-600" : "text-gray-500") : "text-gray-500"}`}>
                          <div className="flex items-center gap-1">
                            {fromCallPct !== null ? (
                              <>
                                {fromCallPct > 0 ? <ArrowUp className="h-3 w-3" /> : fromCallPct < 0 ? <ArrowDown className="h-3 w-3" /> : null}
                                {fromCallPct.toFixed(2)}%
                              </>
                            ) : (
                              "-"
                            )}
                          </div>
                        </TableCell>

                        {/* Age */}
                        <TableCell className="text-gray-600">
                          {formatTimeAgo(token.pair_created_at || token.discovered_at)}
                        </TableCell>

                        {/* DEX */}
                        <TableCell className="text-gray-600 uppercase">
                          {token.dex || "-"}
                        </TableCell>
                        
                        {/* Price Changes */}
                        <TableCell className={`font-medium ${getPriceChangeColor(priceChange5m)}`}>
                          <div className="flex items-center gap-1">
                            {getPriceChangeIcon(priceChange5m)}
                            {priceChange5m.toFixed(1)}%
                          </div>
                        </TableCell>

                        <TableCell className={`font-medium ${getPriceChangeColor(priceChange1h)}`}>
                          <div className="flex items-center gap-1">
                            {getPriceChangeIcon(priceChange1h)}
                            {priceChange1h.toFixed(1)}%
                          </div>
                        </TableCell>

                        <TableCell className={`font-medium ${getPriceChangeColor(priceChange6h)}`}>
                          <div className="flex items-center gap-1">
                            {getPriceChangeIcon(priceChange6h)}
                            {priceChange6h.toFixed(1)}%
                          </div>
                        </TableCell>

                        <TableCell className={`font-medium ${getPriceChangeColor(priceChange24h)}`}>
                          <div className="flex items-center gap-1">
                            {getPriceChangeIcon(priceChange24h)}
                            {priceChange24h.toFixed(1)}%
                          </div>
                        </TableCell>
                        
                        {/* Transactions */}
                        <TableCell>{formatTxns(token.buys_5m, token.sells_5m)}</TableCell>
                        <TableCell>{formatTxns(token.buys_1h, token.sells_1h)}</TableCell>
                        <TableCell>{formatTxns(token.buys_6h, token.sells_6h)}</TableCell>
                        <TableCell>{formatTxns(token.buys_24h, token.sells_24h)}</TableCell>
                        
                        {/* Volumes */}
                        <TableCell className="font-medium">
                          ${formatNumber(token.volume_5m)}
                        </TableCell>
                        <TableCell className="font-medium">
                          ${formatNumber(token.volume_1h)}
                        </TableCell>
                        <TableCell className="font-medium">
                          ${formatNumber(token.volume_6h)}
                        </TableCell>
                        <TableCell className="font-medium">
                          ${formatNumber(token.volume_24h)}
                        </TableCell>
                        
                        {/* Liquidity */}
                        <TableCell className="font-medium">
                          ${formatNumber(token.liquidity_usd)}
                        </TableCell>
                        
                        {/* Market Cap / FDV */}
                        <TableCell className={`font-medium ${hasMarketCap ? "text-blue-600" : "text-gray-600"}`}>
                          <div className="text-xs">
                            {hasMarketCap ? (
                              <>
                                <div>M: ${formatNumber(token.marketcap)}</div>
                                {token.fdv && <div>F: ${formatNumber(token.fdv)}</div>}
                              </>
                            ) : (
                              <div>F: ${formatNumber(token.fdv)}</div>
                            )}
                          </div>
                        </TableCell>

                        {/* Social Links */}
                        <TableCell>
                          <div className="flex gap-1">
                            {token.website && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="p-1 h-6 w-6"
                                onClick={() => window.open(token.website, "_blank")}
                                title="Website"
                              >
                                🌐
                              </Button>
                            )}
                            {token.twitter && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="p-1 h-6 w-6"
                                onClick={() => window.open(token.twitter, "_blank")}
                                title="Twitter"
                              >
                                🐦
                              </Button>
                            )}
                            {token.telegram && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="p-1 h-6 w-6"
                                onClick={() => window.open(token.telegram, "_blank")}
                                title="Telegram"
                              >
                                📱
                              </Button>
                            )}
                          </div>
                        </TableCell>
                        
                        {/* Action */}
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => window.open(token.dexscreener_url, "_blank")}
                            className="hover:bg-blue-50 p-1"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
