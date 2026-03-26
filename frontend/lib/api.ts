// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Strike {
  id: string;
  name_fa: string;
  date_str: string | null;
  strike_date: string | null; // ISO date YYYY-MM-DD
  accurate: boolean;
  status: string;
  geolocates: string | null;
  tweet_url: string | null;
  tweet_id: string | null;
  longitude: number | null;
  latitude: number | null;
  district: string | false;
  in_tehran: boolean;
  source_id: number | null;
  created_at: string | null;
}

export interface StrikeStats {
  total_confirmed: number;
  confirmed_today: number;
  pending_confirmation: number;
}

export interface TimelinePoint {
  date: string;
  confirmed: number;
  pending: number;
}

export interface StrikesResponse {
  data: Strike[];
  count: number;
}

export interface TimelineResponse {
  data: TimelinePoint[];
}

// ---------------------------------------------------------------------------
// API client
// ---------------------------------------------------------------------------

const BASE = "/api";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    next: { revalidate: 60 }, // ISR: revalidate every 60 s in production
  });
  if (!res.ok) {
    throw new Error(`API error ${res.status} on ${path}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  strikes: {
    list: (params?: { confirmed_only?: boolean; date?: string; tehran_only?: boolean }) => {
      const qs = new URLSearchParams();
      if (params?.confirmed_only !== undefined)
        qs.set("confirmed_only", String(params.confirmed_only));
      if (params?.date) qs.set("date", params.date);
      if (params?.tehran_only !== undefined)
        qs.set("tehran_only", String(params.tehran_only));
      const query = qs.toString();
      return get<StrikesResponse>(`/strikes${query ? `?${query}` : ""}`);
    },
    stats: (params?: { tehran_only?: boolean }) => {
      const qs = new URLSearchParams();
      if (params?.tehran_only !== undefined)
        qs.set("tehran_only", String(params.tehran_only));
      const query = qs.toString();
      return get<StrikeStats>(`/strikes/stats${query ? `?${query}` : ""}`);
    },
    timeline: (params?: { tehran_only?: boolean }) => {
      const qs = new URLSearchParams();
      if (params?.tehran_only !== undefined)
        qs.set("tehran_only", String(params.tehran_only));
      const query = qs.toString();
      return get<TimelineResponse>(`/strikes/timeline${query ? `?${query}` : ""}`);
    },
  },
};
