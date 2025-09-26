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

    const latest = history[history.length - 1]?.result || {};
    const meta = latest.token_metadata || {};

    // Extract current_price_usd from the dexscreener object
    const currentPriceUsd = latest.dexscreener?.current_price_usd ?? null;

    tokens.push({
      id: tokenId,
      symbol: meta.symbol || "",
      name: meta.name || "Unknown",
      address: tokenId,
      grade: latest.grade || "NONE",
      overlap_percentage: latest.overlap_percentage ?? 0,
      concentration: latest.concentration ?? 0,
      discovered_at: latest.checked_at || null,
      dexscreener_url: `https://dexscreener.com/solana/${tokenId}`,
      priceUsd: currentPriceUsd, // ✅ this is the price frontend should use as "call price"
    });
  }

  // Sort by discovered_at descending
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

// ✅ Mock fallback
const generateMockTokensServer = () => {
  const grades = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "NONE"];
  return Array.from({ length: 12 }).map((_, i) => ({
    id: `token_${i}`,
    symbol: `TOK${i}`,
    name: `Token ${i}`,
    address: `${Math.random().toString(36).substring(2, 12)}`,
    grade: grades[Math.floor(Math.random() * grades.length)],
    overlap_percentage: Math.floor(Math.random() * 60),
    concentration: Math.round(Math.random() * 1000) / 10,
    discovered_at: new Date(
      Date.now() - Math.random() * 86400000
    ).toISOString(),
    dexscreener_url: `https://dexscreener.com/solana/token_${i}`,
    priceUsd: (Math.random() * 0.01).toFixed(6),
  }));
};

// ✅ GET endpoint
export async function GET() {
  try {
    console.log("[v1] Starting tokens API request");

    const parsed = await downloadOverlapResults();
    const tokens = parsed && parsed.length > 0 ? parsed : generateMockTokensServer();
    const data_source = parsed ? "supabase_json" : "mock";

    return NextResponse.json(
      {
        tokens,
        last_updated: new Date().toISOString(),
        total_count: tokens.length,
        data_source,
      },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("[v1] Unexpected error in tokens API:", err);
    const tokens = generateMockTokensServer();
    return NextResponse.json(
      {
        tokens,
        last_updated: new Date().toISOString(),
        total_count: tokens.length,
        data_source: "error_fallback",
        error: String(err),
      },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  }
}
