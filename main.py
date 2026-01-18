import requests
from bs4 import BeautifulSoup
import json
import time
from neo4j import GraphDatabase


def scrape_hadith(hadith_num: int) -> dict:
    """Scrape hadith from islam-db.com"""

    # URL pattern - you'll need to figure out the chapter ID (97663 in your example)
    # For now, let's try with direct hadith number
    url = f"https://hadith.islam-db.com/single-book/146/صحيح-البخاري/97663/{hadith_num}"

    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
    except Exception as e:
        print(f"Failed to fetch hadith {hadith_num}: {e}")
        return None

    soup = BeautifulSoup(response.content, 'html.parser')

    # Extract isnad with narrators
    hadith_text = soup.find('p', class_='more-height')
    if not hadith_text:
        return None

    # Extract narrator links from isnad
    narrator_links = hadith_text.find_all('a', class_='rawy')

    chain = []
    for link in narrator_links:
        narrator_id = link.get('id')
        narrator_name = link.text.strip()
        chain.append({
            'name': narrator_name,
            'id': narrator_id
        })

    # Extract narrator details from table
    narrator_table = soup.find('table', class_='table-striped')
    narrator_details = []

    if narrator_table:
        rows = narrator_table.find_all('tr')[1:]  # Skip header
        for row in rows:
            cols = row.find_all('td')
            if len(cols) >= 3:
                name_cell = cols[0]
                link = name_cell.find('a')

                narrator_details.append({
                    'name': link.text.strip() if link else '',
                    'id': link.get('data-id') if link else '',
                    'fame': cols[1].text.strip(),
                    'rank': cols[2].text.strip()
                })

    # Extract matn
    matn_tag = hadith_text.find('a', class_='matn')
    matn = matn_tag.text.strip() if matn_tag else ""

    # Full text
    full_text = hadith_text.get_text(strip=True)

    return {
        'hadith_number': hadith_num,
        'url': url,
        'chain': chain,
        'narrator_details': narrator_details,
        'matn': matn,
        'full_text': full_text
    }

def scrape_bukhari_range(start: int, end: int, output_file: str = 'golden_dataset.json'):
    """Scrape range of hadiths and save"""

    results = []

    for num in range(start, end + 1):
        print(f"Scraping hadith {num}...")
        hadith = scrape_hadith(num)

        if hadith:
            results.append(hadith)
            print(f"  ✓ Got {len(hadith['chain'])} narrators")
        else:
            print(f"  ✗ Failed")

        # Be nice to the server
        time.sleep(1)

    # Save
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    print(f"\n✅ Scraped {len(results)} hadiths → {output_file}")

# 1. Scrape all hadiths (or start with 100)
def scrape_bukhari_bulk(max_hadiths=100):
    """Scrape Bukhari hadiths"""
    results = []

    for num in range(1, max_hadiths + 1):
        print(f"Scraping {num}/{max_hadiths}...")
        hadith = scrape_hadith(num)

        if hadith:
            results.append(hadith)

        time.sleep(0.5)  # Be nice

    with open('bukhari_hadiths.json', 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    return results

# 2. Load into Neo4j
def load_to_neo4j(hadiths_file='bukhari_hadiths.json'):
    """Load scraped hadiths into Neo4j"""

    driver = GraphDatabase.driver("bolt://localhost:7687", auth=("neo4j", "password123"))

    with open(hadiths_file, 'r', encoding='utf-8') as f:
        hadiths = json.load(f)

    with driver.session() as session:
        # Create narrators
        for hadith in hadiths:
            for narrator in hadith['narrator_details']:
                session.run("""
                    MERGE (n:Person {id: $id})
                    SET n.name = $name,
                        n.fame = $fame,
                        n.rank = $rank,
                        n.is_narrator = true
                """,
                id=narrator['id'],
                name=narrator['name'],
                fame=narrator['fame'],
                rank=narrator['rank']
                )

        # Create hadiths and chains
        for hadith in hadiths:
            # Create hadith node
            session.run("""
                CREATE (h:Hadith {
                    number: $number,
                    matn: $matn,
                    full_text: $full_text
                })
            """,
            number=hadith['hadith_number'],
            matn=hadith['matn'],
            full_text=hadith['full_text']
            )

            # Create NARRATED_FROM edges (chain order)
            chain = hadith['chain']
            for i in range(len(chain) - 1):
                session.run("""
                    MATCH (n1:Person {id: $id1})
                    MATCH (n2:Person {id: $id2})
                    MERGE (n1)-[:NARRATED_FROM]->(n2)
                """,
                id1=chain[i]['id'],
                id2=chain[i+1]['id']
                )

            # Link hadith to first narrator
            if chain:
                session.run("""
                    MATCH (h:Hadith {number: $hadith_num})
                    MATCH (n:Person {id: $narrator_id})
                    MERGE (h)-[:HAS_CHAIN]->(n)
                """,
                hadith_num=hadith['hadith_number'],
                narrator_id=chain[0]['id']
                )

    driver.close()
    print(f"✅ Loaded {len(hadiths)} hadiths to Neo4j")

# Run
if __name__ == "__main__":
    # Scrape first 100 hadiths
    hadiths = scrape_bukhari_bulk(7031)

    # Load to Neo4j
    load_to_neo4j()