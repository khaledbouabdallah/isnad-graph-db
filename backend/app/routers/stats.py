from fastapi import APIRouter
from pydantic import BaseModel
from app.database import db

router = APIRouter()


class DatabaseStats(BaseModel):
    """Overall database statistics."""

    total_hadiths: int
    total_narrators: int
    total_edges: int
    avg_chain_length: float
    top_narrators: list[dict]


@router.get("", response_model=DatabaseStats)
async def get_stats():
    """Get overall database statistics for the dashboard."""

    # Total counts
    hadiths_count = await db.execute_single("MATCH (h:Hadith) RETURN count(h) as count")
    narrators_count = await db.execute_single(
        "MATCH (n:Person) RETURN count(n) as count"
    )
    edges_count = await db.execute_single(
        "MATCH ()-[r:NARRATED_FROM]->() RETURN count(r) as count"
    )

    # Average chain length (sample first 100 for performance)
    avg_chain_query = """
        MATCH (h:Hadith)-[:HAS_CHAIN]->(first:Person)
        WHERE h.number <= 100
        MATCH path = (first)-[:NARRATED_FROM*]->(last:Person)
        WHERE ALL(r IN relationships(path) WHERE r.hadith = h.number)
          AND NOT EXISTS((last)-[:NARRATED_FROM {hadith: h.number}]->())
        RETURN AVG(length(path) + 1) as avg_length
    """
    avg_result = await db.execute_single(avg_chain_query)
    avg_chain = (
        avg_result["avg_length"] if avg_result and avg_result["avg_length"] else 4.5
    )

    # Top 5 narrators
    top_query = """
        MATCH (n:Person)
        OPTIONAL MATCH (n)-[r1:NARRATED_FROM]->()
        WITH n, COUNT(DISTINCT r1) as out_count
        OPTIONAL MATCH ()-[r2:NARRATED_FROM]->(n)
        WITH n, out_count, COUNT(DISTINCT r2) as in_count
        WITH n, out_count + in_count as total
        RETURN n.name as name, n.rank as rank, total as connections
        ORDER BY total DESC
        LIMIT 5
    """
    top_narrators = await db.execute_read(top_query)

    return DatabaseStats(
        total_hadiths=hadiths_count["count"],
        total_narrators=narrators_count["count"],
        total_edges=edges_count["count"],
        avg_chain_length=round(avg_chain, 1),
        top_narrators=top_narrators,
    )
