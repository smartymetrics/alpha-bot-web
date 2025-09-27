"use client"

import { useEffect, useState } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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

const TableRow = ({ children }: { children: React.ReactNode }) => (
  <tr className="border-b border-gray-200 hover:bg-gray-50">{children}</tr>
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
    className={`px-4 py-3 text-left text-sm font-medium text-gray-900 ${className}`}
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
  <td className={`px-4 py-3 text-sm ${className}`} colSpan={colSpan}>
    {children}
  </td>
)
import { ArrowUpRight, ArrowDownRight, Minus, Loader2, Copy, Check, Clock, CheckCircle, XCircle } from "lucide-react"

// ---------------- Types ----------------
interface TraderROIRecord {
  trader_id: string
  overall_total_pnl: number
  overall_realized_profit_usd: number
  overall_estimated_gross_profit_on_sales: number
  overall_estimated_unrealised_pnl: number
  ROI: number
  overall_total_usd_spent: number
  overall_total_sales_revenue: number
  num_unique_tokens_traded: number
  num_tokens_in_profit: number
  win_rate: number
  number_of_trades: number
}

interface TraderROIResult {
  id?: string
  generated_at?: string | null
  trader_type: "all" | "early"
  params?: {
    minimum_initial_buy_usd?: number
    min_profitable_trades?: number
    window_hours?: number
    early_trading_window_hours?: number
  }
  tokens?: string[]
  records: TraderROIRecord[]
}

interface AnalysisJob {
  id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  createdAt: string
  completedAt?: string
  result?: TraderROIResult
  error?: string
  params: any
}

// ---------------- Helpers ----------------
const normalizeResult = (raw: any): TraderROIResult => {
  const params = raw?.params || raw?.payload?.params || {}
  const generated_at = raw?.generated_at || raw?.created_at || raw?.createdAt || raw?.timestamp || null

  const inferredType: "all" | "early" = params?.window_hours && params.window_hours > 0 ? "early" : "all"

  const records = Array.isArray(raw?.records) ? raw.records : Array.isArray(raw?.data) ? raw.data : []

  return {
    id: raw?.id,
    generated_at,
    trader_type: inferredType,
    params: {
      minimum_initial_buy_usd: params.minimum_initial_buy_usd,
      min_profitable_trades: params.min_profitable_trades,
      window_hours: params.window_hours ?? params.early_trading_window_hours ?? params.window,
    },
    tokens: raw?.tokens || [],
    records: records.map((r: any) => ({
      trader_id: r.trader_id || r.trader || r.wallet || "",
      overall_total_pnl: Number(r.overall_total_pnl ?? r.total_pnl ?? 0),
      overall_realized_profit_usd: Number(r.overall_realized_profit_usd ?? r.realized_profit ?? 0),
      overall_estimated_gross_profit_on_sales: Number(r.overall_estimated_gross_profit_on_sales ?? 0),
      overall_estimated_unrealised_pnl: Number(r.overall_estimated_unrealised_pnl ?? r.estimated_unrealised_pnl ?? 0),
      ROI: Number(r.ROI ?? r.roi ?? 0),
      overall_total_usd_spent: Number(r.overall_total_usd_spent ?? r.total_spent ?? 0),
      overall_total_sales_revenue: Number(r.overall_total_sales_revenue ?? r.sales_revenue ?? 0),
      num_unique_tokens_traded: Number(r.num_unique_tokens_traded ?? r.unique_tokens ?? 0),
      num_tokens_in_profit: Number(r.num_tokens_in_profit ?? r.tokens_in_profit ?? 0),
      win_rate: Number(r.win_rate ?? r.winrate ?? 0),
      number_of_trades: Number(r.number_of_trades ?? r.trades ?? 0),
    })),
  }
}

const formatNumber = (n: number | undefined, decimals = 2) =>
  typeof n !== "number" || Number.isNaN(n)
    ? "-"
    : n.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })

