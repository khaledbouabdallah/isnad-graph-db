"""
Tests for the narrators router.
"""

import pytest


@pytest.mark.anyio
async def test_list_narrators(client):
    """Test listing narrators with pagination."""
    response = await client.get("/api/narrators?skip=0&limit=10")

    assert response.status_code == 200
    data = response.json()

    assert isinstance(data, list)
    assert len(data) <= 10

    if data:
        narrator = data[0]
        assert "id" in narrator
        assert "name" in narrator
        assert "hadith_count" in narrator


@pytest.mark.anyio
async def test_list_narrators_pagination(client):
    """Test that pagination works correctly."""
    # Get first page
    response1 = await client.get("/api/narrators?skip=0&limit=5")
    data1 = response1.json()

    # Get second page
    response2 = await client.get("/api/narrators?skip=5&limit=5")
    data2 = response2.json()

    # Pages should have different narrators
    if data1 and data2:
        ids1 = {n["id"] for n in data1}
        ids2 = {n["id"] for n in data2}
        assert ids1.isdisjoint(ids2)


@pytest.mark.anyio
async def test_top_narrators(client):
    """Test getting top narrators."""
    response = await client.get("/api/narrators/top?limit=5")

    assert response.status_code == 200
    data = response.json()

    assert isinstance(data, list)
    assert len(data) <= 5

    # Should be sorted by connection count (descending)
    if len(data) >= 2:
        counts = [n["hadith_count"] for n in data]
        assert counts == sorted(counts, reverse=True)


@pytest.mark.anyio
async def test_get_narrator_detail(client):
    """Test getting narrator details."""
    # First get a valid narrator ID
    list_response = await client.get("/api/narrators?limit=1")
    narrators = list_response.json()

    if narrators:
        narrator_id = narrators[0]["id"]
        response = await client.get(f"/api/narrators/{narrator_id}")

        assert response.status_code == 200
        data = response.json()

        assert "id" in data
        assert "name" in data
        assert "teachers" in data
        assert "students" in data
        assert "total_connections" in data


@pytest.mark.anyio
async def test_get_narrator_not_found(client):
    """Test 404 for non-existent narrator."""
    response = await client.get("/api/narrators/nonexistent_narrator_id_12345")

    assert response.status_code == 404
