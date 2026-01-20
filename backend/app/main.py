from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.database import db
from app.routers import hadiths, narrators, graph, search, stats


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle - connect/disconnect from Neo4j."""
    # Startup
    await db.connect()
    yield
    # Shutdown
    await db.disconnect()


settings = get_settings()

app = FastAPI(
    title=settings.api_title,
    version=settings.api_version,
    description=settings.api_description,
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(hadiths.router, prefix="/api/hadiths", tags=["Hadiths"])
app.include_router(narrators.router, prefix="/api/narrators", tags=["Narrators"])
app.include_router(graph.router, prefix="/api/graph", tags=["Graph"])
app.include_router(search.router, prefix="/api/search", tags=["Search"])
app.include_router(stats.router, prefix="/api/stats", tags=["Stats"])


@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "isnad-explorer-api"}
