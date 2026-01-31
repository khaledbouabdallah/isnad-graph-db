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
    """Test getting hadith details with chains."""
    response = await client.get("/api/hadiths/1")

    assert response.status_code == 200
    data = response.json()

    assert "number" in data
    assert "matn" in data
    assert "chains" in data
    assert "is_compound_isnad" in data
    assert data["number"] == 1

    # Chains should be a list
    assert isinstance(data["chains"], list)
    if data["chains"]:
        chain = data["chains"][0]
        assert "chain_id" in chain
        assert "chain_type" in chain
        assert "narrators" in chain


@pytest.mark.anyio
async def test_get_hadith_chains(client):
    """Test getting hadith transmission chains."""
    response = await client.get("/api/hadiths/1/chains")

    assert response.status_code == 200
    data = response.json()

    # Should be a list of chains
    assert isinstance(data, list)
    if data:
        chain = data[0]
        assert "chain_id" in chain
        assert "chain_type" in chain
        assert "narrators" in chain
        if chain["narrators"]:
            narrator = chain["narrators"][0]
            assert "id" in narrator
            assert "name" in narrator


@pytest.mark.anyio
async def test_get_compound_hadith(client):
    """Test getting a compound isnad hadith with multiple chains."""
    response = await client.get("/api/hadiths/995")

    assert response.status_code == 200
    data = response.json()

    assert data["number"] == 995
    assert data["is_compound_isnad"] == True
    assert len(data["chains"]) > 1

    # Check chain types
    chain_types = [c["chain_type"] for c in data["chains"]]
    assert "primary" in chain_types


@pytest.mark.anyio
async def test_get_hadith_not_found(client):
    """Test 404 for non-existent hadith."""
    response = await client.get("/api/hadiths/999999")

    assert response.status_code == 404
