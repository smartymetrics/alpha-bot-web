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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ArrowUpRight, ArrowDownRight, Minus, Loader2, Copy, Check } from "lucide-react"

// ---------------- Types ----------------
interface TraderROIRecord {
  trader_id: string
  // overall_current_value_of_holdings_usd: number
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
  // generated_at may be missing from server responses — keep optional
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

// ---------------- Helpers ----------------
const normalizeResult = (raw: any): TraderROIResult => {
  const params = raw?.params || raw?.payload?.params || {}
  // Prefer server-provided timestamps and ids. Do NOT invent client-side timestamps.
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
      // overall_current_value_of_holdings_usd: Number(r.overall_current_value_of_holdings_usd ?? r.overall_current_value_of_holdings ?? 0),
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

// Format a short consistent label for dropdown
const formatAnalysisDropdownLabel = (a: TraderROIResult) => {
  try {
    if (a.generated_at && !isNaN(Date.parse(String(a.generated_at)))) {
      const d = new Date(String(a.generated_at))
      // Use UTC-like compact format YYYY-MM-DD HH:mm (so labels are consistent across clients)
      const dateStr = d.toISOString().slice(0, 16).replace("T", " ")
      const tokenCount = a.tokens?.length ?? 0
      // show first token preview if there's just 1 or small addresses, else show count
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

// Build a stable key for deduping/selecting (prefer id then timestamp then token+params)
const keyFor = (a: TraderROIResult) => a.id ?? a.generated_at ?? JSON.stringify({ tokens: a.tokens ?? [], params: a.params ?? {} })

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

// ---------------- Page ----------------
export default function TraderROIPage() {
  const [analyses, setAnalyses] = useState<TraderROIResult[]>([])
  const [loading, setLoading] = useState(true)

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

  const fetchAnalyses = async (forceSelectLatest = false) => {
    try {
      setLoading(true)
      const res = await fetch("/api/trader-roi", { cache: "no-store" })
      const data = await res.json()
      const normalized = (data.analyses || []).map((a: any) => normalizeResult(a))

      // Deduplicate using a stable key (prefer id, then generated_at); pick newest by timestamp when available.
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
        // if both timestamps are zero, fallback to lexicographic key order (useful if filenames are timestamp-like)
        if (ta === 0 && tb === 0) return keyFor(b).localeCompare(keyFor(a))
        return tb - ta
      })

      setAnalyses(uniqueByKey)

      // select logic: if forced -> choose newest; otherwise preserve user selection if still present
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
  // history for the card (exclude the selected that is shown)
  const history = analyses.filter((a) => keyFor(a) !== (latest ? keyFor(latest) : ""))

  const columns: { label: string; tooltip: string; key: keyof TraderROIRecord | "trader_id" }[] = [
    { label: "Wallet", tooltip: "The wallet address or trader ID", key: "trader_id" },
    // { label: "Current Value ($)", tooltip: "Total current value in USD of the tokens analysed", key: "overall_current_value_of_holdings_usd" },
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

  // sorting -- operate on the currently selected analysis records
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

  // form helpers
  const cleanedTokens = () => form.tokens.map(t => t.trim()).filter(Boolean)
  const tokenCountValid = () => cleanedTokens().length >= 1 && cleanedTokens().length <= 3

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
      return { ...prev, tokens: updated }
    })
  }

  // submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const tokens = cleanedTokens()
    if (!tokenCountValid()) {
      alert("Please enter 1–3 token addresses.")
      return
    }

    setSubmitting(true)
    try {
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

      const res = await fetch("/api/trader-roi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const txt = await res.text().catch(() => "")
        console.error("Failed to submit analysis request:", txt)
        alert("Failed to submit request.")
      } else {
        // prefer to use returned analysis immediately (so user sees their run),
        // fall back to re-fetch if response doesn't contain a stable key.
        const body = await res.json().catch(() => null)
        if (body && body.analysis) {
          const newNorm = normalizeResult(body.analysis)
          // if we don't have a stable key (neither id nor generated_at), prefer to refetch the list
          if (!newNorm.id && !newNorm.generated_at) {
            await fetchAnalyses()
          } else {
            setAnalyses((prev) => {
              const newKey = keyFor(newNorm)
              const filtered = prev.filter((p) => keyFor(p) !== newKey)
              return [newNorm, ...filtered]
            })
            setSelectedKey(keyFor(newNorm))
          }
        } else {
          // no analysis in response: refresh list from server
          await fetchAnalyses()
        }

        // reset form
        setForm({ tokens: [""], traderType: "all", minBuy: 100, minNumTokens: 1, window: "" })
      }
    } catch (err) {
      console.error("Error submitting analysis:", err)
      alert("Error submitting analysis.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
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
                {form.tokens.map((token, idx) => (
                  <div key={idx} className="flex items-center gap-2">
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
                ))}
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
              <Button type="submit" disabled={submitting || !tokenCountValid()} size="sm">
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {submitting ? "Running..." : "Run Analysis"}
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
            {/* <CardDescription className="hidden sm:block">View and compare runs</CardDescription> */}
          </div>
          {/* NEW: Dropdown to select which analysis to view */}
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

            {/* Refresh button */}
            <Button size="sm" variant="outline" onClick={() => fetchAnalyses(true)} title="Refresh and show the latest analysis">Refresh (latest)</Button>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <p>Loading...</p>
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
              <div className="overflow-x-auto border rounded-md">
                {/* show roughly 15 rows (scroll for the rest) */}
                <div style={{ maxHeight: "660px" }} className="overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {columns.map((h, i) => (
                          <TableHead
                            key={i}
                            title={h.tooltip}
                            onClick={() => {
                              if (sortConfig.key === h.key) {
                                setSortConfig({
                                  key: h.key,
                                  direction: sortConfig.direction === "asc" ? "desc" : "asc",
                                })
                              } else {
                                setSortConfig({ key: h.key as keyof TraderROIRecord, direction: "asc" })
                              }
                            }}
                            className="cursor-pointer select-none"
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
                      {/* NEW BEHAVIOR: if records array exists but is empty, show single full-width row with message */}
                      {Array.isArray(sortedRecords) && sortedRecords.length === 0 ? (
                        <TableRow>
                          {/* colSpan must match columns length */}
                          <TableCell colSpan={columns.length} className="text-center text-gray-500 py-6">
                            No profitable trader found that has achieved the set minimum first trade buy amount
                          </TableCell>
                        </TableRow>
                      ) : (
                        sortedRecords.map((r, i) => (
                          <TableRow key={i}>
                            <TableCell><WalletCell address={r.trader_id} /></TableCell>
                            {/* <TableCell>${formatNumber(r.overall_current_value_of_holdings_usd)}</TableCell> */}
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
            </div>
          ) : (
            <p>No analyses available yet.</p>
          )}
        </CardContent>
      </Card>

      {/* History Card */}
      {/* {history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">📜 Past Analyses</CardTitle>
            <CardDescription>Previous runs (most recent first)</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm">
              {history.map((h, idx) => (
                <li key={idx} className="border p-2 rounded-md bg-gray-50 flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <span className="font-medium">{displayDateOrId(h)}</span>{" "}
                    — <Badge>{h.trader_type === "early" ? "Early Traders" : "All Traders"}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2 sm:mt-0">
                    {h.tokens?.map((t, i) => (
                      <Badge key={i} variant="secondary" className="truncate max-w-[100px] text-xs" title={t}>
                        {t.length > 10 ? `${t.slice(0, 6)}…${t.slice(-4)}` : t}
                      </Badge>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )} */}
    </div>
  )
}
