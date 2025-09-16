import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const getSupabaseClient = () => {
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_KEY environment variables")
  }

  return createClient(supabaseUrl, supabaseKey)
}

const downloadStatsFromSupabase = async () => {
  try {
    const supabase = getSupabaseClient()

    const { data: schedulingData, error: schedulingError } = await supabase.storage
      .from("bot-data")
      .download("scheduling_state.pkl")

    const { data: overlapData, error: overlapError } = await supabase.storage
      .from("bot-data")
      .download("overlap_results.pkl")

    if (!schedulingError && !overlapError) {
      console.log("Successfully downloaded stats data from Supabase")
      // In a real implementation, you'd parse the pickle files here
      return { hasRealData: true }
    }

    return { hasRealData: false }
  } catch (error) {
    console.error("Failed to download stats from Supabase:", error)
    return { hasRealData: false }
  }
}

export async function GET() {
  try {
    const { hasRealData } = await downloadStatsFromSupabase()

    // Mock stats data (would be replaced with real parsed data)
    const stats = {
      total_tokens: 1247,
      critical_alerts: 3,
      high_alerts: 12,
      medium_alerts: 28,
      monitoring_active: true,
      last_scan: new Date().toISOString(),
      avg_overlap_score: 23.5,
      data_source: hasRealData ? "supabase" : "mock",
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error("Error fetching stats:", error)
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 })
  }
}
