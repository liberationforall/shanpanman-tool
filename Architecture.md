# MahsaAlert Intelligence Dashboard Architecture

This document illustrates how data flows between the backend and frontend in the MahsaAlert Dashboard application.

## High-Level Architecture

The Dashboard is built using a decoupled client-server model:
1. **Backend (FastAPI)**: Serves a RESTful API, parses static geo-data (GeoJSON), and handles data filtering and aggregations.
2. **Frontend (Next.js)**: A React application running on Next.js, serving the UI and handling client-side state, making proxy requests to the backend.

### Full System Data Flow Diagram

```mermaid
flowchart TD
    %% Define Styles
    classDef frontend fill:#3b82f6,stroke:#1e3a8a,stroke-width:2px,color:#fff
    classDef backend fill:#10b981,stroke:#065f46,stroke-width:2px,color:#fff
    classDef data fill:#f59e0b,stroke:#b45309,stroke-width:2px,color:#fff
    classDef hook fill:#8b5cf6,stroke:#4c1d95,stroke-width:2px,color:#fff

    subgraph DataLayer ["Data Layer"]
        GeoJSON[("backend/data/newTarget.geojson<br>(Raw incident data)")]:::data
    end

    subgraph Backend ["Backend - FastAPI (Port 8000)"]
        Parser["backend/utils/parser.py<br>(Loads & Normalizes GeoJSON,<br>Computes Aggrs)"]:::backend
        Router["backend/routers/strikes.py<br>(REST Endpoints:<br> /api/strikes<br> /api/strikes/stats<br> /api/strikes/timeline)"]:::backend
        FastAPI_Main["backend/main.py<br>(App Entry & CORS Middleware)"]:::backend

        GeoJSON -->|"Read & parsed"| Parser
        Parser -->|"Formatted JSON payload"| Router
        Router -->|"Register routes"| FastAPI_Main
    end

    subgraph Frontend ["Frontend - Next.js (Port 3000)"]
        NextConfig["frontend/next.config.js<br>(Proxy API Rewrites:<br> /api/* -> :8000/api/*)"]:::frontend
        UseStrikesHook["frontend/hooks/useStrikes.ts<br>(State Management &<br>Data Fetching)"]:::hook
        DashboardPage["frontend/app/page.tsx<br>(Main Layout & Tabs)"]:::frontend
        HomeTab["frontend/components/tabs/HomeTab.tsx<br>(UI Components)"]:::frontend
        
        FastAPI_Main <-->|"HTTP GET requests"| NextConfig
        NextConfig <-->|"Proxy rewritten requests"| UseStrikesHook
        UseStrikesHook -->|"Provides data & state variables<br>(stats, timeline, filteredStrikes)"| HomeTab
        DashboardPage -->|"Renders"| HomeTab
    end
```

## Description of Architecture Flow

1. **Storage Layer**: 
   The data completely resides inside `backend/data/newTarget.geojson`. It stores a feature collection of all reported incidents and strikes in JSON format.

2. **Data Parsing & Backend Processing**:
   The `backend/utils/parser.py` loads the static GeoJSON file. It converts and maps its structure into easy-to-consume Python dictionaries, normalizes the dates, handles string booleans, and formats tweets parameters.
   It also handles logic for aggregating the stats representing dashboard summaries.

3. **Routing Configuration**:
   The logic created in the parser is bound to RESTFUL endpoints in `backend/routers/strikes.py` exposing:
   * `/api/strikes`
   * `/api/strikes/stats`
   * `/api/strikes/timeline`
   
   These controllers run from the FastAPI root instance configured in `backend/main.py`.

4. **Next.js Proxy Rewrite**:
   In `frontend/next.config.js`, API rewrites are configured under `rewrites()` so that Next.js automatically directs any client network calls prefixing `/api/:path*` through to `http://localhost:8000/api/:path*`. This natively handles most CORS and structural proxy needs.

5. **Client Fetching Hook**:
   Running inside Next.js, `hooks/useStrikes.ts` creates the central bridge on the client. It sends GET requests to `/api/strikes/*`, stores them in React states, tracks `isLoading` attributes, and yields structured variables back to standard functional React components.

6. **React UI Rendering**:
   Elements like `HomeTab.tsx` invoke `useStrikes()` implicitly pulling all backend variables. The Dashboard component (`app/page.tsx`) organizes and switches multiple tabs ensuring exactly what part of the application is updated and visible.
