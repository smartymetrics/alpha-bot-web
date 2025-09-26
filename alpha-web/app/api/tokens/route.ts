// app/api/tokens/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const BUCKET_NAME = "monitor-data";
const FILE_NAME = "overlap_results.json";
const PRICE_CHANGE_FOLDER = "price_change";

// in-memory cache of filenames in the price_change folder (reset on server restart/page refresh)
let cachedFiles: Set<string> | null = null;

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
      priceUsd: meta.priceUsd ?? null, // ⚡ make sure token price is passed
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

// Load cache once (fills cachedFiles with the names of files in the price_change folder)
const loadCache = async (supabase: any) => {
  if (cachedFiles !== null) return cachedFiles;

  try {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .list(PRICE_CHANGE_FOLDER);

    if (error) {
      console.error("[v1] list error (loadCache):", error.message);
      cachedFiles = new Set();
    } else {
      cachedFiles = new Set((data || []).map((f: any) => f.name));
    }
  } catch (err) {
    console.error("[v1] Exception loading cache:", err);
    cachedFiles = new Set();
  }

  return cachedFiles;
};

// ✅ Ensure JSON file exists for initial price (uses cachedFiles to avoid repeated list calls)
const ensureInitialPriceFile = async (supabase: any, token: any) => {
  try {
    const filePath = `${PRICE_CHANGE_FOLDER}/${token.address}.json`;
    const filename = `${token.address}.json`;

    // Only create file if we have a valid price
    if (token.priceUsd === null || token.priceUsd === undefined) {
      return;
    }

    const files = await loadCache(supabase);

    if (files.has(filename)) {
      // already exists -> skip upload
      return;
    }

    // Create JSON with initial price
    const jsonObj = {
      address: token.address,
      initial_price: token.priceUsd,
      created_at: new Date().toISOString(),
    };
    const json = JSON.stringify(jsonObj);

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      // keep same upload style as your original file (Blob). In Node env, Blob exists in modern runtimes.
      .upload(filePath, new Blob([json], { type: "application/json" }));

    if (uploadError) {
      // Only log errors that aren’t "already exists"
      const msg = uploadError.message || "";
      if (!msg.includes("The resource already exists")) {
        console.error("[v1] upload error:", msg);
      } else {
        // Race: file was created by other process — add to cache so we don't retry repeatedly
        files.add(filename);
      }
    } else {
      console.log(`[v1] Created price_change file for ${token.address}`);
      files.add(filename); // update cache
    }
  } catch (err) {
    console.error("[v1] Exception in ensureInitialPriceFile:", err);
  }
};

// ✅ Remove JSON for disappeared tokens (uses cachedFiles)
const cleanupPriceChangeFiles = async (
  supabase: any,
  activeAddresses: string[]
) => {
  try {
    const files = await loadCache(supabase);
    if (!files) return;

    // Find cached files not in activeAddresses
    const toRemoveNames = [...files].filter((name) => {
      const addr = name.replace(".json", "");
      return !activeAddresses.includes(addr);
    });

    if (toRemoveNames.length === 0) return;

    const toRemovePaths = toRemoveNames.map((name) => `${PRICE_CHANGE_FOLDER}/${name}`);

    const { error: removeError } = await supabase.storage
      .from(BUCKET_NAME)
      .remove(toRemovePaths);

    if (removeError) {
      console.error("[v1] remove error:", removeError.message);
    } else {
      console.log(`[v1] Removed ${toRemovePaths.length} stale price_change files`);
      // update cache
      toRemoveNames.forEach((n) => files.delete(n));
    }
  } catch (err) {
    console.error("[v1] Exception in cleanupPriceChangeFiles:", err);
  }
};

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

export async function GET() {
  try {
    console.log("[v1] Starting tokens API request");

    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase not initialized");

    // Load cache once per refresh/server-run
    await loadCache(supabase);

    const parsed = await downloadOverlapResults();
    const tokens = parsed && parsed.length > 0 ? parsed : generateMockTokensServer();
    const data_source = parsed ? "supabase_json" : "mock";

    // Ensure JSON exists for new tokens (ensureInitialPriceFile checks cache internally)
    await Promise.all(tokens.map((t) => ensureInitialPriceFile(supabase, t)));

    // Cleanup stale tokens (uses cache)
    const activeAddresses = tokens.map((t) => t.address);
    await cleanupPriceChangeFiles(supabase, activeAddresses);

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
