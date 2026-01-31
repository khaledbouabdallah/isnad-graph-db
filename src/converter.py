"""Convert existing scraped hadiths to multi-chain format using full_text analysis"""

import json
from typing import List, Dict

# Markers that indicate chain splits
MARKERS = ['وَلَمْ يَذْكُرْ', 'وَرَوَاهُ', 'وَتَابَعَهُ', 'تَابَعَهُ', 'وَقَالَ']


def deduplicate_chain(narrators: List[Dict]) -> List[Dict]:
    """
    Remove duplicate narrators from a chain while preserving order.

    Args:
        narrators: List of narrator dicts with 'id' field

    Returns:
        Deduplicated list of narrators
    """
    seen_ids = set()
    result = []
    for narrator in narrators:
        narrator_id = narrator.get('id')
        if narrator_id and narrator_id not in seen_ids:
            seen_ids.add(narrator_id)
            result.append(narrator)
    return result


def split_chains_from_json(hadith: Dict) -> List[Dict]:
    """
    Split a flat chain into multiple chains using markers in full_text.

    Algorithm:
    1. For each narrator in chain, find their position in full_text
    2. Check if any marker appears between this narrator and the previous one
    3. If marker found → start a new chain
    4. Otherwise → add to current chain
    5. Deduplicate each chain to remove repeated narrators

    Args:
        hadith: Hadith dict with 'chain' and 'full_text' fields

    Returns:
        List of chain dicts with chain_type, narrators, and marker
    """
    chain = hadith.get('chain', [])
    full = hadith.get('full_text', '')

    if not chain:
        return []

    chains = []
    current_chain = {"chain_type": "primary", "narrators": [], "marker": None}
    search_pos = 0

    for narrator in chain:
        name = narrator['name']
        pos = full.find(name, search_pos)

        if pos == -1:
            # Name not found, just add to current chain
            current_chain['narrators'].append(narrator)
            continue

        # Check for markers between previous position and this narrator
        between_text = full[search_pos:pos]
        found_marker = None
        for marker in MARKERS:
            if marker in between_text:
                found_marker = marker
                break

        if found_marker and current_chain['narrators']:
            # Deduplicate and save current chain
            current_chain['narrators'] = deduplicate_chain(current_chain['narrators'])
            chains.append(current_chain)

            # Determine chain type based on marker
            if 'يَذْكُرْ' in found_marker:
                chain_type = "note"
            else:
                chain_type = "variant"

            current_chain = {
                "chain_type": chain_type,
                "narrators": [narrator],
                "marker": found_marker
            }
        else:
            current_chain['narrators'].append(narrator)

        search_pos = pos + len(name)

    # Don't forget the last chain - deduplicate it too
    if current_chain['narrators']:
        current_chain['narrators'] = deduplicate_chain(current_chain['narrators'])
        chains.append(current_chain)

    return chains


def convert_hadith(hadith: Dict) -> Dict:
    """Convert a single hadith from old format to new multi-chain format."""

    # Extract chains using the marker-based algorithm
    chains = split_chains_from_json(hadith)

    # Determine if compound isnad
    is_compound = len(chains) > 1

    # Create new hadith dict with all original fields plus new ones
    new_hadith = {
        "hadith_number": hadith["hadith_number"],
        "book": hadith.get("book", ""),
        "chapter": hadith.get("chapter", ""),
        "url": hadith.get("url", ""),
        "chain": hadith["chain"],  # Keep legacy for backward compatibility
        "chains": chains,  # New multi-chain format
        "is_compound_isnad": is_compound,
        "narrator_details": hadith["narrator_details"],
        "matn": hadith["matn"],
        "full_text": hadith["full_text"],
    }

    # Copy any additional fields
    if "normalized_matn" in hadith:
        new_hadith["normalized_matn"] = hadith["normalized_matn"]

    return new_hadith


def convert_all_hadiths(input_file: str, output_file: str) -> Dict:
    """
    Convert all hadiths in a JSON file to multi-chain format.

    Args:
        input_file: Path to input JSON file
        output_file: Path to output JSON file

    Returns:
        Stats dict with conversion results
    """
    print(f"Loading hadiths from {input_file}...")
    with open(input_file, 'r', encoding='utf-8') as f:
        hadiths = json.load(f)

    print(f"Converting {len(hadiths)} hadiths...")
    converted = []
    stats = {
        "total": len(hadiths),
        "simple": 0,
        "compound": 0,
        "errors": 0,
        "chain_distribution": {}
    }

    for i, hadith in enumerate(hadiths):
        if i % 1000 == 0 and i > 0:
            print(f"  Processed {i}/{len(hadiths)}...")

        try:
            new_hadith = convert_hadith(hadith)
            converted.append(new_hadith)

            num_chains = len(new_hadith["chains"])
            stats["chain_distribution"][num_chains] = stats["chain_distribution"].get(num_chains, 0) + 1

            if new_hadith["is_compound_isnad"]:
                stats["compound"] += 1
            else:
                stats["simple"] += 1

        except Exception as e:
            print(f"  Error converting hadith {hadith.get('hadith_number', '?')}: {e}")
            stats["errors"] += 1
            # Keep original on error
            converted.append(hadith)

    print(f"\nConversion complete!")
    print(f"  Simple hadiths: {stats['simple']} ({stats['simple']/stats['total']*100:.1f}%)")
    print(f"  Compound hadiths: {stats['compound']} ({stats['compound']/stats['total']*100:.1f}%)")
    print(f"  Errors: {stats['errors']}")

    print(f"\nChain distribution:")
    for count in sorted(stats['chain_distribution'].keys()):
        num = stats['chain_distribution'][count]
        print(f"  {count} chain(s): {num} hadiths")

    print(f"\nSaving to {output_file}...")
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(converted, f, ensure_ascii=False, indent=2)

    print(f"✅ Saved {len(converted)} hadiths")

    return stats


if __name__ == "__main__":
    import sys

    input_file = sys.argv[1] if len(sys.argv) > 1 else "data/Sahih_Al-Bukhari/bukhari_hadiths.json"
    output_file = sys.argv[2] if len(sys.argv) > 2 else input_file  # Overwrite by default

    convert_all_hadiths(input_file, output_file)
