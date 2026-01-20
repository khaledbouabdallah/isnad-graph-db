"""
Tests for the hadiths router.
"""

import pytest


@pytest.mark.anyio
async def test_list_hadiths(client):
    """Test listing hadiths with pagination."""
    response = await client.get("/api/hadiths?skip=0&limit=10")

    assert response.status_code == 200
    data = response.json()

    assert isinstance(data, list)
    assert len(data) <= 10

    if data:
        hadith = data[0]
        assert "number" in hadith
        assert "matn" in hadith


@pytest.mark.anyio
async def test_list_hadiths_pagination(client):
    """Test that pagination works correctly."""
    # Get first page
    response1 = await client.get("/api/hadiths?skip=0&limit=5")
    data1 = response1.json()

    # Get second page
    response2 = await client.get("/api/hadiths?skip=5&limit=5")
    data2 = response2.json()

    # Pages should have different hadiths
    if data1 and data2:
        nums1 = {h["number"] for h in data1}
        nums2 = {h["number"] for h in data2}
        assert nums1.isdisjoint(nums2)


@pytest.mark.anyio
async def test_get_hadith_detail(client):
    """Test getting hadith details."""
    response = await client.get("/api/hadiths/1")

    assert response.status_code == 200
    data = response.json()

    assert "number" in data
    assert "matn" in data
    assert data["number"] == 1


@pytest.mark.anyio
async def test_get_hadith_chain(client):
    """Test getting hadith transmission chain."""
    response = await client.get("/api/hadiths/1/chain")

    assert response.status_code == 200
    data = response.json()

    # Chain should be a list of narrators
    assert isinstance(data, list)
    if data:
        narrator = data[0]
        assert "id" in narrator
        assert "name" in narrator


@pytest.mark.anyio
async def test_get_hadith_not_found(client):
    """Test 404 for non-existent hadith."""
    response = await client.get("/api/hadiths/999999")

    assert response.status_code == 404
