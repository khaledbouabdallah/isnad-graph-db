"""Scraper module for extracting hadiths from hadith.islam-db.com"""

import requests
from bs4 import BeautifulSoup
import json
import time
import re
from typing import Dict, Optional


def extract_multiple_chains(hadith_text_element):
    """
    Extract multiple chains from hadith text that may contain compound isnads.

    Args:
        hadith_text_element: BeautifulSoup element containing the hadith text

    Returns:
        List of chains, where each chain is:
        {
            "chain_type": "primary" | "variant" | "note",
            "narrators": [{"name": str, "id": str}, ...],
            "marker": str | None  # The marker that introduced this variant (if any)
        }
    """
    # Compound isnad markers - order matters (check specific before general)
    MARKERS = [
        'وَلَمْ يَذْكُرْ',  # "and did not mention" - variation note
        'وَرَوَاهُ',        # "and narrated it" - variant chain
        'وَتَابَعَهُ',      # "and followed by" - variant chain
        'تَابَعَهُ',       # "followed by" - variant chain (check after وَتَابَعَهُ)
        'وَرَوَى',         # "and narrated" - variant chain
        'وَقَالَ',         # "and said" - can introduce variants
    ]

    html_str = str(hadith_text_element)

    # Check if any markers exist in the text
    has_any_marker = any(marker in html_str for marker in MARKERS)

    # Find matn tag position (if exists)
    matn_tag = hadith_text_element.find("a", class_="matn")
    matn_end_pos = None

    if matn_tag:
        matn_str = str(matn_tag)
        matn_pos = html_str.find(matn_str)
        matn_end_pos = matn_pos + len(matn_str)

    # Determine primary chain end position
    if has_any_marker:
        # Find first marker position
        first_marker_pos = len(html_str)
        for marker in MARKERS:
            pos = html_str.find(marker)
            if pos != -1:
                first_marker_pos = min(first_marker_pos, pos)

        # Primary chain ends at first marker (variants can appear before or after matn)
        primary_end = first_marker_pos
    elif matn_end_pos:
        # No markers, so primary chain is everything up to matn end
        primary_end = matn_end_pos
    else:
        # No markers, no matn - entire text is primary chain
        primary_end = len(html_str)

    # Extract primary chain
    primary_html = html_str[:primary_end]
    primary_soup = BeautifulSoup(primary_html, 'html.parser')
    primary_links = primary_soup.find_all("a", class_="rawy")

    # Deduplicate primary chain
    seen_ids = set()
    primary_narrators = []
    for link in primary_links:
        narrator_id = link.get("id")
        if narrator_id and narrator_id not in seen_ids:
            seen_ids.add(narrator_id)
            primary_narrators.append({
                "name": link.text.strip(),
                "id": narrator_id
            })

    chains = [{
        "chain_type": "primary",
        "narrators": primary_narrators,
        "marker": None
    }]

    # Extract variant chains from text after primary
    remaining_html = html_str[primary_end:]

    # Find all marker positions in remaining text
    marker_positions = []
    for marker in MARKERS:
        pos = 0
        while True:
            pos = remaining_html.find(marker, pos)
            if pos == -1:
                break
            marker_positions.append((pos, marker))
            pos += len(marker)

    # Sort by position
    marker_positions.sort(key=lambda x: x[0])

    # Extract chains between markers
    for i, (pos, marker) in enumerate(marker_positions):
        # Find end of this segment (next marker or end of string)
        if i + 1 < len(marker_positions):
            segment_end = marker_positions[i + 1][0]
        else:
            segment_end = len(remaining_html)

        # Extract segment
        segment_start = pos + len(marker)
        segment_html = remaining_html[segment_start:segment_end]
        segment_soup = BeautifulSoup(segment_html, 'html.parser')
        variant_links = segment_soup.find_all("a", class_="rawy")

        # Deduplicate and collect narrators
        variant_ids = set()
        variant_narrators = []
        for link in variant_links:
            narrator_id = link.get("id")
            if narrator_id and narrator_id not in variant_ids:
                variant_ids.add(narrator_id)
                variant_narrators.append({
                    "name": link.text.strip(),
                    "id": narrator_id
                })

        # Determine chain type based on marker
        if 'يَذْكُرْ' in marker:
            chain_type = "note"
        elif 'قَالَ' in marker:
            # وَقَالَ can be a variant or just a comment, check if it has narrators
            chain_type = "variant" if variant_narrators else "note"
        else:
            chain_type = "variant"

        # Only add if we found narrators
        if variant_narrators:
            chains.append({
                "chain_type": chain_type,
                "narrators": variant_narrators,
                "marker": marker
            })

    return chains


def extract_years_from_fame(fame: str | None) -> tuple[str, int | None, int | None]:
    """
    Extract cleaned fame, birth year, and death year from fame string.

    Returns:
        tuple: (cleaned_fame, birth_year, death_year)
    """
    if not fame:
        return "", None, None

    # Remove excessive whitespace (multiple spaces)
    cleaned = re.sub(r"\s+", " ", fame.strip())

    # Extract birth year: / ولد في :XX
    birth_year = None
    birth_match = re.search(r"/\s*ولد في\s*:(\d+)", cleaned)
    if birth_match:
        birth_year = int(birth_match.group(1))
        # Remove the birth year part from cleaned fame
        cleaned = re.sub(r"/\s*ولد في\s*:\d+", "", cleaned)

    # Extract death year: / توفي في :XX
    death_year = None
    death_match = re.search(r"/\s*توفي في\s*:(\d+)", cleaned)
    if death_match:
        death_year = int(death_match.group(1))
        # Remove the death year part from cleaned fame
        cleaned = re.sub(r"/\s*توفي في\s*:\d+", "", cleaned)

    # Final cleanup - remove extra whitespace again
    cleaned = re.sub(r"\s+", " ", cleaned.strip())
    # Remove trailing slashes
    cleaned = cleaned.rstrip("/ ").strip()

    return cleaned, birth_year, death_year


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

    # Extract multiple chains (handles compound isnads)
    chains = extract_multiple_chains(hadith_text)

    # Legacy: flatten to single chain for backward compatibility
    # (concatenate all narrators from all chains)
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

                # Extract and clean fame field
                raw_fame = cols[1].text.strip()
                cleaned_fame, birth_year, death_year = extract_years_from_fame(raw_fame)

                narrator_details.append(
                    {
                        "name": link.text.strip() if link else "",
                        "id": link.get("data-id") if link else "",
                        "fame": cleaned_fame,
                        "rank": cols[2].text.strip(),
                        "birth_year": birth_year,
                        "death_year": death_year,
                    }
                )

    # Extract matn (core hadith text)
    matn_tag = hadith_text.find("a", class_="matn")
    matn = matn_tag.text.strip() if matn_tag else ""

    # Full text (including isnad)
    full_text = hadith_text.get_text(strip=True)

    # Determine if this is a compound isnad
    is_compound = len(chains) > 1

    return {
        "hadith_number": hadith_num,
        "book": book_name,
        "chapter": chapter_name,
        "url": url,
        "chain": chain,  # Legacy: all narrators flattened
        "chains": chains,  # New: multiple chains with metadata
        "is_compound_isnad": is_compound,
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