const formatAnalysisDropdownLabel = (a: TraderROIResult) => {
  try {
    if (a.generated_at && !isNaN(Date.parse(String(a.generated_at)))) {
      const d = new Date(String(a.generated_at))
      const dateStr = d.toISOString().slice(0, 16).replace("T", " ")
      const tokenCount = a.tokens?.length ?? 0
      let tokenPart = `(${tokenCount} tokens)`
      if (tokenCount === 1 && a.tokens && a.tokens[0]) {
        const t = a.tokens[0]
        tokenPart = `(${t.length > 14 ? `${t.slice(0, 6)}…${t.slice(-4)}` : t})`
      }
      return `${dateStr} ${tokenPart}`
    }

    if (a.id) return `id:${String(a.id).slice(0, 8)} ${a.tokens?.length ? `(${a.tokens.length} tokens)` : ""}`
    return "unknown analysis"
  } catch {
    return String(a.generated_at ?? a.id ?? "unknown")
  }
}

const displayDateOrId = (a: TraderROIResult) => {
  if (a.generated_at && !isNaN(Date.parse(String(a.generated_at)))) {
    return new Date(String(a.generated_at)).toLocaleString()
  }
  if (a.id) return `id:${String(a.id).slice(0, 8)}`
  return "Unknown"
}

const keyFor = (a: TraderROIResult) => a.id ?? a.generated_at ?? JSON.stringify({ tokens: a.tokens ?? [], params: a.params ?? {} })

const formatJobDuration = (startTime: string, endTime?: string) => {
  const start = new Date(startTime).getTime()
  const end = endTime ? new Date(endTime).getTime() : Date.now()
  const duration = Math.floor((end - start) / 1000)
  
  if (duration < 60) return `${duration}s`
  if (duration < 3600) return `${Math.floor(duration / 60)}m ${duration % 60}s`
  return `${Math.floor(duration / 3600)}h ${Math.floor((duration % 3600) / 60)}m`
}

// ---------------- UI Components ----------------
const PnLCell = ({ value, isPercent = false }: { value: number; isPercent?: boolean }) => {
  if (value > 0) {
    return (
      <span className="text-green-600 font-medium flex items-center gap-1">
        <ArrowUpRight className="w-4 h-4" /> {formatNumber(value, 2)}
        {isPercent && "%"}
      </span>
    )
  } else if (value < 0) {
    return (
      <span className="text-red-600 font-medium flex items-center gap-1">
        <ArrowDownRight className="w-4 h-4" /> {formatNumber(Math.abs(value), 2)}
        {isPercent && "%"}
      </span>
    )
  }
  return (
    <span className="text-gray-500 flex items-center gap-1">
      <Minus className="w-4 h-4" /> {formatNumber(value, 2)}
      {isPercent && "%"}
    </span>
  )
}

// Wallet cell with truncate + copy
function WalletCell({ address }: { address: string }) {
  const [copied, setCopied] = useState(false)
  const safe = address || ""
  const truncated = safe.length > 10 ? `${safe.slice(0, 4)}...${safe.slice(-4)}` : safe

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
      className="flex items-center gap-2 text-blue-600 hover:underline font-mono text-sm"
      title={safe}
      type="button"
    >
      <span className="truncate max-w-[140px]">{truncated}</span>
      {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4 text-gray-400" />}
    </button>
  )
}

