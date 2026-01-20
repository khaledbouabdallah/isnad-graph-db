"""
Tests for the graph router.
"""

import pytest


@pytest.mark.anyio
async def test_graph_overview(client):
    """Test getting graph overview data."""
    response = await client.get("/api/graph/overview?limit=50")

    assert response.status_code == 200
    data = response.json()

    # Check structure
    assert "nodes" in data
    assert "edges" in data

    # Should have nodes with the right structure
    assert len(data["nodes"]) > 0
    node = data["nodes"][0]
    assert "id" in node
    assert "label" in node
    assert "size" in node
    assert "color" in node


@pytest.mark.anyio
async def test_graph_overview_default_limit(client):
    """Test graph overview with default limit."""
    response = await client.get("/api/graph/overview")
    assert response.status_code == 200
    data = response.json()

    # Default limit should return up to 500 nodes
    assert len(data["nodes"]) <= 500


@pytest.mark.anyio
async def test_graph_narrator_valid(client):
    """Test getting narrator ego-graph with valid ID."""
    # First get a valid narrator ID
    stats_response = await client.get("/api/stats")
    top_narrators = stats_response.json()["top_narrators"]

    if top_narrators:
        # Use first top narrator's name as ID (they use name as ID)
        narrator_name = top_narrators[0]["name"]

        # Get narrators list to find actual ID
        narrators_response = await client.get("/api/narrators?limit=1")
        if narrators_response.status_code == 200:
            narrators = narrators_response.json()
            if narrators:
                narrator_id = narrators[0]["id"]
                response = await client.get(f"/api/graph/narrator/{narrator_id}")
                assert response.status_code == 200
                data = response.json()
                assert "nodes" in data
                assert "edges" in data


@pytest.mark.anyio
async def test_graph_hadith_valid(client):
    """Test getting hadith chain graph."""
    response = await client.get("/api/graph/hadith/1")

    assert response.status_code == 200
    data = response.json()
    assert "nodes" in data
    assert "edges" in data
