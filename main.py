"""Isnad Graph Database - Main entry point"""

from src.scraper import scrape_bukhari_bulk
from src.loader import load_to_neo4j, reset_database


def main():
    """Main function to scrape and load hadiths"""

    # Option 1: Scrape new hadiths
    # Uncomment to scrape (already scraped in data/Sahih_Al-Bukhari/)
    # hadiths = scrape_bukhari_bulk(
    #     max_hadiths=7031,
    #     output_file="data/Sahih_Al-Bukhari/bukhari_hadiths.json"
    # )

    # Option 2: Load existing data to Neo4j
    load_to_neo4j(hadiths_file="data/Sahih_Al-Bukhari/bukhari_hadiths.json")

    # Option 3: Reset database and reload
    # reset_database()
    # load_to_neo4j()


if __name__ == "__main__":
    main()
