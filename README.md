# Isnad Graph - Hadith Chain Network Database

## Project Goal
Build a graph database of Sahih Bukhari hadith collection to visualize and analyze narrator networks and transmission chains. Help students and researchers understand the complexity of hadith transmission through interactive graph queries.

## Architecture

### Graph Schema
**Nodes:**
- Person (narrators and their ancestors)
  - name, is_narrator (bool), death_date, location, reliability_grade

**Edges:**
- SON_OF (person → person) - genealogical relationship
- NARRATED_FROM (person → person) - transmission relationship
  - method: haddathana/akhbarana/an

### Why This Design
- Narrator network is the foundation, hadiths are paths through it
- SON_OF edges solve narrator disambiguation (Muhammad → Abdullah → Umar)
- Preserves "narrated from father" relationships important for chain reliability

## Tech Stack
- Graph DB: Neo4j Community Edition
- Extraction: Python + LLM (Claude/GPT) with manual validation
- Backend: FastAPI + neo4j driver (for web app later)
- Data format: JSON intermediate format before loading to Neo4j

## Data Pipeline
1. LLM extracts chain from Arabic text to JSON
2. Manual validation of extractions
3. Python script loads validated JSON into Neo4j
4. Query through Neo4j Browser (MVP) or custom web interface

## MVP Scope
- 20-30 hadiths from Sahih Bukhari
- Manual extraction with LLM assistance
- Basic Neo4j queries proving concept
- If useful → scale to full collection with community contributions

## Narration Terms
- حدثنا (haddathana) = direct oral hearing
- أخبرنا (akhbarana) = informed us (oral or written)
- عن (an) = generic "from"

## JSON Format for Extracted Chains
```json
{
  "hadith_number": "140",
  "book": "Kitab al-Wudu",
  "chain": [
    {"name": "Muhammad ibn Abd al-Rahim", "relation": "haddathana"},
    {"name": "Mansur ibn Salama", "aka": "Abu Salama al-Khuza'i", "relation": "akhbarana"}
  ],
  "matn": "Arabic text..."
}
```

## Original Data Source:

https://hadith.islam-db.com