from fastapi import APIRouter, Query
from app.database import db
from app.models import Hadith, Narrator

router = APIRouter()


@router.get("/hadiths", response_model=list[Hadith])
async def search_hadiths(
    q: str = Query(..., min_length=2, description="Search query for hadith text"),
    limit: int = Query(20, ge=1, le=50),
):
    """Search hadiths by matn (text content)."""
    query = """
        MATCH (h:Hadith)
        WHERE h.matn CONTAINS $q OR h.full_text CONTAINS $q
        OPTIONAL MATCH (h)-[:HAS_CHAIN]->(first:Person)
        RETURN h.number as number,
               h.matn as matn,
               first.name as first_narrator
        ORDER BY h.number
        LIMIT $limit
    """
    results = await db.execute_read(query, q=q, limit=limit)
    return [Hadith(**r, chain_length=None) for r in results]


@router.get("/narrators", response_model=list[Narrator])
async def search_narrators(
    q: str = Query(..., min_length=2, description="Search query for narrator name"),
    limit: int = Query(20, ge=1, le=50),
):
    """Search narrators by name."""
    query = """
        MATCH (n:Person)
        WHERE n.name CONTAINS $q
        OPTIONAL MATCH (n)-[r1:NARRATED_FROM]->()
        WITH n, COUNT(DISTINCT r1) as out_count
        OPTIONAL MATCH ()-[r2:NARRATED_FROM]->(n)
        WITH n, out_count, COUNT(DISTINCT r2) as in_count
        WITH n, out_count + in_count as total
        RETURN n.id as id,
               n.name as name,
               n.rank as rank,
               n.fame as fame,
               total as hadith_count
        ORDER BY total DESC
        LIMIT $limit
    """
    results = await db.execute_read(query, q=q, limit=limit)
    return [Narrator(**r) for r in results]


@router.get("")
async def search_all(
    q: str = Query(..., min_length=2, description="Search query"),
    limit: int = Query(10, ge=1, le=20),
):
    """Search both hadiths and narrators."""
    # Search narrators
    narrators_query = """
        MATCH (n:Person)
        WHERE n.name CONTAINS $q
        OPTIONAL MATCH (n)-[r1:NARRATED_FROM]->()
        WITH n, COUNT(DISTINCT r1) as out_count
        OPTIONAL MATCH ()-[r2:NARRATED_FROM]->(n)
        WITH n, out_count, COUNT(DISTINCT r2) as in_count
        RETURN n.id as id,
               n.name as name,
               n.rank as rank,
               out_count + in_count as hadith_count
        ORDER BY hadith_count DESC
        LIMIT $limit
    """
    narrators = await db.execute_read(narrators_query, q=q, limit=limit)

    # Search hadiths
    hadiths_query = """
        MATCH (h:Hadith)
        WHERE h.matn CONTAINS $q
        RETURN h.number as number,
               h.matn as matn
        ORDER BY h.number
        LIMIT $limit
    """
    hadiths = await db.execute_read(hadiths_query, q=q, limit=limit)

    return {
        "narrators": [Narrator(**n, fame=None) for n in narrators],
        "hadiths": [
            Hadith(**h, chain_length=None, first_narrator=None) for h in hadiths
        ],
    }
