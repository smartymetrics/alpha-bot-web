import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.SUPABASE_URL || ""
const supabaseKey = process.env.SUPABASE_KEY || ""

export const supabase = createClient(supabaseUrl, supabaseKey)

export async function downloadPickleFile(fileName: string, bucketName = "bot-data") {
  try {
    const { data, error } = await supabase.storage.from(bucketName).download(fileName)

    if (error) {
      console.error(`Error downloading ${fileName}:`, error)
      return null
    }

    return data
  } catch (error) {
    console.error(`Failed to download ${fileName}:`, error)
    return null
  }
}

export async function uploadPickleFile(filePath: string, fileName: string, bucketName = "bot-data") {
  try {
    // This would be used for uploading files to Supabase Storage
    // Implementation depends on how files are handled in the Next.js environment
    console.log(`Upload ${fileName} to ${bucketName} bucket`)
    return true
  } catch (error) {
    console.error(`Failed to upload ${fileName}:`, error)
    return false
  }
}

// Legacy helper functions (kept for compatibility)
export async function getTokensFromSupabase() {
  const { data, error } = await supabase
    .from("overlap_results")
    .select("*")
    .order("discovered_at", { ascending: false })
    .limit(100)

  if (error) {
    console.error("Error fetching from Supabase:", error)
    return []
  }

  return data || []
}

export async function getStatsFromSupabase() {
  const { data, error } = await supabase.from("monitoring_stats").select("*").single()

  if (error) {
    console.error("Error fetching stats from Supabase:", error)
    return null
  }

  return data
}
