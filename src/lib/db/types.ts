// Shared shapes returned by the database actions.
// `*_url` fields are signed Storage URLs attached at read time (not columns).

import { AnswerType } from "./liveEvents";

export interface Player {
  id: string;
  name: string;
  photo_path: string | null;
  photo_url: string | null;
}

export interface eventPhoto {
  id: string;
  storage_path: string;
  sort_order: number;
  url: string | null;
}

export interface event {
  id: string;
  ordinal: number;
  name: string;
  photos: eventPhoto[];
}

export interface LeaderboardRow {
  player_id: string;
  name: string;
  photo_path: string | null;
  photo_url: string | null;
  total_points: number;
}

export interface eventResultRow {
  player_id: string;
  name: string;
  photo_path: string | null;
  photo_url: string | null;
  points: number | null;     // null = no score entered yet
  placement: number | null;  // null = unscored
}

// types — add photo_count to both question shapes, has_voting to the event:
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
  questions: LiveQuestion[];
}

export interface QuestionDraft {
  prompt: string;
  answer_type: AnswerType;
  required: boolean;
  anonymous: boolean;
  photo_count?: number; // only meaningful when answer_type === "photo"
}