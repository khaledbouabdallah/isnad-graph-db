from pydantic import BaseModel


class GraphNode(BaseModel):
    """A node in the graph visualization."""

    id: str
    label: str | None
    rank: str | None = None
    size: float = 10.0  # Node size based on connections
    color: str | None = None  # Hex color based on rank


class GraphEdge(BaseModel):
    """An edge in the graph visualization."""

    source: str
    target: str
    weight: int = 1  # Number of hadiths on this edge


class GraphData(BaseModel):
    """Graph data for Sigma.js visualization."""

    nodes: list[GraphNode]
    edges: list[GraphEdge]
