"""
Tests for the stats router.
"""

import pytest


@pytest.mark.anyio
async def test_get_stats(client):
    """Test getting database statistics."""
    response = await client.get("/api/stats")

    assert response.status_code == 200
    data = response.json()

    # Check required fields exist
    assert "total_hadiths" in data
    assert "total_narrators" in data
    assert "total_edges" in data
    assert "avg_chain_length" in data
    assert "top_narrators" in data

    # Check types
    assert isinstance(data["total_hadiths"], int)
    assert isinstance(data["total_narrators"], int)
    assert isinstance(data["total_edges"], int)
    assert isinstance(data["avg_chain_length"], (int, float))
    assert isinstance(data["top_narrators"], list)

    # Validate counts are positive (we have data)
    assert data["total_hadiths"] > 0
    assert data["total_narrators"] > 0
    assert data["total_edges"] > 0
