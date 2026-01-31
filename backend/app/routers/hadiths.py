from fastapi import APIRouter, HTTPException, Query
from app.database import db
from app.models import Hadith, HadithDetail, ChainNarrator, Chain

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
        OPTIONAL MATCH (h)-[:HAS_CHAIN {chain_type: 'primary'}]->(first:Person)
        RETURN h.number as number,
               h.matn as matn,
               first.name as first_narrator,
               COALESCE(h.is_compound_isnad, false) as is_compound_isnad
        ORDER BY h.number
        SKIP $skip LIMIT $limit
    """
    results = await db.execute_read(query, skip=skip, limit=limit)
    return [Hadith(**r, chain_length=None) for r in results]


@router.get("/{hadith_number}", response_model=HadithDetail)
async def get_hadith(hadith_number: int):
    """Get full hadith details with all chains."""
    # Get hadith info
    hadith_query = """
        MATCH (h:Hadith {number: $num})
        RETURN h.number as number,
               h.matn as matn,
               h.full_text as full_text,
               h.url as url,
               COALESCE(h.is_compound_isnad, false) as is_compound_isnad
    """
    hadith = await db.execute_single(hadith_query, num=hadith_number)

    if not hadith:
        raise HTTPException(status_code=404, detail=f"Hadith {hadith_number} not found")

    # Get all chains for this hadith
    chains_query = """
        MATCH (h:Hadith {number: $num})-[hc:HAS_CHAIN]->(first:Person)
        MATCH path = (first)-[:NARRATED_FROM*0..]->(n:Person)
        WHERE ALL(r IN relationships(path) WHERE r.chain_id = hc.chain_id)
        WITH hc.chain_id as chain_id,
             hc.chain_type as chain_type,
             n,
             length(path) as position
        ORDER BY chain_id, position
        RETURN chain_id,
               chain_type,
               n.id as narrator_id,
               n.name as narrator_name,
               n.rank as narrator_rank,
               n.fame as narrator_fame,
               position
    """
    chain_results = await db.execute_read(chains_query, num=hadith_number)

    # Group narrators by chain_id
    chains_dict = {}
    for row in chain_results:
        chain_id = row["chain_id"]
        if chain_id not in chains_dict:
            chains_dict[chain_id] = {
                "chain_id": chain_id,
                "chain_type": row["chain_type"],
                "narrators": []
            }

        chains_dict[chain_id]["narrators"].append(
            ChainNarrator(
                id=row["narrator_id"],
                name=row["narrator_name"],
                rank=row["narrator_rank"],
                fame=row["narrator_fame"],
                position=row["position"]
            )
        )

    # Convert to list of Chain objects, with primary chains first
    chains = [
        Chain(**chain_data)
        for chain_data in sorted(
            chains_dict.values(),
            key=lambda x: (x["chain_type"] != "primary", x["chain_id"])
        )
    ]

    return HadithDetail(
        number=hadith["number"],
        matn=hadith["matn"],
        full_text=hadith["full_text"],
        url=hadith["url"],
        is_compound_isnad=hadith["is_compound_isnad"],
        chains=chains,
    )


@router.get("/{hadith_number}/chains")
async def get_hadith_chains(hadith_number: int):
    """Get all chains for a hadith (lighter endpoint without full text)."""
    chains_query = """
        MATCH (h:Hadith {number: $num})-[hc:HAS_CHAIN]->(first:Person)
        MATCH path = (first)-[:NARRATED_FROM*0..]->(n:Person)
        WHERE ALL(r IN relationships(path) WHERE r.chain_id = hc.chain_id)
        WITH hc.chain_id as chain_id,
             hc.chain_type as chain_type,
             n,
             length(path) as position
        ORDER BY chain_id, position
        RETURN chain_id,
               chain_type,
               n.id as narrator_id,
               n.name as narrator_name,
               n.rank as narrator_rank,
               position
    """
    results = await db.execute_read(chains_query, num=hadith_number)

    if not results:
        raise HTTPException(status_code=404, detail=f"Hadith {hadith_number} not found")

    # Group narrators by chain_id
    chains_dict = {}
    for row in results:
        chain_id = row["chain_id"]
        if chain_id not in chains_dict:
            chains_dict[chain_id] = {
                "chain_id": chain_id,
                "chain_type": row["chain_type"],
                "narrators": []
            }

        chains_dict[chain_id]["narrators"].append(
            ChainNarrator(
                id=row["narrator_id"],
                name=row["narrator_name"],
                rank=row["narrator_rank"],
                fame=None,
                position=row["position"]
            )
        )

    # Return list of chains, with primary first
    return sorted(
        chains_dict.values(),
        key=lambda x: (x["chain_type"] != "primary", x["chain_id"])
    )
