from fastapi import APIRouter, Query
from app.database import db
from app.models import GraphNode, GraphEdge, GraphData

router = APIRouter()

# Color mapping for narrator ranks - matches frontend graph-config.ts
# Warm earth-tone palette (gold, amber, copper, bronze)
RANK_COLORS = {
    "صحابي": "#F59E0B",  # Warm Gold - Companions
    "ثقة ثبت": "#D97706",  # Deep Amber - Very trustworthy (check before ثقة)
    "ثقة": "#B45309",  # Copper - Trustworthy
    "حافظ": "#92400E",  # Bronze - Memorizer
    "default": "#A78BFA",  # Soft Violet - Default/Unknown
}


def get_node_color(rank: str | None) -> str:
    """Get color based on narrator rank."""
    if not rank:
        return RANK_COLORS["default"]
    # Check in order of specificity (ثقة ثبت before ثقة)
    if "صحابي" in rank:
        return RANK_COLORS["صحابي"]
    if "ثقة ثبت" in rank:
        return RANK_COLORS["ثقة ثبت"]
    if "ثقة" in rank:
        return RANK_COLORS["ثقة"]
    if "حافظ" in rank:
        return RANK_COLORS["حافظ"]
    return RANK_COLORS["default"]


@router.get("/overview", response_model=GraphData)
async def get_graph_overview(
    limit: int = Query(500, ge=50, le=2000),
):
    """Get top narrators and their connections for the main explorer view."""

    # Get top narrators by connection count
    nodes_query = """
        MATCH (n:Person)
        OPTIONAL MATCH (n)-[r1:NARRATED_FROM]->()
        WITH n, COUNT(DISTINCT r1) as out_count
        OPTIONAL MATCH ()-[r2:NARRATED_FROM]->(n)
        WITH n, out_count, COUNT(DISTINCT r2) as in_count
        WITH n, out_count + in_count as total
        WHERE total > 5
        RETURN n.id as id,
               n.fame as label,
               n.rank as rank,
               total as connections
        ORDER BY total DESC
        LIMIT $limit
    """
    nodes_result = await db.execute_read(nodes_query, limit=limit)

    node_ids = {n["id"] for n in nodes_result}

    # Calculate node sizes (log scale for better visualization)
    max_connections = max(n["connections"] for n in nodes_result) if nodes_result else 1

    nodes = []
    for n in nodes_result:
        size = 5 + (n["connections"] / max_connections) * 25
        nodes.append(
            GraphNode(
                id=n["id"],
                label=n["label"],
                rank=n["rank"],
                size=size,
                color=get_node_color(n["rank"]),
            )
        )

    # Get edges between these nodes
    edges_query = """
        MATCH (n1:Person)-[r:NARRATED_FROM]->(n2:Person)
        WHERE n1.id IN $ids AND n2.id IN $ids
        WITH n1.id as source, n2.id as target, COUNT(r) as weight
        RETURN source, target, weight
    """
    edges_result = await db.execute_read(edges_query, ids=list(node_ids))

    edges = [GraphEdge(**e) for e in edges_result]

    return GraphData(nodes=nodes, edges=edges)


