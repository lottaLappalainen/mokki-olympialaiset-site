"use server";

import { requireSpace } from "@/lib/auth/require";
import { signPaths } from "@/lib/storage/images";
import type {
  LeaderboardRow,
  LajiResultRow,
  Laji,
  LajiPhoto,
} from "./types";

// ── leaderboard: name, photo, total points (highest first) ────────────────
export async function getLeaderboard(): Promise<LeaderboardRow[]> {
  const { supabase } = await requireSpace();
  const { data, error } = await supabase
    .from("leaderboard")
    .select("player_id, name, photo_path, total_points")
    .order("total_points", { ascending: false })
    .order("name");
  if (error) throw new Error(error.message);

  const rows = data ?? [];
  const urls = await signPaths(supabase, rows.map((r) => r.photo_path));
  return rows.map((r) => ({
    player_id: r.player_id,
    name: r.name,
    photo_path: r.photo_path,
    photo_url: r.photo_path ? urls.get(r.photo_path) ?? null : null,
    total_points: r.total_points,
  }));
}

// ── current space info (for the profile code display) ─────────────────────
export async function getSpaceInfo(): Promise<{
  code: string;
  name: string | null;
} | null> {
  const { supabase, spaceId } = await requireSpace();
  const { data } = await supabase
    .from("spaces")
    .select("code, name")
    .eq("id", spaceId)
    .maybeSingle();
  return data ?? null;
}

// ── one laji: header info + photos + ranked results ───────────────────────
export interface LajiDetail extends Laji {
  results: LajiResultRow[];
}

export async function getLajiDetail(id: string): Promise<LajiDetail | null> {
  const { supabase } = await requireSpace();

  const { data: laji } = await supabase
    .from("lajit")
    .select("id, ordinal, name")
    .eq("id", id)
    .maybeSingle();
  if (!laji) return null;

  const { data: photoRows } = await supabase
    .from("laji_photos")
    .select("id, storage_path, sort_order")
    .eq("laji_id", id)
    .order("sort_order");

  const { data: resultRows } = await supabase.rpc("get_laji_results", {
    p_laji_id: id,
  });
  const results = (resultRows ?? []) as Omit<LajiResultRow, "photo_url">[];

  // Sign laji photos AND player photos together in one call.
  const paths = [
    ...(photoRows ?? []).map((p) => p.storage_path),
    ...results.map((r) => r.photo_path),
  ];
  const urls = await signPaths(supabase, paths);

  const photos: LajiPhoto[] = (photoRows ?? []).map((p) => ({
    id: p.id,
    storage_path: p.storage_path,
    sort_order: p.sort_order,
    url: urls.get(p.storage_path) ?? null,
  }));

  return {
    id: laji.id,
    ordinal: laji.ordinal,
    name: laji.name,
    photos,
    results: results.map((r) => ({
      ...r,
      photo_url: r.photo_path ? urls.get(r.photo_path) ?? null : null,
    })),
  };
}

// ── one player: profile + their points per laji ───────────────────────────
export interface PlayerScore {
  laji_id: string;
  ordinal: number;
  name: string;
  points: number;
}

export interface PlayerDetail {
  id: string;
  name: string;
  photo_path: string | null;
  photo_url: string | null;
  scores: PlayerScore[];
  total: number;
}

export async function getPlayerDetail(
  id: string,
): Promise<PlayerDetail | null> {
  const { supabase } = await requireSpace();

  const { data: player } = await supabase
    .from("players")
    .select("id, name, photo_path")
    .eq("id", id)
    .maybeSingle();
  if (!player) return null;

  const { data: scoreRows } = await supabase
    .from("scores")
    .select("points, lajit(id, ordinal, name)")
    .eq("player_id", id);

  const scores: PlayerScore[] = (scoreRows ?? [])
    .map((row: any) => ({
      laji_id: row.lajit?.id,
      ordinal: row.lajit?.ordinal ?? 0,
      name: row.lajit?.name ?? "",
      points: row.points,
    }))
    .filter((s) => s.laji_id)
    .sort((a, b) => a.ordinal - b.ordinal);

  const total = scores.reduce((sum, s) => sum + s.points, 0);
  const photo_url = player.photo_path
    ? (await signPaths(supabase, [player.photo_path])).get(player.photo_path) ??
      null
    : null;

  return {
    id: player.id,
    name: player.name,
    photo_path: player.photo_path,
    photo_url,
    scores,
    total,
  };
}