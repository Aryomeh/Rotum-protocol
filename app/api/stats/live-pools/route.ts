import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

const TOTAL_SUPPLY = 1_000_000;

// Friendly display labels — allocation_name is the DB key, this is just presentation
const POOL_LABELS: Record<string, string> = {
  season_1_pool: "Season 1 Rewards",
  season_2_pool: "Season 2 Rewards",
  referral_engine: "Referral Engine",
  airdrop_tasks: "Airdrop & Tasks",
  ecosystem_treasury: "Ecosystem Treasury",
  liquidity_pool: "Liquidity Pool",
  team_development: "Team & Development",
};

export const revalidate = 0;

// Public, read-only, no PII — safe to open to any origin (GitHub Pages site + admin panel)
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("tokenomics_supply")
      .select("allocation_name, total_allocated, amount_distributed, amount_remaining");

    if (error || !data) {
      console.error("live-pools: tokenomics_supply fetch failed", error);
      return NextResponse.json(
        { error: "Failed to fetch pool data" },
        { status: 500, headers: CORS_HEADERS }
      );
    }

    const pools = data.map((row) => {
      const allocated = Number(row.total_allocated);
      const distributed = Number(row.amount_distributed);
      const remaining = Number(row.amount_remaining);
      const percentUsed = allocated > 0
        ? Number(((distributed / allocated) * 100).toFixed(2))
        : 0;

      return {
        key: row.allocation_name,
        label: POOL_LABELS[row.allocation_name] ?? row.allocation_name,
        allocated,
        remaining,
        distributed,
        percentUsed,
      };
    });

    const totalDistributed = pools.reduce((sum, p) => sum + p.distributed, 0);
    const totalRemaining = pools.reduce((sum, p) => sum + p.remaining, 0);

    return NextResponse.json(
      {
        totalSupply: TOTAL_SUPPLY,
        totalDistributed,
        totalRemaining,
        percentCirculating: Number(((totalDistributed / TOTAL_SUPPLY) * 100).toFixed(2)),
        pools,
        updatedAt: new Date().toISOString(),
      },
      { headers: CORS_HEADERS }
    );
  } catch (err) {
    console.error("live-pools: unexpected error", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}