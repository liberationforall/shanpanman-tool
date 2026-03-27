from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers.strikes import router as strikes_router

app = FastAPI(
    title="MahsaAlert Intelligence Dashboard API",
    description="Backend for the live incident reporting and intelligence platform.",
    version="0.1.0",
)

# Allow the Next.js dev server and production domain
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "https://mahsaalert.com",
        "https://liberationforall.github.io/shanpanman-tool"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Also mount under /api for Vercel path mapping
app.include_router(strikes_router, prefix="/api")
app.include_router(strikes_router)


@app.get("/api")
@app.get("/api/")
@app.get("/")
def read_root():
    return {
        "message": "Welcome to MahsaAlert Intelligence Dashboard API",
        "docs": "/api/docs",
        "endpoints": ["/api/health", "/api/strikes"]
    }


@app.get("/api/health")
@app.get("/health")
def health():
    return {"status": "ok"}