@router.get("/narrator/{narrator_id}", response_model=GraphData)
async def get_narrator_graph(
    narrator_id: str,
    depth: int = Query(1, ge=1, le=2),
):
    """Get ego-graph centered on a specific narrator."""

    # Get the central narrator and their connections
    if depth == 1:
        query = """
            MATCH (center:Person {id: $id})
            OPTIONAL MATCH (center)-[r1:NARRATED_FROM]->(teacher:Person)
            OPTIONAL MATCH (student:Person)-[r2:NARRATED_FROM]->(center)
            WITH center,
                 COLLECT(DISTINCT teacher) as teachers,
                 COLLECT(DISTINCT student) as students
            WITH center, teachers + students + [center] as all_nodes
            UNWIND all_nodes as n
            WITH DISTINCT n
            OPTIONAL MATCH (n)-[r1:NARRATED_FROM]->()
            WITH n, COUNT(DISTINCT r1) as out_count
            OPTIONAL MATCH ()-[r2:NARRATED_FROM]->(n)
            WITH n, out_count, COUNT(DISTINCT r2) as in_count
            RETURN n.id as id,
                   n.fame as label,
                   n.rank as rank,
                   out_count + in_count as connections
        """
    else:  # depth == 2
        query = """
            MATCH (center:Person {id: $id})
            OPTIONAL MATCH (center)-[:NARRATED_FROM*1..2]-(connected:Person)
            WITH center, COLLECT(DISTINCT connected) + [center] as all_nodes
            UNWIND all_nodes as n
            WITH DISTINCT n
            OPTIONAL MATCH (n)-[r1:NARRATED_FROM]->()
            WITH n, COUNT(DISTINCT r1) as out_count
            OPTIONAL MATCH ()-[r2:NARRATED_FROM]->(n)
            WITH n, out_count, COUNT(DISTINCT r2) as in_count
            RETURN n.id as id,
                   n.fame as label,
                   n.rank as rank,
                   out_count + in_count as connections
        """

    nodes_result = await db.execute_read(query, id=narrator_id)

    if not nodes_result:
        return GraphData(nodes=[], edges=[])

    node_ids = {n["id"] for n in nodes_result}
    max_connections = max(n["connections"] for n in nodes_result)

    nodes = []
    for n in nodes_result:
        size = 5 + (n["connections"] / max_connections) * 25
        # Make center node larger
        if n["id"] == narrator_id:
            size = 35
        nodes.append(
            GraphNode(
                id=n["id"],
                label=n["label"],
                rank=n["rank"],
                size=size,
                color=get_node_color(n["rank"]),
            )
        )

    # Get edges
    edges_query = """
        MATCH (n1:Person)-[r:NARRATED_FROM]->(n2:Person)
        WHERE n1.id IN $ids AND n2.id IN $ids
        WITH n1.id as source, n2.id as target, COUNT(r) as weight
        RETURN source, target, weight
    """
    edges_result = await db.execute_read(edges_query, ids=list(node_ids))
    edges = [GraphEdge(**e) for e in edges_result]

    return GraphData(nodes=nodes, edges=edges)


@router.get("/hadith/{hadith_number}", response_model=GraphData)
async def get_hadith_graph(hadith_number: int):
    """Get the chain graph for a specific hadith."""

    query = """
        MATCH (h:Hadith {number: $num})-[:HAS_CHAIN]->(first:Person)
        MATCH path = (first)-[:NARRATED_FROM*0..]->(n:Person)
        WHERE ALL(r IN relationships(path) WHERE r.hadith = $num)
        WITH DISTINCT n, length(path) as position
        OPTIONAL MATCH (n)-[r1:NARRATED_FROM]->()
        WITH n, position, COUNT(DISTINCT r1) as out_count
        OPTIONAL MATCH ()-[r2:NARRATED_FROM]->(n)
        WITH n, position, out_count, COUNT(DISTINCT r2) as in_count
        RETURN n.id as id,
               n.name as label,
               n.rank as rank,
               position,
               out_count + in_count as connections
        ORDER BY position
    """
    nodes_result = await db.execute_read(query, num=hadith_number)

    if not nodes_result:
        return GraphData(nodes=[], edges=[])

    max_connections = max(n["connections"] for n in nodes_result) if nodes_result else 1

    nodes = []
    for n in nodes_result:
        size = 8 + (n["connections"] / max_connections) * 20
        nodes.append(
            GraphNode(
                id=n["id"],
                label=n["label"],
                rank=n["rank"],
                size=size,
                color=get_node_color(n["rank"]),
            )
        )

    # Get edges for this hadith's chain
    edges_query = """
        MATCH (n1:Person)-[r:NARRATED_FROM {hadith: $num}]->(n2:Person)
        RETURN n1.id as source, n2.id as target, 1 as weight
    """
    edges_result = await db.execute_read(edges_query, num=hadith_number)
    edges = [GraphEdge(**e) for e in edges_result]

    return GraphData(nodes=nodes, edges=edges)
