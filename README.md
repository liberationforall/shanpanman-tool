# MahsaAlert Intelligence Dashboard

Live incident reporting and strike intelligence platform.

---

## Project Structure

```
mahsa-dashboard/
├── backend/
│   ├── main.py                  # FastAPI app entry point
│   ├── requirements.txt
│   ├── routers/
│   │   └── strikes.py           # /api/strikes, /api/strikes/stats, /api/strikes/timeline
│   ├── utils/
│   │   └── parser.py            # GeoJSON loader, date converter, aggregations
│   └── data/
│       └── newTarget.geojson    # Static mock data (replace with live GeoJSON)
│
└── frontend/
    ├── app/
    │   ├── layout.tsx
    │   ├── page.tsx             # Tab shell (Home / Strike Analysis / OSINT)
    │   └── globals.css          # Fonts + Tailwind
    ├── components/
    │   ├── charts/
    │   │   └── StrikeTimeline.tsx    # Recharts line chart, clickable day points
    │   ├── tabs/
    │   │   ├── HomeTab.tsx           # Home tab — stat cards + chart + card list
    │   │   ├── StrikeAnalysisTab.tsx # Placeholder (v0.2)
    │   │   └── OsintTab.tsx          # Placeholder (v0.3)
    │   └── ui/
    │       ├── StatCard.tsx          # Key figure cards (confirmed/pending/today)
    │       ├── StrikeCard.tsx        # Individual strike card with tweet embed
    │       ├── StrikeCardList.tsx    # Horizontally scrollable card row
    │       └── TweetEmbed.tsx        # Twitter/X blockquote embed
    ├── hooks/
    │   └── useStrikes.ts        # Fetches all three endpoints, manages selectedDate
    ├── lib/
    │   ├── api.ts               # Typed API client + TypeScript interfaces
    │   └── utils.ts             # cn(), formatDate(), extractTwitterUsername()
    ├── next.config.js           # Proxies /api/* → localhost:8000
    ├── tailwind.config.js
    └── tsconfig.json
```

---

## Setup

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

API available at `http://localhost:8000`

**Endpoints:**
- `GET /api/strikes` — all strikes (optional: `?confirmed_only=true`, `?date=2026-03-11`)
- `GET /api/strikes/stats` — key figure totals
- `GET /api/strikes/timeline` — strikes grouped by day for the chart
- `GET /health`

---

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Dashboard available at `http://localhost:3000`

The Next.js dev server proxies all `/api/*` requests to the FastAPI backend on port 8000.

---

## Replacing Static Data

When the GitHub repository pipeline is ready:

1. Replace `backend/data/newTarget.geojson` with the live fetched file (or point `DATA_PATH` in `utils/parser.py` to the downloaded path).
2. The parser handles the full `info` JSON column, Unix timestamp ranges, and optional fields — no schema changes needed for the current GeoJSON format.

---

## Data Format Notes

**Date field** (`date` in `info`): Unix timestamp range, e.g. `1772259045-1772382645`. The parser takes the end timestamp as the recorded date.

**Confirmation**: `accurate == "yes"` in the `info` dict = confirmed strike.

**Tweet embed**: `geolocates` URL is parsed for a tweet ID and rendered as a `blockquote.twitter-tweet` via `widgets.js`.

---

## Next Releases

| Version | Feature |
|---------|---------|
| v0.2 | Strike Analysis tab — density maps, category breakdowns, AI severity |
| v0.3 | OSINT portal — contribution form, tiered trust, cross-reference engine |
| v0.4 | GitHub data pipeline — daily GeoJSON fetch from repo |
