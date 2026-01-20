"""
Tests for the search router.
"""

import pytest


@pytest.mark.anyio
async def test_search_hadiths(client):
    """Test searching hadiths by text."""
    # Search for a common Arabic word
    response = await client.get("/api/search/hadiths?q=عن&limit=5")

    assert response.status_code == 200
    data = response.json()

    assert isinstance(data, list)
    assert len(data) <= 5


@pytest.mark.anyio
async def test_search_narrators(client):
    """Test searching narrators by name."""
    # Search for a partial name
    response = await client.get("/api/search/narrators?q=محمد&limit=5")

    assert response.status_code == 200
    data = response.json()

    assert isinstance(data, list)

    # If results found, check structure
    if data:
        narrator = data[0]
        assert "id" in narrator
        assert "name" in narrator


@pytest.mark.anyio
async def test_search_all(client):
    """Test unified search for both hadiths and narrators."""
    response = await client.get("/api/search?q=محمد&limit=5")

    assert response.status_code == 200
    data = response.json()

    # Should have both narrators and hadiths keys
    assert "narrators" in data
    assert "hadiths" in data

    assert isinstance(data["narrators"], list)
    assert isinstance(data["hadiths"], list)


@pytest.mark.anyio
async def test_search_query_too_short(client):
    """Test validation for query length."""
    response = await client.get("/api/search/hadiths?q=a")

    # Should fail validation (min_length=2)
    assert response.status_code == 422
