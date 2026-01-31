"""Neo4j loader module for importing hadiths into graph database"""

import json
from neo4j import GraphDatabase
from typing import List, Dict


def load_to_neo4j(
    hadiths_file: str = "data/Sahih_Al-Bukhari/bukhari_hadiths.json",
    neo4j_uri: str = "bolt://localhost:7687",
    neo4j_user: str = "neo4j",
    neo4j_password: str = "password123",
):
    """Load scraped hadiths into Neo4j graph database

    Creates:
    - Person nodes for narrators with properties (id, name, fame, rank)
    - Hadith nodes with properties (number, book, chapter, matn, full_text)
    - NARRATED_FROM edges between narrators
    - HAS_CHAIN edges from hadith to first narrator

    Args:
        hadiths_file: Path to JSON file with scraped hadiths
        neo4j_uri: Neo4j connection URI
        neo4j_user: Neo4j username
        neo4j_password: Neo4j password
    """
    driver = GraphDatabase.driver(neo4j_uri, auth=(neo4j_user, neo4j_password))

    with open(hadiths_file, "r", encoding="utf-8") as f:
        hadiths = json.load(f)

    with driver.session() as session:
        # Create all narrator nodes from narrator_details
        print("Creating narrator nodes...")
        for hadith in hadiths:
            for narrator in hadith["narrator_details"]:
                session.run(
                    """
                    MERGE (n:Person {id: $id})
                    SET n.name = $name,
                        n.fame = $fame,
                        n.rank = $rank,
                        n.birth_year = $birth_year,
                        n.death_year = $death_year,
                        n.normalized_fame = $normalized_fame,
                        n.is_narrator = true
                    """,
                    id=narrator["id"],
                    name=narrator["name"],
                    fame=narrator["fame"],
                    rank=narrator["rank"],
                    birth_year=narrator.get("birth_year"),
                    death_year=narrator.get("death_year"),
                    normalized_fame=narrator.get("normalized_fame", narrator["fame"]),
                )

        print("Creating hadiths and chains...")
        for idx, hadith in enumerate(hadiths):
            if idx % 100 == 0:
                print(f"  Processed {idx}/{len(hadiths)}...")

            # Create hadith node with book and chapter metadata
            session.run(
                """
                MERGE (h:Hadith {number: $number})
                SET h.book = $book,
                    h.chapter = $chapter,
                    h.matn = $matn,
                    h.full_text = $full_text,
                    h.normalized_matn = $normalized_matn,
                    h.is_compound_isnad = $is_compound
                """,
                number=hadith["hadith_number"],
                book=hadith.get("book", ""),
                chapter=hadith.get("chapter", ""),
                matn=hadith["matn"],
                full_text=hadith["full_text"],
                normalized_matn=hadith.get("normalized_matn", hadith["matn"]),
                is_compound=hadith.get("is_compound_isnad", False),
            )

            # Process multiple chains if available, otherwise fall back to legacy single chain
            chains = hadith.get("chains", [])
            if not chains:
                # Legacy format: single chain
                chain = hadith.get("chain", [])
                if chain:
                    chains = [{
                        "chain_type": "primary",
                        "narrators": chain,
                        "marker": None
                    }]

            if not chains:
                continue

            # Process each chain
            for chain_idx, chain_data in enumerate(chains):
                chain = chain_data["narrators"]
                chain_type = chain_data["chain_type"]
                chain_id = f"{hadith['hadith_number']}_chain_{chain_idx}"

                if not chain:
                    continue

                # Create NARRATED_FROM edges between consecutive narrators in this chain
                for i in range(len(chain) - 1):
                    narrator1_id = chain[i]["id"]
                    narrator2_id = chain[i + 1]["id"]

                    # Skip if same ID (prevent self-loop)
                    if narrator1_id == narrator2_id:
                        continue

                    session.run(
                        """
                        MATCH (n1:Person {id: $id1})
                        MATCH (n2:Person {id: $id2})
                        MERGE (n1)-[r:NARRATED_FROM {hadith: $hadith_num, chain_id: $chain_id}]->(n2)
                        SET r.chain_type = $chain_type
                        """,
                        id1=narrator1_id,
                        id2=narrator2_id,
                        hadith_num=hadith["hadith_number"],
                        chain_id=chain_id,
                        chain_type=chain_type,
                    )

                # Link hadith to FIRST narrator in each chain
                # (for primary chains, this is the main link; for variants, it's an alternate path)
                session.run(
                    """
                    MATCH (h:Hadith {number: $hadith_num})
                    MATCH (n:Person {id: $narrator_id})
                    MERGE (h)-[r:HAS_CHAIN {chain_id: $chain_id}]->(n)
                    SET r.chain_type = $chain_type
                    """,
                    hadith_num=hadith["hadith_number"],
                    narrator_id=chain[0]["id"],
                    chain_id=chain_id,
                    chain_type=chain_type,
                )

    driver.close()
    print(f"✅ Loaded {len(hadiths)} hadiths to Neo4j")

    # Materialize hadith_numbers on Person nodes
    print("\n📊 Materializing hadith numbers on narrator nodes...")
    materialize_hadith_numbers(neo4j_uri, neo4j_user, neo4j_password)


def materialize_hadith_numbers(
    neo4j_uri: str = "bolt://localhost:7687",
    neo4j_user: str = "neo4j",
    neo4j_password: str = "password123",
):
    """Compute and store hadith_numbers array on each Person node for fast lookups."""
    driver = GraphDatabase.driver(neo4j_uri, auth=(neo4j_user, neo4j_password))

    with driver.session() as session:
        # Materialize hadith numbers for all narrators
        # Collect all hadith numbers from NARRATED_FROM relationships connected to each person
        query = """
            MATCH (p:Person)
            OPTIONAL MATCH (p)-[r:NARRATED_FROM]-()
            WITH p, COLLECT(DISTINCT r.hadith) as hadith_list
            SET p.hadith_numbers = [h IN hadith_list WHERE h IS NOT NULL]
            RETURN count(p) as total
        """
        result = session.run(query)
        total = result.single()["total"]
        print(f"  ✓ Materialized hadith numbers for {total} narrators")

    driver.close()


def reset_database(
    neo4j_uri: str = "bolt://localhost:7687",
    neo4j_user: str = "neo4j",
    neo4j_password: str = "password123",
):
    """Clear all nodes and relationships from Neo4j database

    WARNING: This deletes everything in the database!

    Args:
        neo4j_uri: Neo4j connection URI
        neo4j_user: Neo4j username
        neo4j_password: Neo4j password
    """
    driver = GraphDatabase.driver(neo4j_uri, auth=(neo4j_user, neo4j_password))

    print("⚠️  Clearing database...")
    with driver.session() as session:
        session.run("MATCH (n) DETACH DELETE n")

    driver.close()
    print("✅ Database cleared.")
