from pydantic import BaseModel


class Narrator(BaseModel):
    """Basic narrator info for list views."""

    id: str
    name: str | None
    rank: str | None = None
    fame: str | None = None
    birth_year: int | None = None
    death_year: int | None = None
    hadith_count: int | None = None


class NarratorConnection(BaseModel):
    """A narrator connected to another (teacher/student)."""

    id: str
    name: str | None
    fame: str | None
    rank: str | None = None
    birth_year: int | None = None
    death_year: int | None = None
    hadith_count: int  # Number of hadiths in this connection


class NarratorDetail(BaseModel):
    """Full narrator details with connections."""

    id: str
    name: str | None
    rank: str | None
    fame: str | None
    birth_year: int | None = None
    death_year: int | None = None
    total_connections: int
    teachers: list[NarratorConnection]  # Narrators they heard from
    students: list[NarratorConnection]  # Narrators who heard from them
    hadith_numbers: list[int]  # List of hadith numbers they appear in
