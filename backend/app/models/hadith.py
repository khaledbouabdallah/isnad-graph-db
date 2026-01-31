from pydantic import BaseModel


class ChainNarrator(BaseModel):
    """A narrator in a hadith chain."""

    id: str
    name: str | None
    rank: str | None = None
    fame: str | None = None
    position: int  # Position in chain (0 = first narrator after Bukhari)


class Chain(BaseModel):
    """A transmission chain for a hadith."""

    chain_id: str
    chain_type: str  # "primary", "variant", or "note"
    narrators: list[ChainNarrator]


class Hadith(BaseModel):
    """Basic hadith info for list views."""

    number: int
    matn: str | None = None
    chain_length: int | None = None
    first_narrator: str | None = None
    is_compound_isnad: bool = False


class HadithDetail(BaseModel):
    """Full hadith details with chain(s)."""

    number: int
    matn: str | None
    full_text: str | None
    url: str | None
    is_compound_isnad: bool = False
    chains: list[Chain]  # Multiple chains for compound isnads
