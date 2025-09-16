"use client"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TokenMonitor } from "@/components/token-monitor"
import { Activity, TrendingUp, Wallet } from "lucide-react"

export default function TradingDashboard() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-balance">Solana Trading Analytics</h1>
              <p className="text-sm text-muted-foreground">Professional token monitoring & analysis</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Tabs defaultValue="tokens" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
            <TabsTrigger value="tokens" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Token Monitor
            </TabsTrigger>
            <TabsTrigger value="roi" className="flex items-center gap-2" disabled>
              <TrendingUp className="h-4 w-4" />
              Trader ROI
            </TabsTrigger>
            <TabsTrigger value="wallet" className="flex items-center gap-2" disabled>
              <Wallet className="h-4 w-4" />
              Wallet Analysis
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tokens" className="space-y-6">
            <TokenMonitor />
          </TabsContent>

          <TabsContent value="roi" className="space-y-6">
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Trader ROI Analysis</h3>
                <p className="text-muted-foreground">Coming soon - Advanced trader performance metrics</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="wallet" className="space-y-6">
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <Wallet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Wallet Analysis</h3>
                <p className="text-muted-foreground">Coming soon - Deep wallet trading insights</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
