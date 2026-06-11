// Shared shapes returned by the database actions.
// `*_url` fields are signed Storage URLs attached at read time (not columns).

export interface Player {
  id: string;
  name: string;
  photo_path: string | null;
  photo_url: string | null;
}

export interface LajiPhoto {
  id: string;
  storage_path: string;
  sort_order: number;
  url: string | null;
}

export interface Laji {
  id: string;
  ordinal: number;
  name: string;
  photos: LajiPhoto[];
}

export interface LeaderboardRow {
  player_id: string;
  name: string;
  photo_path: string | null;
  photo_url: string | null;
  total_points: number;
}

export interface LajiResultRow {
  player_id: string;
  name: string;
  photo_path: string | null;
  photo_url: string | null;
  points: number | null;     // null = no score entered yet
  placement: number | null;  // null = unscored
}