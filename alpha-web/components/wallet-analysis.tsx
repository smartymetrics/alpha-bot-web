"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { XAxis, YAxis, ResponsiveContainer, AreaChart, Area } from "recharts"
import { Search, Clock, DollarSign, Target, Activity } from "lucide-react"
import { useState } from "react"

// Mock data for wallet analysis
const mockWalletData = {
  address: "7xKXmF2vRnqKjJp9mPqWzBvYtN3sL8dR4cE6hG1aS9mPq",
  balance: "$127,450",
  totalTrades: 342,
  winRate: "74%",
  totalROI: "+289.7%",
  avgHoldTime: "2.8 days",
  riskScore: "Medium",
  lastActive: "12 min ago",
}

const mockTradeHistory = [
  {
    id: 1,
    token: "BONK",
    type: "BUY",
    amount: "1,250,000",
    price: "$0.000011",
    value: "$13.75",
    timestamp: "2024-01-15 14:23:12",
    status: "Completed",
  },
  {
    id: 2,
    token: "BONK",
    type: "SELL",
    amount: "1,250,000",
    price: "$0.000015",
    value: "$18.75",
    timestamp: "2024-01-16 09:45:33",
    status: "Completed",
    pnl: "+36.4%",
  },
  {
    id: 3,
    token: "WIF",
    type: "BUY",
    amount: "45",
    price: "$2.12",
    value: "$95.40",
    timestamp: "2024-01-16 11:12:45",
    status: "Completed",
  },
  {
    id: 4,
    token: "PEPE",
    type: "BUY",
    amount: "8,900,000",
    price: "$0.0000087",
    value: "$77.43",
    timestamp: "2024-01-17 16:34:21",
    status: "Completed",
  },
  {
    id: 5,
    token: "WIF",
    type: "SELL",
    amount: "45",
    price: "$2.34",
    value: "$105.30",
    timestamp: "2024-01-18 08:56:12",
    status: "Completed",
    pnl: "+10.4%",
  },
]

const mockPerformanceData = [
  { date: "2024-01-01", value: 10000, pnl: 0 },
  { date: "2024-01-05", value: 11200, pnl: 1200 },
  { date: "2024-01-10", value: 13500, pnl: 3500 },
  { date: "2024-01-15", value: 12800, pnl: 2800 },
  { date: "2024-01-20", value: 15600, pnl: 5600 },
  { date: "2024-01-25", value: 18900, pnl: 8900 },
  { date: "2024-01-30", value: 22400, pnl: 12400 },
]

const mockHoldings = [
  { token: "BONK", amount: "2,450,000", value: "$29.40", percentage: "23.1%", change: "+12.4%" },
  { token: "WIF", amount: "12", value: "$28.08", percentage: "22.0%", change: "+8.7%" },
  { token: "PEPE", amount: "5,600,000", value: "$49.84", percentage: "39.1%", change: "-2.1%" },
  { token: "SOL", amount: "0.45", value: "$20.25", percentage: "15.8%", change: "+5.2%" },
]

export function WalletAnalysis() {
  const [walletAddress, setWalletAddress] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const handleAnalyze = () => {
    setIsAnalyzing(true)
    // Simulate API call
    setTimeout(() => setIsAnalyzing(false), 2000)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-bold text-balance">Wallet Analysis</h2>
          <p className="text-muted-foreground">Deep dive into individual wallet trading patterns and performance</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Analyze Wallet</CardTitle>
          <CardDescription>Enter a Solana wallet address to view detailed trading metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Enter wallet address (e.g., 7xKXmF2vRnqKjJp9mPqWzBvYtN3sL8dR4cE6hG1aS9mPq)"
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                className="pl-10 font-mono"
              />
            </div>
            <Button onClick={handleAnalyze} disabled={isAnalyzing}>
              {isAnalyzing ? "Analyzing..." : "Analyze"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Portfolio Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockWalletData.balance}</div>
            <p className="text-xs text-muted-foreground">
              Total ROI: <span className="text-green-600">{mockWalletData.totalROI}</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{mockWalletData.winRate}</div>
            <p className="text-xs text-muted-foreground">{mockWalletData.totalTrades} total trades</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Hold Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockWalletData.avgHoldTime}</div>
            <p className="text-xs text-muted-foreground">Risk Score: {mockWalletData.riskScore}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Active</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockWalletData.lastActive}</div>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Performance Chart</CardTitle>
            <CardDescription>Portfolio value over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                value: { label: "Portfolio Value", color: "#10b981" },
                pnl: { label: "P&L", color: "#3b82f6" },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mockPerformanceData}>
                  <XAxis dataKey="date" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area type="monotone" dataKey="value" stroke="#10b981" fill="#10b981" fillOpacity={0.2} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Current Holdings</CardTitle>
            <CardDescription>Token distribution in wallet</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockHoldings.map((holding, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-xs font-bold">{holding.token.slice(0, 2)}</span>
                    </div>
                    <div>
                      <div className="font-medium">{holding.token}</div>
                      <div className="text-sm text-muted-foreground">{holding.amount}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{holding.value}</div>
                    <div className={`text-sm ${holding.change.startsWith("+") ? "text-green-600" : "text-red-600"}`}>
                      {holding.change}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Trade History</CardTitle>
          <CardDescription>Recent trading activity for this wallet</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Token</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>P&L</TableHead>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockTradeHistory.map((trade) => (
                  <TableRow key={trade.id}>
                    <TableCell className="font-medium">{trade.token}</TableCell>
                    <TableCell>
                      <Badge variant={trade.type === "BUY" ? "default" : "secondary"}>{trade.type}</Badge>
                    </TableCell>
                    <TableCell className="font-mono">{trade.amount}</TableCell>
                    <TableCell className="font-mono">{trade.price}</TableCell>
                    <TableCell className="font-mono">{trade.value}</TableCell>
                    <TableCell>
                      {trade.pnl ? (
                        <span
                          className={`font-medium ${trade.pnl.startsWith("+") ? "text-green-600" : "text-red-600"}`}
                        >
                          {trade.pnl}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-sm">{trade.timestamp}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{trade.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
