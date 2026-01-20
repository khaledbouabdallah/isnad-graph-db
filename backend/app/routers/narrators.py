from fastapi import APIRouter, HTTPException, Query
from app.database import db
from app.models import Narrator, NarratorDetail, NarratorConnection

router = APIRouter()


@router.get("", response_model=list[Narrator])
async def list_narrators(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    sort_by: str = Query("connections", regex="^(connections|name|hadiths)$"),
):
    """List narrators with pagination, sorted by total connections."""
    query = """
        MATCH (n:Person)
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
        SKIP $skip LIMIT $limit
    """
    results = await db.execute_read(query, skip=skip, limit=limit)
    return [Narrator(**r) for r in results]


@router.get("/top", response_model=list[Narrator])
async def get_top_narrators(limit: int = Query(10, ge=1, le=50)):
    """Get top narrators by connection count."""
    query = """
        MATCH (n:Person)
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
    results = await db.execute_read(query, limit=limit)
    return [Narrator(**r) for r in results]


@router.get("/{narrator_id}", response_model=NarratorDetail)
async def get_narrator(narrator_id: str):
    """Get full narrator details with teachers and students."""
    # Basic info
    info_query = """
        MATCH (n:Person {id: $id})
        OPTIONAL MATCH (n)-[r1:NARRATED_FROM]->()
        WITH n, COUNT(DISTINCT r1) as out_count
        OPTIONAL MATCH ()-[r2:NARRATED_FROM]->(n)
        WITH n, out_count, COUNT(DISTINCT r2) as in_count
        RETURN n.id as id,
               n.name as name,
               n.rank as rank,
               n.fame as fame,
               out_count + in_count as total_connections
    """
    info = await db.execute_single(info_query, id=narrator_id)

    if not info:
        raise HTTPException(status_code=404, detail=f"Narrator {narrator_id} not found")

    # Teachers (who they heard from)
    teachers_query = """
        MATCH (n:Person {id: $id})-[r:NARRATED_FROM]->(teacher:Person)
        WITH teacher, COUNT(DISTINCT r.hadith) as hadith_count
        RETURN teacher.id as id,
               teacher.name as name,
               teacher.rank as rank,
               hadith_count
        ORDER BY hadith_count DESC
        LIMIT 20
    """
    teachers = await db.execute_read(teachers_query, id=narrator_id)

    # Students (who heard from them)
    students_query = """
        MATCH (student:Person)-[r:NARRATED_FROM]->(n:Person {id: $id})
        WITH student, COUNT(DISTINCT r.hadith) as hadith_count
        RETURN student.id as id,
               student.name as name,
               student.rank as rank,
               hadith_count
        ORDER BY hadith_count DESC
        LIMIT 20
    """
    students = await db.execute_read(students_query, id=narrator_id)

    # Hadith numbers this narrator appears in
    hadiths_query = """
        MATCH (n:Person {id: $id})
        OPTIONAL MATCH (n)-[r1:NARRATED_FROM]->()
        OPTIONAL MATCH ()-[r2:NARRATED_FROM]->(n)
        WITH COLLECT(DISTINCT r1.hadith) + COLLECT(DISTINCT r2.hadith) as all_hadiths
        UNWIND all_hadiths as h
        RETURN DISTINCT h
        ORDER BY h
        LIMIT 100
    """
    hadiths = await db.execute_read(hadiths_query, id=narrator_id)
    hadith_numbers = [r["h"] for r in hadiths if r["h"] is not None]

    return NarratorDetail(
        id=info["id"],
        name=info["name"],
        rank=info["rank"],
        fame=info["fame"],
        total_connections=info["total_connections"],
        teachers=[NarratorConnection(**t) for t in teachers],
        students=[NarratorConnection(**s) for s in students],
        hadith_numbers=hadith_numbers,
    )
