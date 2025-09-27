// app/api/tokens/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const BUCKET_NAME = "monitor-data";
const FILE_NAME = "overlap_results.json";

// ✅ Supabase client factory
const getSupabaseClient = () => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    console.error("[v1] Missing Supabase env vars");
    return null;
  }
  return createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
};

// ✅ Parse JSON from overlap_results
const parseOverlapResults = (json: any): any[] => {
  if (!json || typeof json !== "object") return [];

  const tokens: any[] = [];

  for (const [tokenId, history] of Object.entries(json)) {
    if (!Array.isArray(history) || history.length === 0) continue;

    const latestEntry: any = history[history.length - 1];
    const latest = latestEntry?.result || {};
    const meta = latest.token_metadata || {};

    tokens.push({
      id: tokenId,
      symbol: meta.symbol || "",
      name: meta.name || "Unknown",
      address: tokenId,
      grade: latest.grade || "NONE",
      overlap_percentage: latest.overlap_percentage ?? 0,
      concentration: latest.concentration ?? 0,
      discovered_at:
        latest.checked_at || latest.updated_at || latestEntry?.timestamp || null,
      dexscreener_url: `https://dexscreener.com/solana/${tokenId}`,
      priceUsd: latestEntry?.dexscreener?.current_price_usd ?? null,
    });
  }

  // Sort by most recent
  tokens.sort(
    (a, b) =>
      new Date(b.discovered_at || 0).getTime() -
      new Date(a.discovered_at || 0).getTime()
  );

  return tokens.slice(0, 100);
};

// ✅ Download overlap_results.json from Supabase
const downloadOverlapResults = async (): Promise<any[] | null> => {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .download(`${FILE_NAME}?v=${Date.now()}`);

    if (error || !data) {
      console.warn("[v1] Supabase download failed:", error?.message);
      return null;
    }

    const buffer = await data.arrayBuffer();
    const json = JSON.parse(Buffer.from(buffer).toString("utf-8"));

    return parseOverlapResults(json);
  } catch (err) {
    console.error("[v1] Exception in downloadOverlapResults:", err);
    return null;
  }
};

// ✅ GET endpoint
export async function GET() {
  try {
    console.log("[v1] Starting tokens API request");

    const parsed = await downloadOverlapResults();

    if (!parsed || parsed.length === 0) {
      // Return mining state instead of mock
      return NextResponse.json(
        {
          tokens: [],
          message: "⛏️ Mining... no new potential tokens to be bought",
          last_updated: new Date().toISOString(),
          total_count: 0,
          data_source: "empty",
        },
        { status: 200, headers: { "Cache-Control": "no-store" } }
      );
    }

    return NextResponse.json(
      {
        tokens: parsed,
        last_updated: new Date().toISOString(),
        total_count: parsed.length,
        data_source: "supabase_json",
      },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("[v1] Unexpected error in tokens API:", err);
    return NextResponse.json(
      {
        tokens: [],
        message: "⚠️ Error fetching tokens",
        last_updated: new Date().toISOString(),
        total_count: 0,
        data_source: "error_fallback",
        error: String(err),
      },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  }
}
