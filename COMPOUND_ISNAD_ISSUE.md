# Compound Isnad Issue

## Problem
Some hadiths (e.g., hadith #995) have more narrators in `narrator_details` than in the `chain`. This occurs with **compound isnads** - hadiths transmitted through multiple paths.

## Example: Hadith 995
- **Chain length**: Unknown (need to verify)
- **Narrator details**: 16 narrators
- **Issue**: Duplicates appear (e.g., "الْحَسَنِ" ID 1239 appears multiple times)

## Root Cause
The scraper extracts data from two sources:

1. **Chain** (`chain` field): Extracted from inline narrator links in hadith text
   - Shows the primary/linear transmission path
   - Format: `<a class="rawy" id="123">narrator</a>`

2. **Narrator Details** (`narrator_details` field): Extracted from narrator table
   - Shows ALL narrators from ALL transmission branches
   - Includes compound/variant paths
   - May have duplicates when narrator appears in multiple branches

## Impact
- **Database**: Creates incorrect relationships between narrators
- **Visualization**: Shows tangled graph with self-loops or duplicate connections
- **Analysis**: Inflates narrator connection counts

## Verification
Check hadith 995:
```python
import json
with open('data/Sahih_Al-Bukhari/bukhari_hadiths.json') as f:
    data = json.load(f)
    h995 = [h for h in data if h['hadith_number'] == 995][0]
    print(f"Chain length: {len(h995['chain'])}")
    print(f"Narrator details: {len(h995['narrator_details'])}")
    print(f"Chain: {[n['name'] for n in h995['chain']]}")
    print(f"Details: {[n['name'] for n in h995['narrator_details']]}")
```

## Possible Solutions

### Option 1: Use only chain field (Quick fix)
**Pros**:
- Simple - just ignore narrator_details table
- Represents single clear transmission path
- No duplicates

**Cons**:
- Loses information about variant narrations
- Missing detailed narrator info (rank, fame, etc.)

### Option 2: Fix scraper to detect compound isnads
**Approach**:
- Parse hadith text to identify branching points (words like "و" between narrator names)
- Create separate chains for each branch
- Store multiple chains per hadith

**Pros**:
- Accurate representation
- Preserves all transmission paths

**Cons**:
- Complex scraper logic
- Database schema changes needed
- UI needs to handle multiple chains

### Option 3: Add UI warning for compound isnads
**Approach**:
- Detect when `len(narrator_details) > len(chain) + threshold`
- Show notice: "This hadith has variant narrations"
- Display warning in graph view

**Pros**:
- No scraper changes
- Acknowledges the issue
- Simple implementation

**Cons**:
- Doesn't fix underlying data issue
- Graph still shows incorrect relationships

## Recommendation
**Short term**: Option 3 - Add UI warning for compound isnads
**Long term**: Option 2 - Fix scraper to properly handle variant chains

## Implementation for Option 3

### Backend: Add compound_isnad flag
```python
# In loader.py or as a migration script
for hadith in hadiths:
    is_compound = len(hadith['narrator_details']) > len(hadith['chain']) + 2
    # Store flag in hadith node
```

### Frontend: Show warning
```tsx
{hadith.is_compound_isnad && (
  <div className="bg-amber-100 border-l-4 border-amber-500 p-4 mb-4">
    <p className="text-amber-800">
      ⚠️ هذا الحديث له طرق متعددة (إسناد مركب)
    </p>
  </div>
)}
```

## Files to Modify
- `src/scraper.py`: Detection logic (if fixing scraper)
- `src/loader.py`: Add compound_isnad flag
- `backend/app/models/hadith.py`: Add is_compound field
- `backend/app/routers/hadiths.py`: Return flag in API
