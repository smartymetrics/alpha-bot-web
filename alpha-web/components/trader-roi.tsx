"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { TrendingUp, Users, DollarSign, Target, Calendar } from "lucide-react"
import { useState } from "react"

// Mock data for ROI analysis
const mockROIData = [
  { period: "1D", avgROI: 12.5, topROI: 45.2, traders: 234 },
  { period: "7D", avgROI: 28.7, topROI: 156.8, traders: 189 },
  { period: "30D", avgROI: 67.3, topROI: 342.1, traders: 145 },
  { period: "90D", avgROI: 124.8, topROI: 678.9, traders: 98 },
]

const mockTraderPerformance = [
  {
    id: 1,
    wallet: "7xKX...9mPq",
    totalROI: "+342.1%",
    winRate: "78%",
    totalTrades: 156,
    avgHoldTime: "2.3 days",
    bestTrade: "+89.4%",
    worstTrade: "-12.1%",
    volume: "$45.2K",
    rank: 1,
  },
  {
    id: 2,
    wallet: "9bYt...4nRs",
    totalROI: "+287.6%",
    winRate: "72%",
    totalTrades: 203,
    avgHoldTime: "1.8 days",
    bestTrade: "+76.3%",
    worstTrade: "-18.7%",
    volume: "$38.9K",
    rank: 2,
  },
  {
    id: 3,
    wallet: "3mKp...7wLx",
    totalROI: "+234.9%",
    winRate: "69%",
    totalTrades: 134,
    avgHoldTime: "3.1 days",
    bestTrade: "+65.2%",
    worstTrade: "-15.3%",
    volume: "$52.1K",
    rank: 3,
  },
  {
    id: 4,
    wallet: "5qNr...2vBm",
    totalROI: "+198.4%",
    winRate: "65%",
    totalTrades: 178,
    avgHoldTime: "2.7 days",
    bestTrade: "+58.9%",
    worstTrade: "-22.4%",
    volume: "$29.7K",
    rank: 4,
  },
  {
    id: 5,
    wallet: "8tWz...6kJh",
    totalROI: "+156.8%",
    winRate: "61%",
    totalTrades: 167,
    avgHoldTime: "4.2 days",
    bestTrade: "+45.7%",
    worstTrade: "-19.8%",
    volume: "$33.4K",
    rank: 5,
  },
]

const pieData = [
  { name: "Profitable", value: 68, color: "#10b981" },
  { name: "Break Even", value: 12, color: "#f59e0b" },
  { name: "Loss", value: 20, color: "#ef4444" },
]

export function TraderROI() {
  const [timeframe, setTimeframe] = useState("30D")
  const [sortBy, setSortBy] = useState("roi")

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-bold text-balance">Trader ROI Analysis</h2>
          <p className="text-muted-foreground">Performance metrics and returns analysis for token traders</p>
        </div>
        <div className="flex gap-2">
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-[120px]">
              <Calendar className="h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1D">1 Day</SelectItem>
              <SelectItem value="7D">7 Days</SelectItem>
              <SelectItem value="30D">30 Days</SelectItem>
              <SelectItem value="90D">90 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average ROI</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">+67.3%</div>
            <p className="text-xs text-muted-foreground">+12.4% from last period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Performer</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">+342.1%</div>
            <p className="text-xs text-muted-foreground">7xKX...9mPq wallet</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Traders</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">145</div>
            <p className="text-xs text-muted-foreground">-8 from last period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$2.4M</div>
            <p className="text-xs text-muted-foreground">+18.2% from last period</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>ROI Distribution</CardTitle>
            <CardDescription>Breakdown of trader performance</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                profitable: { label: "Profitable", color: "#10b981" },
                breakeven: { label: "Break Even", color: "#f59e0b" },
                loss: { label: "Loss", color: "#ef4444" },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>ROI Trends</CardTitle>
            <CardDescription>Average returns over time periods</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                avgROI: { label: "Average ROI", color: "#10b981" },
                topROI: { label: "Top ROI", color: "#3b82f6" },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mockROIData}>
                  <XAxis dataKey="period" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="avgROI" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="topROI" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top Performing Traders</CardTitle>
          <CardDescription>Ranked by total ROI over the selected time period</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead>Wallet</TableHead>
                  <TableHead>Total ROI</TableHead>
                  <TableHead>Win Rate</TableHead>
                  <TableHead>Trades</TableHead>
                  <TableHead>Avg Hold</TableHead>
                  <TableHead>Best Trade</TableHead>
                  <TableHead>Worst Trade</TableHead>
                  <TableHead>Volume</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockTraderPerformance.map((trader) => (
                  <TableRow key={trader.id}>
                    <TableCell>
                      <Badge variant={trader.rank <= 3 ? "default" : "secondary"}>#{trader.rank}</Badge>
                    </TableCell>
                    <TableCell className="font-mono">{trader.wallet}</TableCell>
                    <TableCell>
                      <span className="font-semibold text-green-600">{trader.totalROI}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{trader.winRate}</Badge>
                    </TableCell>
                    <TableCell>{trader.totalTrades}</TableCell>
                    <TableCell>{trader.avgHoldTime}</TableCell>
                    <TableCell className="text-green-600">{trader.bestTrade}</TableCell>
                    <TableCell className="text-red-600">{trader.worstTrade}</TableCell>
                    <TableCell className="font-mono">{trader.volume}</TableCell>
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
