"""
Pytest configuration and fixtures for backend tests.
"""

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.database import db


@pytest_asyncio.fixture
async def client():
    """Async HTTP client for testing API endpoints."""
    # Connect to the database
    await db.connect()

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac

    # Disconnect after tests
    await db.disconnect()


@pytest.fixture
def anyio_backend():
    """Use asyncio as the async backend."""
    return "asyncio"
