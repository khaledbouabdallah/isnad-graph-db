"""Scraper module for extracting hadiths from hadith.islam-db.com"""

import requests
from bs4 import BeautifulSoup
import json
import time
from typing import Dict, Optional


def scrape_hadith(hadith_num: int) -> Optional[Dict]:
    """Scrape hadith with full metadata from islam-db.com

    Args:
        hadith_num: Hadith number to scrape

    Returns:
        Dict containing hadith data including book, chapter, chain, and text
    """
    url = f"https://hadith.islam-db.com/single-book/146/صحيح-البخاري/97663/{hadith_num}"

    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
    except Exception as e:
        print(f"Failed to fetch hadith {hadith_num}: {e}")
        return None

    soup = BeautifulSoup(response.content, "html.parser")

    # Extract book and chapter from breadcrumb
    breadcrumb = soup.find("ol", class_="breadcrumb")
    book_name = ""
    chapter_name = ""

    if breadcrumb:
        # Get book name (second link in breadcrumb)
        book_link = breadcrumb.find_all("a", class_="white-color")
        if len(book_link) >= 2:
            book_name = book_link[1].text.strip()

        # Get chapter name (last item, marked as 'active')
        chapter_item = breadcrumb.find("li", class_="active")
        if chapter_item:
            chapter_name = chapter_item.text.strip()

    # Fallback: try to get chapter from heading if breadcrumb failed
    if not chapter_name:
        chapter_heading = soup.find("h2", class_="text-info")
        if chapter_heading:
            chapter_name = chapter_heading.text.strip()

    # Extract hadith text with narrators
    hadith_text = soup.find("p", class_="more-height")
    if not hadith_text:
        return None

    # Extract narrator links from chain
    narrator_links = hadith_text.find_all("a", class_="rawy")
    chain = []
    for link in narrator_links:
        narrator_id = link.get("id")
        narrator_name = link.text.strip()
        chain.append({"name": narrator_name, "id": narrator_id})

    # Extract narrator details from table
    narrator_table = soup.find("table", class_="table-striped")
    narrator_details = []

    if narrator_table:
        rows = narrator_table.find_all("tr")[1:]  # Skip header
        for row in rows:
            cols = row.find_all("td")
            if len(cols) >= 3:
                name_cell = cols[0]
                link = name_cell.find("a")

                narrator_details.append(
                    {
                        "name": link.text.strip() if link else "",
                        "id": link.get("data-id") if link else "",
                        "fame": cols[1].text.strip(),
                        "rank": cols[2].text.strip(),
                    }
                )

    # Extract matn (core hadith text)
    matn_tag = hadith_text.find("a", class_="matn")
    matn = matn_tag.text.strip() if matn_tag else ""

    # Full text (including isnad)
    full_text = hadith_text.get_text(strip=True)

    return {
        "hadith_number": hadith_num,
        "book": book_name,
        "chapter": chapter_name,
        "url": url,
        "chain": chain,
        "narrator_details": narrator_details,
        "matn": matn,
        "full_text": full_text,
    }


def scrape_bukhari_bulk(
    max_hadiths: int, output_file: str = "bukhari_hadiths.json", delay: float = 0.5
):
    """Scrape multiple Bukhari hadiths

    Args:
        max_hadiths: Number of hadiths to scrape (starting from 1)
        output_file: Output JSON file path
        delay: Delay between requests in seconds (be nice to the server)

    Returns:
        List of scraped hadith dictionaries
    """
    results = []

    for num in range(1, max_hadiths + 1):
        print(f"Scraping {num}/{max_hadiths}...")
        hadith = scrape_hadith(num)

        if hadith:
            results.append(hadith)
            print(f"  ✓ Book: {hadith['book']}, Chapter: {hadith['chapter'][:50]}...")
        else:
            print(f"  ✗ Failed")

        time.sleep(delay)

    # Save results
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    print(f"\n✅ Scraped {len(results)} hadiths → {output_file}")
    return results
