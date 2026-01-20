from pydantic import BaseModel


class ChainNarrator(BaseModel):
    """A narrator in a hadith chain."""

    id: str
    name: str | None
    rank: str | None = None
    fame: str | None = None
    position: int  # Position in chain (0 = first narrator after Bukhari)


class Hadith(BaseModel):
    """Basic hadith info for list views."""

    number: int
    matn: str | None = None
    chain_length: int | None = None
    first_narrator: str | None = None


class HadithDetail(BaseModel):
    """Full hadith details with chain."""

    number: int
    matn: str | None
    full_text: str | None
    url: str | None
    chain: list[ChainNarrator]
