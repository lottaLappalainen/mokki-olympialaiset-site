"use server";

import { requireSpace } from "@/lib/auth/require";
import { signPaths } from "@/lib/storage/images";
import type {
  LeaderboardRow,
  eventResultRow,
  event,
  eventPhoto,
} from "./types";

// ── leaderboard: name, photo, total points (highest first) ────────────────
export async function getLeaderboard(): Promise<LeaderboardRow[]> {
  const { supabase, spaceId } = await requireSpace();
  const { data, error } = await supabase
    .from("leaderboard")
    .select("player_id, name, photo_path, total_points")
    .eq("space_id", spaceId) // OPTION 3: must scope — service role sees all spaces
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

// ── current space info (code + header name) ───────────────────────────────
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

// ── one event: header info + photos + ranked results ───────────────────────
export interface eventDetail extends event {
  results: eventResultRow[];
}

// Compute competition placements (ties share a rank, the next rank skips:
// 1, 2, 2, 4). Unscored players are appended with null points/placement.
function rankResults(
  players: { id: string; name: string; photo_path: string | null }[],
  pointsByPlayer: Map<string, number>,
): Omit<eventResultRow, "photo_url">[] {
  const scored = players
    .filter((p) => pointsByPlayer.has(p.id))
    .sort((a, b) => pointsByPlayer.get(b.id)! - pointsByPlayer.get(a.id)!);

  const placementById = new Map<string, number>();
  let lastPoints: number | null = null;
  let lastRank = 0;
  scored.forEach((p, index) => {
    const pts = pointsByPlayer.get(p.id)!;
    if (pts === lastPoints) {
      placementById.set(p.id, lastRank); // tie → same placement
    } else {
      lastRank = index + 1; // gap after ties
      lastPoints = pts;
      placementById.set(p.id, lastRank);
    }
  });

  const unscored = players
    .filter((p) => !pointsByPlayer.has(p.id))
    .sort((a, b) => a.name.localeCompare(b.name));

  return [
    ...scored.map((p) => ({
      player_id: p.id,
      name: p.name,
      photo_path: p.photo_path,
      points: pointsByPlayer.get(p.id)!,
      placement: placementById.get(p.id)!,
    })),
    ...unscored.map((p) => ({
      player_id: p.id,
      name: p.name,
      photo_path: p.photo_path,
      points: null,
      placement: null,
    })),
  ];
}

export async function getEventDetail(id: string): Promise<eventDetail | null> {
  const { supabase, spaceId } = await requireSpace();

  // 1. The event header — scoped, and now includes cover_photo_id.
  const { data: event } = await supabase
    .from("events")
    .select("id, ordinal, name, cover_photo_id")
    .eq("id", id)
    .eq("space_id", spaceId)
    .maybeSingle();
  if (!event) return null;

  // 2. This event's photos.
  const { data: photoRows } = await supabase
    .from("event_photos")
    .select("id, storage_path, sort_order")
    .eq("event_id", id)
    .eq("space_id", spaceId)
    .order("sort_order");

  // 3. All players in the space (so unscored ones still appear in results).
  const { data: playerRows } = await supabase
    .from("players")
    .select("id, name, photo_path")
    .eq("space_id", spaceId);

  // 4. The scores for THIS event only.
  const { data: scoreRows } = await supabase
    .from("scores")
    .select("player_id, points")
    .eq("event_id", id)
    .eq("space_id", spaceId);

  // 5. Build placements in TS.
  const pointsByPlayer = new Map<string, number>(
    (scoreRows ?? []).map((s) => [s.player_id, s.points]),
  );
  const ranked = rankResults(playerRows ?? [], pointsByPlayer);

  // 6. Sign event photos AND player photos together in one round-trip.
  const paths = [
    ...(photoRows ?? []).map((p) => p.storage_path),
    ...ranked.map((r) => r.photo_path),
  ];
  const urls = await signPaths(supabase, paths);

  const photos: eventPhoto[] = (photoRows ?? []).map((p) => ({
    id: p.id,
    storage_path: p.storage_path,
    sort_order: p.sort_order,
    url: urls.get(p.storage_path) ?? null,
  }));

  // cover = chosen cover photo, else the first photo (default).
  const cover =
    photos.find((p) => p.id === event.cover_photo_id) ?? photos[0] ?? null;

  return {
    id: event.id,
    ordinal: event.ordinal,
    name: event.name,
    photos,
    cover_photo_id: event.cover_photo_id ?? null,
    cover_url: cover?.url ?? null,
    results: ranked.map((r) => ({
      ...r,
      photo_url: r.photo_path ? urls.get(r.photo_path) ?? null : null,
    })),
  };
}

// ── one player: profile + their points per event ───────────────────────────
export interface PlayerScore {
  event_id: string;
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
  const { supabase, spaceId } = await requireSpace();

  const { data: player } = await supabase
    .from("players")
    .select("id, name, photo_path")
    .eq("id", id)
    .eq("space_id", spaceId)
    .maybeSingle();
  if (!player) return null;

  const { data: scoreRows } = await supabase
    .from("scores")
    .select("points, events(id, ordinal, name)")
    .eq("player_id", id)
    .eq("space_id", spaceId);

  const scores: PlayerScore[] = (scoreRows ?? [])
    .map((row: any) => ({
      event_id: row.events?.id,
      ordinal: row.events?.ordinal ?? 0,
      name: row.events?.name ?? "",
      points: row.points,
    }))
    .filter((s) => s.event_id)
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