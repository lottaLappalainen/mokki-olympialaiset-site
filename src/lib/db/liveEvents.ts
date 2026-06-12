"use server";

import { revalidatePath } from "next/cache";
import { requireSpace } from "@/lib/auth/require";
import { uploadImage, signPaths } from "@/lib/storage/images";

// ── Types ────────────────────────────────────────────────────────────────────
export type AnswerType = "text" | "number" | "photo";

export interface LiveQuestion {
  id: string;
  prompt: string;
  answer_type: AnswerType;
  required: boolean;
  anonymous: boolean;
  photo_count: number | null; // exactly-N for photo questions; null otherwise
  sort_order: number;
}

export interface LiveEvent {
  id: string;
  name: string;
  is_live: boolean;
  revealed: boolean;
  has_voting: boolean;
  results_revealed: boolean;
  questions: LiveQuestion[];
}

// A question as typed in the builder, before it has a DB id.
export interface QuestionDraft {
  prompt: string;
  answer_type: AnswerType;
  required: boolean;
  anonymous: boolean;
  photo_count?: number; // only meaningful when answer_type === "photo"
}

// ── Reads: events ─────────────────────────────────────────────────────────────

// The single currently-live event for this space (or null). Home-page banner.
export async function getLiveEvent(): Promise<LiveEvent | null> {
  const { supabase, spaceId } = await requireSpace();
  const { data: ev } = await supabase
    .from("live_events")
    .select("id, name, is_live, revealed, has_voting, results_revealed")
    .eq("space_id", spaceId)
    .eq("is_live", true)
    .maybeSingle();
  if (!ev) return null;
  return { ...ev, questions: await loadQuestions(ev.id, spaceId) };
}

// One live event by id (live or ended) with its questions — detail view.
export async function getLiveEventDetail(id: string): Promise<LiveEvent | null> {
  const { supabase, spaceId } = await requireSpace();
  const { data: ev } = await supabase
    .from("live_events")
    .select("id, name, is_live, revealed, has_voting, results_revealed")
    .eq("id", id)
    .eq("space_id", spaceId)
    .maybeSingle();
  if (!ev) return null;
  return { ...ev, questions: await loadQuestions(ev.id, spaceId) };
}

// Ended live events (is_live = false) — dark cards on the events list.
export async function listEndedLiveEvents(): Promise<LiveEvent[]> {
  const { supabase, spaceId } = await requireSpace();
  const { data } = await supabase
    .from("live_events")
    .select("id, name, is_live, revealed, has_voting, results_revealed")
    .eq("space_id", spaceId)
    .eq("is_live", false)
    .order("created_at", { ascending: false });
  return (data ?? []).map((e) => ({ ...e, questions: [] }));
}

// Internal: load a live event's questions in order.
async function loadQuestions(
  liveEventId: string,
  spaceId: string,
): Promise<LiveQuestion[]> {
  const { supabase } = await requireSpace();
  const { data } = await supabase
    .from("live_questions")
    .select("id, prompt, answer_type, required, anonymous, photo_count, sort_order")
    .eq("live_event_id", liveEventId)
    .eq("space_id", spaceId)
    .order("sort_order");
  return data ?? [];
}

// ── Writes: events + questions ────────────────────────────────────────────────

