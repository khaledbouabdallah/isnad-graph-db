from neo4j import AsyncGraphDatabase
from app.config import get_settings


class Neo4jDatabase:
    """Async Neo4j database connection manager."""

    def __init__(self):
        self.driver = None

    async def connect(self):
        """Initialize the Neo4j async driver."""
        settings = get_settings()
        self.driver = AsyncGraphDatabase.driver(
            settings.neo4j_uri,
            auth=(settings.neo4j_user, settings.neo4j_password),
            max_connection_pool_size=10,
        )
        # Verify connectivity
        await self.driver.verify_connectivity()
        print(f"✓ Connected to Neo4j at {settings.neo4j_uri}")

    async def disconnect(self):
        """Close the Neo4j driver."""
        if self.driver:
            await self.driver.close()
            print("✓ Disconnected from Neo4j")

    async def execute_read(self, query: str, **params):
        """Execute a read query and return results as list of dicts."""
        async with self.driver.session() as session:
            result = await session.run(query, **params)
            records = await result.data()
            return records

    async def execute_single(self, query: str, **params):
        """Execute a query and return a single result."""
        async with self.driver.session() as session:
            result = await session.run(query, **params)
            record = await result.single()
            return dict(record) if record else None


# Singleton instance
db = Neo4jDatabase()