// Job status component
function JobStatusCard({ job }: { job: AnalysisJob }) {
  const getStatusIcon = () => {
    switch (job.status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-gray-500" />
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = () => {
    switch (job.status) {
      case 'pending':
        return 'bg-gray-50 border-gray-200'
      case 'processing':
        return 'bg-blue-50 border-blue-200'
      case 'completed':
        return 'bg-green-50 border-green-200'
      case 'failed':
        return 'bg-red-50 border-red-200'
      default:
        return 'bg-gray-50 border-gray-200'
    }
  }

  const tokens = job.params?.tokens || []

  return (
    <div className={`flex items-center justify-between p-3 rounded-lg border ${getStatusColor()}`}>
      <div className="flex items-center gap-3">
        {getStatusIcon()}
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium">Job {job.id.slice(0, 8)}...</span>
            <Badge variant="secondary" className="text-xs">
              {job.status === 'pending' && "Queued"}
              {job.status === 'processing' && "Processing"}
              {job.status === 'completed' && "Completed"}
              {job.status === 'failed' && "Failed"}
            </Badge>
          </div>
          {tokens.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {tokens.map((token: string, idx: number) => (
                <span key={idx} className="text-xs text-gray-600 font-mono bg-white px-1 py-0.5 rounded">
                  {token.length > 8 ? `${token.slice(0, 4)}...${token.slice(-4)}` : token}
                </span>
              ))}
            </div>
          )}
          {job.status === 'failed' && job.error && (
            <p className="text-xs text-red-600 mt-1">{job.error}</p>
          )}
        </div>
      </div>
      <div className="text-right text-sm text-gray-500">
        <div>{formatJobDuration(job.createdAt, job.completedAt)}</div>
        {job.status === 'processing' && <div className="text-xs">Running...</div>}
      </div>
    </div>
  )
}

// ---------------- Page ----------------
export default function TraderROIPage() {
  const [analyses, setAnalyses] = useState<TraderROIResult[]>([])
  const [loading, setLoading] = useState(true)
  const [activeJobs, setActiveJobs] = useState<AnalysisJob[]>([])

  // keep a selected analysis key so user selection is stable
  const [selectedKey, setSelectedKey] = useState<string | null>(null)

  const [form, setForm] = useState({
    tokens: [""],
    traderType: "all",
    minBuy: 100,
    minNumTokens: 1,
    window: "",
  })
  const [submitting, setSubmitting] = useState(false)
  const [sortConfig, setSortConfig] = useState<{ key: keyof TraderROIRecord | null; direction: "asc" | "desc" }>(
    {
      key: null,
      direction: "asc",
    }
  )

  // ---------------- Token freshness state ----------------
  type TokenStatus = {
    checking: boolean
    checked: boolean
    isFresh?: boolean
    createdAt?: number | null
    ageDays?: number | null
    error?: string
  }
  const [tokenStatus, setTokenStatus] = useState<Record<string, TokenStatus>>({})

  // Validate a single token by calling your API route: /api/trader-roi?token=...
  const validateToken = async (token: string): Promise<boolean> => {
    const t = token.trim()
    if (!t) return false

    // Avoid duplicate in-flight calls: if currently checking, just wait until checked
    const existing = tokenStatus[t]
    if (existing && existing.checking) {
      return new Promise<boolean>((resolve) => {
        const start = Date.now()
        const interval = setInterval(() => {
          const cur = tokenStatus[t]
          if (cur && !cur.checking) {
            clearInterval(interval)
            resolve(Boolean(cur.checked && cur.isFresh))
          } else if (Date.now() - start > 10000) {
            clearInterval(interval)
            resolve(false)
          }
        }, 200)
      })
    }

    // mark checking
    setTokenStatus(prev => ({ ...prev, [t]: { ...(prev[t] ?? {}), checking: true, checked: false, error: undefined } }))

    try {
      const res = await fetch(`/api/trader-roi?token=${encodeURIComponent(t)}`, { cache: "no-store" })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        const errMsg = body?.error ?? `HTTP ${res.status}`
        setTokenStatus(prev => ({ ...prev, [t]: { checking: false, checked: true, isFresh: false, error: String(errMsg) } }))
        return false
      }

      const data = await res.json().catch(() => null)
      if (!data || typeof data.isFresh === "undefined") {
        setTokenStatus(prev => ({ ...prev, [t]: { checking: false, checked: true, isFresh: false, error: "Invalid validation response" } }))
        return false
      }

      setTokenStatus(prev => ({
        ...prev,
        [t]: {
          checking: false,
          checked: true,
          isFresh: Boolean(data.isFresh),
          createdAt: typeof data.createdAt === "number" ? data.createdAt : null,
          ageDays: typeof data.ageDays === "number" ? data.ageDays : null,
          error: undefined,
        },
      }))

      return Boolean(data.isFresh)
    } catch (err: any) {
      console.error("[trader-roi] validateToken error:", err)
      setTokenStatus(prev => ({ ...prev, [t]: { checking: false, checked: true, isFresh: false, error: String(err?.message ?? "Network error") } }))
      return false
    }
  }

  // Helper: current cleaned tokens (trimmed, non-empty)
  const cleanedTokens = () => form.tokens.map(t => t.trim()).filter(Boolean)
  const tokenCountValid = () => cleanedTokens().length >= 1 && cleanedTokens().length <= 3

  // Job polling function
  const pollJobStatus = async (jobId: string) => {
    const maxPollingTime = 30 * 60 * 1000 // 30 minutes
    const startTime = Date.now()
    
    const poll = async () => {
      try {
        const res = await fetch(`/api/trader-roi?jobId=${jobId}`)
        if (!res.ok) {
          console.error(`Failed to poll job ${jobId}:`, res.status)
          setTimeout(poll, 10000) // Retry after 10 seconds on error
          return
        }
        
        const job = await res.json()
        
        // Update job status
        setActiveJobs(prev => prev.map(j => 
          j.id === jobId ? { ...j, status: job.status, completedAt: job.completedAt, error: job.error } : j
        ))
        
        if (job.status === 'completed') {
          // Job completed successfully
          setActiveJobs(prev => prev.filter(j => j.id !== jobId))
          
          // Add result to analyses
          if (job.result) {
            const newNorm = normalizeResult(job.result)
            setAnalyses(prev => {
              const newKey = keyFor(newNorm)
              const filtered = prev.filter(p => keyFor(p) !== newKey)
              return [newNorm, ...filtered]
            })
            setSelectedKey(keyFor(newNorm))
            
            // Show success notification (you might want to replace this with a toast)
            const tokens = job.result.tokens || []
            const tokenText = tokens.length === 1 ? `token ${tokens[0].slice(0, 8)}...` : `${tokens.length} tokens`
            alert(`Analysis completed successfully for ${tokenText}!`)
          }
          
        } else if (job.status === 'failed') {
          // Job failed
          setActiveJobs(prev => prev.filter(j => j.id !== jobId))
          alert(`Analysis failed: ${job.error || 'Unknown error'}`)
          
        } else if (Date.now() - startTime < maxPollingTime) {
          // Still processing, poll again
          setTimeout(poll, 5000) // Poll every 5 seconds
        } else {
          // Polling timeout
          setActiveJobs(prev => prev.map(j => 
            j.id === jobId ? { ...j, status: 'failed', error: 'Polling timeout' } : j
          ))
          alert("Analysis is taking longer than expected. Please check back later or contact support.")
        }
        
      } catch (error) {
        console.error("Error polling job status:", error)
        if (Date.now() - startTime < maxPollingTime) {
          setTimeout(poll, 10000) // Retry after 10 seconds on error
        } else {
          setActiveJobs(prev => prev.filter(j => j.id !== jobId))
        }
      }
    }
    
    // Start polling after 2 seconds (give the job time to start)
    setTimeout(poll, 2000)
  }

  // When tokens array changes, prune tokenStatus and validate
  useEffect(() => {
    const tokens = Array.from(new Set(cleanedTokens())) // unique trimmed tokens
    // prune
    setTokenStatus(prev => {
      const next: Record<string, TokenStatus> = {}
      for (const t of tokens) {
        if (prev[t]) next[t] = prev[t]
      }
      return next
    })

    // validate missing tokens
    tokens.forEach((t) => {
      const s = tokenStatus[t]
      if (!s || (!s.checked && !s.checking)) {
        validateToken(t).catch(() => {})
      }
    })
  }, [form.tokens])

  // ---------------- Data fetching (analyses) ----------------
  const fetchAnalyses = async (forceSelectLatest = false) => {
    try {
      setLoading(true)
      const res = await fetch("/api/trader-roi", { cache: "no-store" })
      const data = await res.json()
      const normalized = (data.analyses || []).map((a: any) => normalizeResult(a))

      // Deduplicate using a stable key
      const dedupMap = new Map<string, TraderROIResult>()
      for (const a of normalized) {
        const k = keyFor(a)
        const existing = dedupMap.get(k)
        if (!existing) {
          dedupMap.set(k, a)
        } else {
          const exTs = existing.generated_at ? Date.parse(String(existing.generated_at)) : 0
          const inTs = a.generated_at ? Date.parse(String(a.generated_at)) : 0
          if (inTs > exTs) dedupMap.set(k, a)
        }
      }

      const uniqueByKey = Array.from(dedupMap.values()).sort((a, b) => {
        const ta = a.generated_at ? Date.parse(String(a.generated_at)) : 0
        const tb = b.generated_at ? Date.parse(String(b.generated_at)) : 0
        if (ta === 0 && tb === 0) return keyFor(b).localeCompare(keyFor(a))
        return tb - ta
      })

      setAnalyses(uniqueByKey)

      // select logic
      setSelectedKey((prev) => {
        if (forceSelectLatest) {
          return uniqueByKey[0] ? keyFor(uniqueByKey[0]) : null
        }
        if (prev) {
          const stillPresent = uniqueByKey.some((x) => keyFor(x) === prev)
          return stillPresent ? prev : (uniqueByKey[0] ? keyFor(uniqueByKey[0]) : null)
        }
        return uniqueByKey[0] ? keyFor(uniqueByKey[0]) : null
      })
    } catch (err) {
      console.error("Failed to fetch trader ROI analyses:", err)
      setAnalyses([])
      setSelectedKey(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalyses()
  }, [])

  // current "selected" analysis (either user-picked or default latest)
  const selectedAnalysis = selectedKey ? analyses.find((a) => keyFor(a) === selectedKey) : analyses[0] || null
  const latest = selectedAnalysis

  const columns: { label: string; tooltip: string; key: keyof TraderROIRecord | "trader_id" }[] = [
    { label: "Wallet", tooltip: "The wallet address or trader ID", key: "trader_id" },
    { label: "Gross Profit ($)", tooltip: "Realized profits from sold tokens", key: "overall_realized_profit_usd" },
    { label: "Unrealized P&L ($)", tooltip: "Estimated profit/loss of tokens still held", key: "overall_estimated_unrealised_pnl" },
    { label: "ROI (%)", tooltip: "Return on investment", key: "ROI" },
    { label: "Total P&L ($)", tooltip: "Overall profit or loss", key: "overall_total_pnl" },
    { label: "Total Spent ($)", tooltip: "Total amount spent buying tokens", key: "overall_total_usd_spent" },
    { label: "Win Rate (%)", tooltip: "Percentage of profitable trades", key: "win_rate" },
    { label: "Sales Revenue ($)", tooltip: "Revenue from sold tokens", key: "overall_total_sales_revenue" },
    { label: "Tokens Traded", tooltip: "Number of unique tokens traded", key: "num_unique_tokens_traded" },
    { label: "Tokens in Profit", tooltip: "Number of tokens currently in profit", key: "num_tokens_in_profit" },
    { label: "Trades", tooltip: "Total number of trades", key: "number_of_trades" },
  ]

  // sorting
  const sortedRecords = latest?.records ? [...latest.records] : []
  if (sortConfig.key) {
    sortedRecords.sort((a, b) => {
      const aVal = a[sortConfig.key!]
      const bVal = b[sortConfig.key!]
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortConfig.direction === "asc" ? aVal - bVal : bVal - aVal
      }
      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortConfig.direction === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      }
      return 0
    })
  }

  const addTokenField = () => {
    if (form.tokens.length >= 3) return
    setForm((prev) => ({ ...prev, tokens: [...prev.tokens, ""] }))
  }

  const removeTokenField = (idx: number) => {
    setForm((prev) => {
      const updated = prev.tokens.filter((_, i) => i !== idx)
      return { ...prev, tokens: updated.length ? updated : [""] }
    })
  }

  const updateToken = (idx: number, value: string) => {
    setForm((prev) => {
      const updated = [...prev.tokens]
      updated[idx] = value.replace(/^\s+/, "")
      return { ...prev, tokens: updated }
    })
  }

  const handleTokenBlur = (idx: number) => {
    setForm((prev) => {
      const updated = [...prev.tokens]
      updated[idx] = updated[idx].trim()
      const token = updated[idx].trim()
      if (token) {
        validateToken(token).catch(() => {})
      }
      return { ...prev, tokens: updated }
    })
  }

  // submit - now creates async job
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const tokens = cleanedTokens()
    if (!tokenCountValid()) {
      alert("Please enter 1–3 token addresses.")
      return
    }

    setSubmitting(true)
    try {
      // Validate tokens first
      const validationPromises = tokens.map((t) => {
        const s = tokenStatus[t]
        if (!s || (!s.checked && !s.checking)) {
          return validateToken(t)
        }
        // Return the current status if already checked
        return Promise.resolve(Boolean(s.isFresh))
      })
      
      const validationResults = await Promise.all(validationPromises)
      const allFresh = validationResults.every(Boolean)
      if (!allFresh) {
        alert("One or more tokens are not fresh (launched within 2 days). Please correct them before running analysis.")
        setSubmitting(false)
        return
      }

      // Create payload after validation passes
      const payload = {
        tokens,
        trader_type: form.traderType,
        useEarlyTraders: form.traderType === "early",
        earlyTraderWindow: form.traderType === "early" ? Number(form.window || 0) : undefined,
        min_buy: Number(form.minBuy),
        minBuyUsd: Number(form.minBuy),
        min_num_tokens_in_profit: Number(form.minNumTokens),
        minNumTokensInProfit: Number(form.minNumTokens),
        window: form.traderType === "early" ? Number(form.window || 0) : undefined,
      }

      console.log("[trader-roi] Submitting payload:", payload)

      // Start async job
      const res = await fetch("/api/trader-roi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const txt = await res.text().catch(() => "")
        console.error("Failed to submit analysis request:", res.status, txt)
        alert(`Analysis taking longer than usual, Please use the refresh button to see output after some minutes: ${res.status} ${res.statusText}`)
        return
      }

      const result = await res.json()
      console.log("[trader-roi] Job creation response:", result)

      const jobId = result.jobId

      if (jobId) {
        // Add job to tracking
        const newJob: AnalysisJob = {
          id: jobId,
          status: 'pending',
          createdAt: new Date().toISOString(),
          params: payload
        }
        
        setActiveJobs(prev => [newJob, ...prev])
        
        // Start polling for job status
        pollJobStatus(jobId)
        
        // Show success message
        const tokenText = tokens.length === 1 ? 
          `token ${tokens[0].slice(0, 8)}...` : 
          `${tokens.length} tokens`
        alert(`Analysis started for ${tokenText}! You can continue using the app while we process your request.`)
        
        // Reset form only after successful submission
        setForm({ tokens: [""], traderType: "all", minBuy: 100, minNumTokens: 1, window: "" })
        setTokenStatus({})
      } else {
        console.error("No jobId in response:", result)
        alert("Failed to start analysis today due to high demand. Please try again later.")
      }

    } catch (err) {
      console.error("Error submitting analysis:", err)
      // More detailed error message
      if (err instanceof Error) {
        alert(`Error submitting analysis: ${err.message}`)
      } else {
        alert("Error submitting analysis: Unknown error occurred")
      }
    } finally {
      setSubmitting(false)
    }
  }

  // Determine if Run Analysis button should be disabled
  const enteredTokens = cleanedTokens()
  const isRunDisabled = submitting || !tokenCountValid() || enteredTokens.some(t => {
    const s = tokenStatus[t]
    return !(s && s.checked && s.isFresh)
  })

  return (
    <div className="space-y-6">
      {/* Active Jobs Card */}
      {activeJobs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
              Active Analysis Jobs
            </CardTitle>
            <CardDescription>Jobs currently being processed</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeJobs.map(job => (
                <JobStatusCard key={job.id} job={job} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Run New Analysis Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Run New Analysis</CardTitle>
          <CardDescription className="text-sm text-gray-500">Enter tokens and apply filters</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Tokens */}
            <div>
              <label className="text-xs font-medium mb-2 block">Token Addresses (1–3)</label>
              <div className="space-y-2">
                {form.tokens.map((token, idx) => {
                  const t = token.trim()
                  const status = t ? tokenStatus[t] : undefined

                  return (
                    <div key={idx} className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <Input
                          value={token}
                          onChange={(e) => updateToken(idx, e.target.value)}
                          onBlur={() => handleTokenBlur(idx)}
                          placeholder="Enter token address"
                          className="text-sm flex-1"
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => removeTokenField(idx)}
                          disabled={form.tokens.length === 1}
                        >
                          Remove
                        </Button>
                      </div>

                      {/* Inline validation message */}
                      <div>
                        {t ? (
                          status?.checking ? (
                            <p className="text-xs text-gray-500 mt-1">Checking token launch date...</p>
                          ) : status?.error ? (
                            <p className="text-xs text-red-500 mt-1">Error: {status.error}</p>
                          ) : status?.checked && status?.isFresh ? (
                            <p className="text-xs text-green-600 mt-1">✅ Token is less than 2 days old</p>
                          ) : status?.checked && !status?.isFresh ? (
                            <p className="text-xs text-red-500 mt-1">⚠️ Use a token launched less than 2 days ago</p>
                          ) : (
                            <p className="text-xs text-gray-500 mt-1">Address will be validated automatically.</p>
                          )
                        ) : null}
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="flex items-center gap-3 mt-2">
                <Button type="button" size="sm" onClick={addTokenField} disabled={form.tokens.length >= 3}>
                  + Add Token
                </Button>
                <div className="text-xs text-gray-500">{cleanedTokens().length} entered — max 3.</div>
              </div>
              {!tokenCountValid() && (
                <p className="text-xs text-red-500 mt-2">Please enter between 1 and 3 non-empty token addresses.</p>
              )}
            </div>

            {/* Inline Filters */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="flex flex-col">
                <label className="text-xs font-medium mb-1">Trader Type</label>
                <Select value={form.traderType} onValueChange={(value) => setForm({ ...form, traderType: value })}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="early">Early</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.traderType === "early" && (
                <div className="flex flex-col">
                  <label className="text-xs font-medium mb-1">Window (hrs)</label>
                  <Input
                    type="number"
                    value={form.window}
                    onChange={(e) => setForm({ ...form, window: e.target.value })}
                    placeholder="e.g. 6"
                    className="text-sm"
                  />
                </div>
              )}
              <div className="flex flex-col">
                <label className="text-xs font-medium mb-1">Min First Buy ($)</label>
                <Input
                  type="number"
                  value={form.minBuy}
                  onChange={(e) => setForm({ ...form, minBuy: Number(e.target.value) })}
                  className="text-sm"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-xs font-medium mb-1">Min Tokens in Profit</label>
                <Input
                  type="number"
                  value={form.minNumTokens}
                  onChange={(e) => setForm({ ...form, minNumTokens: Number(e.target.value) })}
                  className="text-sm"
                />
              </div>
            </div>

            {/* Submit */}
            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={isRunDisabled} size="sm">
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {submitting ? "Starting Analysis..." : "Run Analysis"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Latest / Selected Analysis */}
      <Card className="shadow-md">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2">
            <CardTitle className="text-xl font-semibold flex items-center gap-2">📊 Trader ROI Analysis</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 hidden sm:inline">View analyses by other users:</span>

            <Select
              value={selectedKey ?? "__none__"}
              onValueChange={(v) => setSelectedKey(v === "__none__" ? null : v)}
            >
              <SelectTrigger className="min-w-[220px] text-sm">
                <SelectValue
                  placeholder={
                    analyses.length
                      ? formatAnalysisDropdownLabel(analyses[0])
                      : "No analyses"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {analyses.length === 0 ? (
                  <SelectItem value="__none__">No analyses</SelectItem>
                ) : (
                  analyses.map((a) => (
                    <SelectItem key={keyFor(a)} value={keyFor(a)}>
                      {formatAnalysisDropdownLabel(a)}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>

            <Button size="sm" variant="outline" onClick={() => fetchAnalyses(true)} title="Refresh and show the latest analysis">
              Refresh (latest)
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              <span className="ml-2 text-gray-500">Loading analyses...</span>
            </div>
          ) : latest ? (
            <div className="space-y-4">
              {/* Summary */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-sm gap-2">
                <span>
                  <strong>Analysis:</strong> {displayDateOrId(latest)}
                </span>
                <span className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                  <Badge>{latest.params?.window_hours && latest.params.window_hours > 0 ? "Early Traders" : "All Traders"}</Badge>
                  <span>Min First Buy: ${latest.params?.minimum_initial_buy_usd ?? 0} || </span>
                  <span>Min Tokens in Profit: {latest.params?.min_profitable_trades ?? 0}</span>
                  {latest.params?.window_hours && latest.params.window_hours > 0 && (
                    <span> || Trade Window: {latest.params?.window_hours ?? 0} hrs</span>
                  )}
                </span>
              </div>

              {/* Tokens Analysed */}
              {latest.tokens && latest.tokens.length > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-start gap-2 bg-gray-50 p-2 rounded-md border border-gray-200">
                  <span className="text-sm font-medium whitespace-nowrap">Tokens Analysed:</span>
                  <div className="flex flex-wrap gap-2">
                    {latest.tokens.map((t, idx) => (
                      <Badge key={idx} variant="secondary" className="truncate max-w-[120px] text-xs sm:text-sm" title={t}>
                        {t.length > 12 ? `${t.slice(0, 6)}…${t.slice(-4)}` : t}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Results Table */}
              <div style={{ maxHeight: "660px" }} className="overflow-auto border rounded-md">
                <Table className="min-w-max">
                  <TableHeader>
                    <TableRow>
                      {columns.map((h, i) => (
                        <TableHead
                          key={i}
                          title={h.tooltip}
                          onClick={() => {
                            if (sortConfig.key === h.key) {
                              setSortConfig({
                                key: h.key as keyof TraderROIRecord,
                                direction: sortConfig.direction === "asc" ? "desc" : "asc",
                              })
                            } else {
                              setSortConfig({ key: h.key as keyof TraderROIRecord, direction: "asc" })
                            }
                          }}
                          className={`cursor-pointer select-none sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm ${
                            i === 0 ? "left-0 z-30 border-r border-gray-200 dark:border-slate-700" : "z-20"
                          }`}
                        >
                          <div className="flex items-center gap-1">
                            {h.label}
                            {sortConfig.key === h.key && <span>{sortConfig.direction === "asc" ? "▲" : "▼"}</span>}
                          </div>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.isArray(sortedRecords) && sortedRecords.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={columns.length} className="text-center text-gray-500 py-6">
                          No profitable trader found that has achieved the set minimum first trade buy amount
                        </TableCell>
                      </TableRow>
                    ) : (
                      sortedRecords.map((r, i) => (
                        <TableRow key={i}>
                          <TableCell className="sticky left-0 bg-white dark:bg-slate-900 z-10 border-r border-gray-200 dark:border-slate-700">
                            <WalletCell address={r.trader_id} />
                          </TableCell>
                          <TableCell><PnLCell value={r.overall_realized_profit_usd} /></TableCell>
                          <TableCell><PnLCell value={r.overall_estimated_unrealised_pnl} /></TableCell>
                          <TableCell><PnLCell value={r.ROI * 100} isPercent /></TableCell>
                          <TableCell><PnLCell value={r.overall_total_pnl} /></TableCell>
                          <TableCell>${formatNumber(r.overall_total_usd_spent)}</TableCell>
                          <TableCell>{formatNumber(r.win_rate * 100)}%</TableCell>
                          <TableCell>${formatNumber(r.overall_total_sales_revenue)}</TableCell>
                          <TableCell>{r.num_unique_tokens_traded}</TableCell>
                          <TableCell>{r.num_tokens_in_profit}</TableCell>
                          <TableCell>{r.number_of_trades}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No analyses available yet.</p>
              <p className="text-sm text-gray-400 mt-2">Run your first analysis above to get started.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}