// Create a live event. AUTO-ENDS any currently-live event first.
export async function createLiveEvent(
  name: string,
  questions: QuestionDraft[],
  hasVoting: boolean,
): Promise<{ id: string }> {
  const { supabase, spaceId } = await requireSpace();
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Anna tapahtumalle nimi.");

  await supabase
    .from("live_events")
    .update({ is_live: false, ended_at: new Date().toISOString() })
    .eq("space_id", spaceId)
    .eq("is_live", true);

  const { data: ev, error } = await supabase
    .from("live_events")
    .insert({
      space_id: spaceId,
      name: trimmed,
      is_live: true,
      has_voting: hasVoting,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  const rows = questions
    .filter((q) => q.prompt.trim())
    .map((q, i) => ({
      space_id: spaceId,
      live_event_id: ev.id,
      prompt: q.prompt.trim(),
      answer_type: q.answer_type,
      required: q.required,
      anonymous: q.anonymous,
      photo_count: q.answer_type === "photo" ? q.photo_count ?? 1 : null,
      sort_order: i + 1,
    }));
  if (rows.length) {
    const { error: qErr } = await supabase.from("live_questions").insert(rows);
    if (qErr) throw new Error(qErr.message);
  }

  revalidatePath("/o");
  return { id: ev.id };
}

// Toggle live/ended (settings switch).
export async function setLiveEventLive(
  id: string,
  isLive: boolean,
): Promise<void> {
  const { supabase, spaceId } = await requireSpace();
  if (isLive) {
    await supabase
      .from("live_events")
      .update({ is_live: false, ended_at: new Date().toISOString() })
      .eq("space_id", spaceId)
      .eq("is_live", true)
      .neq("id", id);
  }
  const { error } = await supabase
    .from("live_events")
    .update({
      is_live: isLive,
      ended_at: isLive ? null : new Date().toISOString(),
    })
    .eq("id", id)
    .eq("space_id", spaceId);
  if (error) throw new Error(error.message);
  revalidatePath("/o");
}

// Toggle answering ↔ revealed (answers).
export async function setLiveEventRevealed(
  id: string,
  revealed: boolean,
): Promise<void> {
  const { supabase, spaceId } = await requireSpace();
  const { error } = await supabase
    .from("live_events")
    .update({ revealed })
    .eq("id", id)
    .eq("space_id", spaceId);
  if (error) throw new Error(error.message);
  revalidatePath("/o");
}

// Toggle results hidden ↔ revealed (second gate, voting events).
export async function setLiveEventResultsRevealed(
  id: string,
  resultsRevealed: boolean,
): Promise<void> {
  const { supabase, spaceId } = await requireSpace();
  const { error } = await supabase
    .from("live_events")
    .update({ results_revealed: resultsRevealed })
    .eq("id", id)
    .eq("space_id", spaceId);
  if (error) throw new Error(error.message);
  revalidatePath("/o");
}

// Replace ALL questions (delete + insert) — settings editor.
export async function replaceLiveQuestions(
  liveEventId: string,
  questions: QuestionDraft[],
): Promise<void> {
  const { supabase, spaceId } = await requireSpace();
  await supabase
    .from("live_questions")
    .delete()
    .eq("live_event_id", liveEventId)
    .eq("space_id", spaceId);

  const rows = questions
    .filter((q) => q.prompt.trim())
    .map((q, i) => ({
      space_id: spaceId,
      live_event_id: liveEventId,
      prompt: q.prompt.trim(),
      answer_type: q.answer_type,
      required: q.required,
      anonymous: q.anonymous,
      photo_count: q.answer_type === "photo" ? q.photo_count ?? 1 : null,
      sort_order: i + 1,
    }));
  if (rows.length) {
    const { error } = await supabase.from("live_questions").insert(rows);
    if (error) throw new Error(error.message);
  }
  revalidatePath("/o");
}

export async function deleteLiveEvent(id: string): Promise<void> {
  const { supabase, spaceId } = await requireSpace();
  const { error } = await supabase
    .from("live_events")
    .delete()
    .eq("id", id)
    .eq("space_id", spaceId);
  if (error) throw new Error(error.message);
  revalidatePath("/o");
}

// ── Answering ────────────────────────────────────────────────────────────────

// player_ids who have answered EVERY question = "done".
export async function getAnsweredPlayerIds(
  liveEventId: string,
): Promise<string[]> {
  const { supabase, spaceId } = await requireSpace();
  const { count: questionCount } = await supabase
    .from("live_questions")
    .select("id", { count: "exact", head: true })
    .eq("live_event_id", liveEventId)
    .eq("space_id", spaceId);
  if (!questionCount) return [];

  const { data } = await supabase
    .from("live_answers")
    .select("player_id")
    .eq("live_event_id", liveEventId)
    .eq("space_id", spaceId);

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    counts.set(row.player_id, (counts.get(row.player_id) ?? 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, n]) => n >= questionCount)
    .map(([id]) => id);
}

// Submit a player's whole form = final, locking save.
// Photo questions may carry MULTIPLE files (q_{id} repeated) → answer_paths[].
export async function submitLiveAnswers(
  liveEventId: string,
  playerId: string,
  formData: FormData,
): Promise<{ error?: string } | void> {
  const { supabase, spaceId } = await requireSpace();

  const { count: existing } = await supabase
    .from("live_answers")
    .select("id", { count: "exact", head: true })
    .eq("live_event_id", liveEventId)
    .eq("player_id", playerId)
    .eq("space_id", spaceId);
  if (existing && existing > 0) return { error: "Olet jo vastannut." };

  const { data: questions } = await supabase
    .from("live_questions")
    .select("id, answer_type")
    .eq("live_event_id", liveEventId)
    .eq("space_id", spaceId);

  const rows: any[] = [];
  for (const q of questions ?? []) {
    if (q.answer_type === "photo") {
      // collect ALL files submitted for this question
      const files = formData
        .getAll(`q_${q.id}`)
        .filter((f): f is File => f instanceof File && f.size > 0);
      const paths: string[] = [];
      for (const file of files) {
        paths.push(await uploadImage(supabase, spaceId, "live", file));
      }
      rows.push({
        space_id: spaceId,
        live_event_id: liveEventId,
        question_id: q.id,
        player_id: playerId,
        answer_text: null,
        answer_path: paths[0] ?? null, // keep first in old column for safety
        answer_paths: paths.length ? paths : null,
      });
    } else {
      const value = String(formData.get(`q_${q.id}`) ?? "").trim();
      rows.push({
        space_id: spaceId,
        live_event_id: liveEventId,
        question_id: q.id,
        player_id: playerId,
        answer_text: value || null,
        answer_path: null,
        answer_paths: null,
      });
    }
  }

  const { error } = await supabase.from("live_answers").insert(rows);
  if (error) return { error: "Tallennus epäonnistui." };
  revalidatePath("/o");
}

// ── Reveal data: answers grouped by question (with signed photo URLs) ─────────
export interface RevealAnswer {
  answer_id: string;
  player_id: string;
  player_name: string;
  player_photo_url: string | null; // ← add this
  text: string | null;
  photo_url: string | null;
  photo_urls: string[];
}
export interface RevealQuestion {
  id: string;
  prompt: string;
  answer_type: AnswerType;
  anonymous: boolean;
  answers: RevealAnswer[];
}

export async function getLiveReveal(
  liveEventId: string,
): Promise<RevealQuestion[]> {
  const { supabase, spaceId } = await requireSpace();

  const { data: questions } = await supabase
    .from("live_questions")
    .select("id, prompt, answer_type, anonymous, sort_order")
    .eq("live_event_id", liveEventId)
    .eq("space_id", spaceId)
    .order("sort_order");

  const { data: answers } = await supabase
    .from("live_answers")
    .select(
      "id, question_id, player_id, answer_text, answer_path, answer_paths, players(name, photo_path)",
    )
    .eq("live_event_id", liveEventId)
    .eq("space_id", spaceId);

  // Gather every photo path across all answers to sign in one round-trip.
  const allPaths: string[] = [];
  for (const a of (answers ?? []) as any[]) {
    if (a.answer_paths?.length) allPaths.push(...a.answer_paths);
    else if (a.answer_path) allPaths.push(a.answer_path);
  }
  const urls = await signPaths(supabase, allPaths);

  return (questions ?? []).map((q) => ({
    id: q.id,
    prompt: q.prompt,
    answer_type: q.answer_type,
    anonymous: q.anonymous,
    answers: (answers ?? [])
      .filter((a: any) => a.question_id === q.id)
      .map((a: any) => {
        // resolve all photo paths for this answer to signed URLs
        const paths: string[] = a.answer_paths?.length
          ? a.answer_paths
          : a.answer_path
            ? [a.answer_path]
            : [];
        const photo_urls = paths
          .map((p) => urls.get(p) ?? null)
          .filter((u): u is string => !!u);
        return {
          answer_id: a.id,
          player_id: a.player_id,
          player_name: a.players?.name ?? "",
          player_photo_url: a.players?.photo_path ? urls.get(a.players.photo_path) ?? null : null,
          text: a.answer_text,
          photo_url: photo_urls[0] ?? null,
          photo_urls,
        };
      }),
  }));
}

// ── Vote options ──────────────────────────────────────────────────────────────

export async function createVoteOptions(
  liveEventId: string,
  values: number[],
): Promise<void> {
  const { supabase, spaceId } = await requireSpace();
  const rows = values
    .filter((v) => Number.isFinite(v))
    .map((v, i) => ({
      space_id: spaceId,
      live_event_id: liveEventId,
      value: Math.trunc(v),
      sort_order: i,
    }));
  if (!rows.length) return;
  const { error } = await supabase.from("live_vote_options").insert(rows);
  if (error) throw new Error(error.message);
}

export async function listVoteOptions(
  liveEventId: string,
): Promise<{ id: string; value: number }[]> {
  const { supabase, spaceId } = await requireSpace();
  const { data } = await supabase
    .from("live_vote_options")
    .select("id, value")
    .eq("live_event_id", liveEventId)
    .eq("space_id", spaceId)
    .order("sort_order");
  return data ?? [];
}

// ── Voting ────────────────────────────────────────────────────────────────────

export async function getVotedPlayerIds(
  liveEventId: string,
): Promise<string[]> {
  const { supabase, spaceId } = await requireSpace();
  const { data } = await supabase
    .from("live_votes")
    .select("voter_id")
    .eq("live_event_id", liveEventId)
    .eq("space_id", spaceId);
  return [...new Set((data ?? []).map((r) => r.voter_id))];
}

export async function submitVotes(
  liveEventId: string,
  voterId: string,
  ballot: Record<string, number>,
): Promise<void> {
  const { supabase, spaceId } = await requireSpace();

  await supabase
    .from("live_votes")
    .delete()
    .eq("live_event_id", liveEventId)
    .eq("voter_id", voterId)
    .eq("space_id", spaceId);

  const rows = Object.entries(ballot)
    .filter(([, v]) => Number.isFinite(v))
    .map(([answer_id, value]) => ({
      space_id: spaceId,
      live_event_id: liveEventId,
      voter_id: voterId,
      answer_id,
      value: Math.trunc(value),
    }));
  if (rows.length) {
    const { error } = await supabase.from("live_votes").insert(rows);
    if (error) throw new Error(error.message);
  }
  revalidatePath("/o");
}

// ── Results: players ranked by total points their answers received ────────────
export interface VoteResult {
  player_id: string;
  player_name: string;
  photo_url: string | null;
  total: number;
}

export async function getVoteResults(
  liveEventId: string,
): Promise<VoteResult[]> {
  const { supabase, spaceId } = await requireSpace();

  const { data: answers } = await supabase
    .from("live_answers")
    .select("id, player_id, players(name, photo_path)")
    .eq("live_event_id", liveEventId)
    .eq("space_id", spaceId);

  const { data: votes } = await supabase
    .from("live_votes")
    .select("answer_id, value")
    .eq("live_event_id", liveEventId)
    .eq("space_id", spaceId);

  const pointsByAnswer = new Map<string, number>();
  for (const v of votes ?? []) {
    pointsByAnswer.set(
      v.answer_id,
      (pointsByAnswer.get(v.answer_id) ?? 0) + v.value,
    );
  }

  const byPlayer = new Map<string, { name: string; photo_path: string | null; total: number }>();
  for (const a of (answers ?? []) as any[]) {
    const prev = byPlayer.get(a.player_id) ?? {
      name: a.players?.name ?? "",
      photo_path: a.players?.photo_path ?? null,
      total: 0,
    };
    prev.total += pointsByAnswer.get(a.id) ?? 0;
    byPlayer.set(a.player_id, prev);
  }

  const urls = await signPaths(
    supabase,
    [...byPlayer.values()].map((p) => p.photo_path),
  );

  return [...byPlayer.entries()]
    .map(([player_id, p]) => ({
      player_id,
      player_name: p.name,
      photo_url: p.photo_path ? urls.get(p.photo_path) ?? null : null,
      total: p.total,
    }))
    .sort((a, b) => b.total - a.total);
}