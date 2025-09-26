import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"

const BUCKET_NAME = "monitor-data"
const FOLDER_NAME = "recent_analyses"

const getSupabaseClient = () => {
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_KEY
  if (!supabaseUrl || !supabaseKey) {
    console.error("[trader-roi] Missing Supabase env vars")
    return null
  }
  return createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

// ---------------- GET: return *all* saved analyses or validate a token ----------------
const downloadAllAnalyses = async (): Promise<any[]> => {
  try {
    const supabase = getSupabaseClient()
    if (!supabase) return []

    const { data: files, error } = await supabase.storage
      .from(BUCKET_NAME)
      .list(FOLDER_NAME, { limit: 100 })

    if (error || !files || files.length === 0) return []

    const jsonFiles = files.filter(
      (f) => f.name.startsWith("analysis_") && f.name.endsWith(".json")
    )
    if (jsonFiles.length === 0) return []

    // newest first
    jsonFiles.sort((a, b) => b.name.localeCompare(a.name))

    const analyses: any[] = []
    for (const f of jsonFiles) {
      const { data: fileData, error: downloadError } = await supabase.storage
        .from(BUCKET_NAME)
        .download(`${FOLDER_NAME}/${f.name}`)

      if (downloadError || !fileData) continue

      const buffer = await fileData.arrayBuffer()
      try {
        const json = JSON.parse(Buffer.from(buffer).toString("utf-8"))
        json.records = json.records || []
        analyses.push(json)
      } catch (parseErr) {
        console.warn("[trader-roi] Failed to parse:", f.name, parseErr)
      }
    }

    return analyses
  } catch (err) {
    console.error("[trader-roi] GET error:", err)
    return []
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get("token")

    if (token) {
      try {
        const res = await fetch(
          `https://api.dexscreener.com/latest/dex/tokens/${token}`
        )
        if (!res.ok) {
          return NextResponse.json(
            { error: "Network error"}, //"DexScreener request failed" },
            { status: 500 }
          )
        }
        const data = await res.json()
        const pair = data?.pairs?.[0]

        if (!pair) {
          return NextResponse.json(
            { error: "Not a valid mint address" },
            { status: 404 }
          )
        }

        if (pair.chainId !== "solana") {
          return NextResponse.json(
            { error: "This token is not on Solana" },
            { status: 400 }
          )
        }

        const createdAt = pair.pairCreatedAt
        const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000
        const ageMs = Date.now() - Number(createdAt)
        const ageDays = ageMs / (24 * 60 * 60 * 1000)

        return NextResponse.json({
          token,
          chainId: pair.chainId,
          createdAt,
          ageDays: Number(ageDays.toFixed(2)),
          isFresh: ageMs <= TWO_DAYS_MS,
        })
      } catch (err) {
        console.error("[trader-roi] DexScreener validation error:", err)
        return NextResponse.json(
          { error: "Validation failed" },
          { status: 500 }
        )
      }
    }

    const allAnalyses = await downloadAllAnalyses()
    return NextResponse.json({ analyses: allAnalyses })
  } catch (err) {
    console.error("[trader-roi] GET handler error:", err)
    return NextResponse.json({ analyses: [] })
  }
}

// ---------------- POST: run new analysis via Railway backend ----------------
export async function POST(req: Request) {
  try {
    const body = await req.json()

    // ✅ Validate token with DexScreener before backend call
    if (body?.token) {
      try {
        const res = await fetch(
          `https://api.dexscreener.com/latest/dex/tokens/${body.token}`
        )
        if (!res.ok) {
          return NextResponse.json(
            { error: "DexScreener request failed" },
            { status: 500 }
          )
        }
        const data = await res.json()
        const pair = data?.pairs?.[0]

        if (!pair) {
          return NextResponse.json(
            { error: "Not a valid token address" },
            { status: 404 }
          )
        }

        if (pair.chainId !== "solana") {
          return NextResponse.json(
            { error: "This token is not on Solana" },
            { status: 400 }
          )
        }
      } catch (err) {
        console.error("[trader-roi] Solana validation failed:", err)
        return NextResponse.json(
          { error: "Failed to validate token" },
          { status: 500 }
        )
      }
    }

    // ✅ Proceed with backend call only if Solana token is valid
    const backendUrl = `${process.env.ALPHA_API_URL}/analyze`
    const resp = await fetch(backendUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })

    if (!resp.ok) {
      const errTxt = await resp.text()
      console.error("[trader-roi] Backend error:", errTxt)
      return NextResponse.json(
        { error: `Backend failed (${resp.status})` },
        { status: 500 }
      )
    }

    const analysis = await resp.json()

    // Save to Supabase
    try {
      const supabase = getSupabaseClient()
      if (supabase) {
        const now = Date.now()
        const filePath = `${FOLDER_NAME}/analysis_${now}.json`
        const { error: uploadError } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(filePath, JSON.stringify(analysis), {
            contentType: "application/json",
          })
        if (uploadError) {
          console.warn("[trader-roi] Supabase upload failed:", uploadError.message)
        }
      }
    } catch (saveErr) {
      console.warn("[trader-roi] Could not save analysis:", saveErr)
    }

    return NextResponse.json({ analysis })
  } catch (err) {
    console.error("[trader-roi] POST handler error:", err)
    return NextResponse.json(
      { error: "Failed to run analysis" },
      { status: 500 }
    )
  }
}
