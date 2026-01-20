# Isnad Graph - Hadith Chain Network Database

## Project Goal
Build a graph database of Sahih Bukhari hadith collection to visualize and analyze narrator networks and transmission chains. Help students and researchers understand the complexity of hadith transmission through interactive graph queries.

## Architecture

### Graph Schema
**Nodes:**
- **Person** (narrators)
  - `id` (from hadith.islam-db.com)
  - `name`, `fame`, `rank`
  - `is_narrator = true`

- **Hadith**
  - `number` (hadith number)
  - `book` (e.g., "صحيح البخاري")
  - `chapter` (e.g., "باب بدء الوحي")
  - `matn` (core hadith text)
  - `full_text` (complete text with chain)

**Edges:**
- **NARRATED_FROM** (person → person)
  - `hadith`: hadith_number (tracks which hadith uses this transmission link)
- **HAS_CHAIN** (hadith → person)
  - Links hadith to first narrator in its chain

### Why This Design
- Narrator IDs from source website solve disambiguation naturally (no need for complex LLM parsing)
- NARRATED_FROM edges form the transmission network across multiple hadiths
- Multiple hadiths can share narrator relationships, creating a dense network
- HAS_CHAIN provides entry point into each hadith's transmission chain
- Book/chapter metadata enables filtering and categorical analysis

## Tech Stack
- **Graph DB**: Neo4j Community Edition (Docker)
- **Data Source**: [hadith.islam-db.com](https://hadith.islam-db.com)
- **Scraper**: Python + BeautifulSoup (extracts narrator details + chains directly from HTML)
- **Backend**: Python + neo4j driver
- **Data format**: JSON intermediate format before loading to Neo4j

## Data Pipeline
```
1. Scrape hadiths → src/scraper.py
   ├─ Extract narrator chains with IDs
   ├─ Extract narrator details (name, fame, rank)
   └─ Extract book/chapter metadata from breadcrumb

2. Store in JSON → data/Sahih_Al-Bukhari/bukhari_hadiths.json

3. Load to Neo4j → src/loader.py
   ├─ Create Person nodes for all narrators
   ├─ Create Hadith nodes with metadata
   ├─ Create NARRATED_FROM edges between consecutive narrators
   └─ Create HAS_CHAIN edges from hadith to first narrator

4. Query → Neo4j Browser or custom interface
```

## Project Structure
```
isnad-graph-db/
├── src/
│   ├── __init__.py
│   ├── scraper.py       # Web scraping logic
│   └── loader.py        # Neo4j loading logic
├── data/
│   └── Sahih_Al-Bukhari/
│       └── bukhari_hadiths.json
├── main.py              # Entry point
├── playground.ipynb     # Experimentation notebook
├── docker-compose.yml   # Neo4j setup
└── README.md
```

## Getting Started

### 1. Start Neo4j
```bash
docker-compose up -d
```

### 2. Scrape Hadiths (Optional - already scraped)
```python
from src.scraper import scrape_bukhari_bulk

hadiths = scrape_bukhari_bulk(
    max_hadiths=7031,
    output_file="data/Sahih_Al-Bukhari/bukhari_hadiths.json"
)
```

### 3. Load to Neo4j
```python
from src.loader import load_to_neo4j

load_to_neo4j(hadiths_file="data/Sahih_Al-Bukhari/bukhari_hadiths.json")
```

Or simply run:
```bash
python main.py
```

### 4. Query the Graph
Open Neo4j Browser at `http://localhost:7474`

Example queries:
```cypher
// Find most connected narrators
MATCH (n:Person)
OPTIONAL MATCH (n)-[:NARRATED_FROM]->()
WITH n, COUNT(*) as out_count
OPTIONAL MATCH ()-[:NARRATED_FROM]->(n)
WITH n, out_count, COUNT(*) as in_count
RETURN n.name, n.rank, (out_count + in_count) as connections
ORDER BY connections DESC
LIMIT 10

// Get full chain for hadith #1
MATCH (h:Hadith {number: 1})-[:HAS_CHAIN]->(first:Person)
MATCH path = (first)-[:NARRATED_FROM*]->(last:Person)
WHERE ALL(r IN relationships(path) WHERE r.hadith = 1)
  AND NOT EXISTS((last)-[:NARRATED_FROM {hadith: 1}]->())
RETURN [node in nodes(path) | node.name] as chain

// Find hadiths by chapter
MATCH (h:Hadith)
WHERE h.chapter CONTAINS "الوحي"
RETURN h.number, h.chapter, h.matn
LIMIT 5
```

## JSON Format
```json
{
  "hadith_number": 1,
  "book": "صحيح البخاري",
  "chapter": "باب بدء الوحي",
  "url": "https://hadith.islam-db.com/single-book/146/...",
  "chain": [
    {"id": "4698", "name": "الْحُمَيْدِيُّ عَبْدُ اللَّهِ بْنُ الزُّبَيْرِ"},
    {"id": "3443", "name": "سُفْيَانُ"}
  ],
  "narrator_details": [
    {
      "id": "4698",
      "name": "الْحُمَيْدِيُّ عَبْدُ اللَّهِ بْنُ الزُّبَيْرِ",
      "fame": "الحميدي عبد الله بن الزبير",
      "rank": "ثقة حافظ أجل أصحاب ابن عيينة"
    }
  ],
  "matn": "إِنَّمَا الْأَعْمَالُ بِالنِّيَّاتِ...",
  "full_text": "حَدَّثَنَا الْحُمَيْدِيُّ..."
}
```

## Current Status
- ✅ narrator & hadith Web scraper
- ✅ Neo4j loader with complete narrator network
- ✅ Full Sahih Bukhari dataset (7,031 hadiths)
- ✅ Analysis queries and visualization
- ✅ Web interface for queries (planned)

## Future Enhancements
- Add SON_OF edges if genealogical data becomes available
- More collections (Muslim, Abu Dawud, etc.)
- Advanced graph analytics (centrality metrics, community detection)
- Narration method tagging (حدثنا vs أخبرنا vs عن)

## Data Source
All hadith data scraped from: [hadith.islam-db.com](https://hadith.islam-db.com)