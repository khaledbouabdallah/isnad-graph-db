from fastapi import APIRouter, HTTPException, Query
from app.database import db
from app.models import Hadith, HadithDetail, ChainNarrator

router = APIRouter()


@router.get("", response_model=list[Hadith])
async def list_hadiths(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
):
    """List hadiths with pagination."""
    # Simplified query without chain length calculation for performance
    query = """
        MATCH (h:Hadith)
        OPTIONAL MATCH (h)-[:HAS_CHAIN]->(first:Person)
        RETURN h.number as number,
               h.matn as matn,
               first.name as first_narrator
        ORDER BY h.number
        SKIP $skip LIMIT $limit
    """
    results = await db.execute_read(query, skip=skip, limit=limit)
    return [Hadith(**r, chain_length=None) for r in results]


@router.get("/{hadith_number}", response_model=HadithDetail)
async def get_hadith(hadith_number: int):
    """Get full hadith details with chain."""
    # Get hadith info
    hadith_query = """
        MATCH (h:Hadith {number: $num})
        RETURN h.number as number,
               h.matn as matn,
               h.full_text as full_text,
               h.url as url
    """
    hadith = await db.execute_single(hadith_query, num=hadith_number)

    if not hadith:
        raise HTTPException(status_code=404, detail=f"Hadith {hadith_number} not found")

    # Get the chain
    chain_query = """
        MATCH (h:Hadith {number: $num})-[:HAS_CHAIN]->(first:Person)
        MATCH path = (first)-[:NARRATED_FROM*0..]->(n:Person)
        WHERE ALL(r IN relationships(path) WHERE r.hadith = $num)
        WITH n, length(path) as position
        ORDER BY position
        RETURN DISTINCT n.id as id,
               n.name as name,
               n.rank as rank,
               n.fame as fame,
               position
    """
    chain_results = await db.execute_read(chain_query, num=hadith_number)

    chain = [ChainNarrator(**r) for r in chain_results]

    return HadithDetail(
        number=hadith["number"],
        matn=hadith["matn"],
        full_text=hadith["full_text"],
        url=hadith["url"],
        chain=chain,
    )


@router.get("/{hadith_number}/chain")
async def get_hadith_chain(hadith_number: int):
    """Get just the chain for a hadith (lighter endpoint)."""
    chain_query = """
        MATCH (h:Hadith {number: $num})-[:HAS_CHAIN]->(first:Person)
        MATCH path = (first)-[:NARRATED_FROM*0..]->(n:Person)
        WHERE ALL(r IN relationships(path) WHERE r.hadith = $num)
        WITH n, length(path) as position
        ORDER BY position
        RETURN DISTINCT n.id as id,
               n.name as name,
               n.rank as rank,
               position
    """
    results = await db.execute_read(chain_query, num=hadith_number)

    if not results:
        raise HTTPException(status_code=404, detail=f"Hadith {hadith_number} not found")

    return [ChainNarrator(**r, fame=None) for r in results]
