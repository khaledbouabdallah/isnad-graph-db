# Side Panel UI Refactoring

Complete UX overhaul replacing dedicated pages with interactive side panels and enhanced graph features.

## Overview

Transformed the application from a traditional multi-page layout to a modern single-page experience with side panels, enabling seamless exploration without losing context.

## ✅ Changes Implemented

### 1. NarratorSidePanel Component
**File**: `frontend/src/components/ui/NarratorSidePanel.tsx`

**Features**:
- Smooth slide-in animation from right
- Displays narrator details (fame, birth/death years, rank)
- Shows statistics (total hadiths, teachers, students)
- Color-coded sections:
  - Teachers (blue) - "روى عن"
  - Students (green) - "روى عنه"
- Toggleable (can be hidden/shown)
- Backdrop overlay for focus

**Usage**:
```tsx
<NarratorSidePanel
  narratorId={selectedNarratorId}
  isOpen={isPanelOpen}
  onClose={() => setIsPanelOpen(false)}
/>
```

---

### 2. HadithSidePanel Component
**File**: `frontend/src/components/ui/HadithSidePanel.tsx`

**Features**:
- Displays hadith details (number, book, chapter)
- Shows matn (hadith text) with proper formatting
- Displays isnad chain list
- Triggers chain animation callback
- Responsive width (full on mobile, 600px on desktop)

**Usage**:
```tsx
<HadithSidePanel
  hadithNumber={selectedHadithNumber}
  isOpen={isPanelOpen}
  onClose={() => setIsPanelOpen(false)}
  onChainAnimate={handleChainAnimate}
/>
```

---

### 3. Explorer Page Enhancements
**File**: `frontend/src/app/explore/page.tsx`

**New Features**:
- **Narrator Search Bar**: Search by fame with real-time results
  - Debounced search (300ms delay)
  - Dropdown with narrator results
  - Uses normalized Arabic text for matching
- **Click to View**: Clicking graph nodes opens side panel instead of navigating
- **Search Integration**: Clicking search results opens side panel and highlights node

**Search Flow**:
1. User types narrator name (with or without diacritics)
2. API searches using normalized text
3. Results appear in dropdown
4. Click opens side panel with full details

---

### 4. Directional Edge Highlighting
**Files**:
- `frontend/src/lib/graph-config.ts`
- `frontend/src/components/graph/NetworkGraph.tsx`

**New Color Scheme**:
- **Blue (#3B82F6)**: "Narrated From" (outgoing edges) - روى عن
- **Green (#10B981)**: "Narrated To" (incoming edges) - روى عنه

**Behavior**:
- When hovering a narrator node:
  - Outgoing edges (teachers) = Blue
  - Incoming edges (students) = Green
  - Makes transmission direction visually clear

**Implementation**:
```typescript
if (source === hovered) {
  res.color = EDGE_STYLES.narratedFrom; // Blue - narrated from
} else {
  res.color = EDGE_STYLES.narratedTo; // Green - narrated to
}
```

---

### 5. Hadiths Page with Split View
**File**: `frontend/src/app/hadiths/page.tsx`

**Layout**:
- **Left Column**: Hadith list (scrollable)
- **Right Column**: Chain visualization (sticky)

**Features**:
- Click hadith card to:
  1. Open side panel with full details
  2. Trigger chain animation in graph
  3. Display chain in sticky visualization
- Split view on desktop, stacked on mobile
- Persistent chain view while scrolling hadith list

---

### 6. Chain Animation System
**File**: `frontend/src/components/graph/NetworkGraph.tsx`

**Animation Flow**:
1. Hadith selected → chain passed to graph
2. Sequential node animation (like a signal)
3. Each node pulses gold for 300ms
4. Proceeds to next node in chain
5. Returns to original state after completion

**Visual Effect**:
- Node size doubles temporarily
- Color changes to gold (#F59E0B)
- Creates "flowing" effect through transmission path

**Code**:
```typescript
animateChain: (chain: Array<{ id: number }>) => {
  // Pulse each node sequentially
  // Size × 2, Color = Gold, Duration = 300ms
  // Creates signal-like flow through chain
}
```

---

### 7. Updated Components

**HadithCard** (`frontend/src/components/ui/HadithCard.tsx`):
- Removed `Link` wrapper
- Added `onClick` prop
- Changed to `div` with cursor-pointer
- Maintains hover effects

**Component Exports** (`frontend/src/components/ui/index.ts`):
- Added `NarratorSidePanel`
- Added `HadithSidePanel`

---

## User Experience Improvements

### Before
- Click narrator → Navigate to `/narrator/[id]` → Lost graph context
- Click hadith → Navigate to `/hadith/[id]` → Lost list context
- No visual connection direction
- No search in explorer

### After
- Click narrator → Side panel opens → Graph remains visible
- Click hadith → Side panel opens + chain animates
- Blue/green edges show transmission direction
- Search narrators directly in explorer
- Split view keeps both list and visualization visible

---

## Color Coding Summary

| Element | Color | Meaning |
|---------|-------|---------|
| Blue Edges | #3B82F6 | Narrated From (outgoing) |
| Green Edges | #10B981 | Narrated To (incoming) |
| Blue Sections | Blue backgrounds | Teachers (شيوخ) |
| Green Sections | Green backgrounds | Students (تلاميذ) |
| Gold Pulse | #F59E0B | Chain animation |

---

## Technical Implementation

### State Management
```typescript
// Explorer
const [selectedNarratorId, setSelectedNarratorId] = useState<number | null>(null);
const [isPanelOpen, setIsPanelOpen] = useState(false);
const [searchQuery, setSearchQuery] = useState("");
const [searchResults, setSearchResults] = useState<Narrator[]>([]);

// Hadiths
const [selectedHadithNumber, setSelectedHadithNumber] = useState<number | null>(null);
const [selectedHadithChain, setSelectedHadithChain] = useState<Array<{ id: number }>>([]);
```

### Animation System
```typescript
// Graph ref with animation method
const graphRef = useRef<NetworkGraphRef>(null);

// Trigger animation
graphRef.current?.animateChain(chain);
```

### Search Debouncing
```typescript
useEffect(() => {
  if (!searchQuery || searchQuery.length < 2) return;
  const debounce = setTimeout(searchNarrators, 300);
  return () => clearTimeout(debounce);
}, [searchQuery]);
```

---

## Preserved Pages

The following pages still exist for direct access:
- `/narrator/[id]` - Direct narrator links (backward compatibility)
- `/hadith/[id]` - Direct hadith links (backward compatibility)
- `/narrators` - Narrator list page (still useful for browsing)

However, the primary UX now flows through:
- `/explore` + NarratorSidePanel
- `/hadiths` + HadithSidePanel

---

## Files Modified

### New Files
1. `frontend/src/components/ui/NarratorSidePanel.tsx`
2. `frontend/src/components/ui/HadithSidePanel.tsx`

### Modified Files
1. `frontend/src/app/explore/page.tsx` - Added search + side panel
2. `frontend/src/app/hadiths/page.tsx` - Added split view + chain animation
3. `frontend/src/components/graph/NetworkGraph.tsx` - Added directional edges + chain animation
4. `frontend/src/components/ui/HadithCard.tsx` - Changed to onClick instead of Link
5. `frontend/src/components/ui/index.ts` - Exported new components
6. `frontend/src/lib/graph-config.ts` - Added directional edge colors

---

## Testing Checklist

- [ ] Click narrator in explorer → Side panel opens with details
- [ ] Search narrator by fame → Results appear → Click opens panel
- [ ] Hover narrator node → Blue edges (teachers), Green edges (students)
- [ ] Click hadith card → Side panel opens
- [ ] Hadith selection → Chain animates in graph (gold pulse effect)
- [ ] Side panels close on backdrop click
- [ ] Side panels close on X button
- [ ] Mobile responsive (panels full width)
- [ ] Desktop responsive (panels 500-600px)
- [ ] Search works with/without diacritics (after normalization script)
- [ ] Chain animation flows sequentially through nodes

---

## Future Enhancements

1. **Graph in Hadith Side Panel**: Show mini chain graph inside panel
2. **Narrator Highlighting**: Highlight selected narrator in graph when panel opens
3. **Keyboard Shortcuts**: ESC to close panels, arrow keys for navigation
4. **Chain Path Highlighting**: Keep chain highlighted after animation
5. **Multiple Chain Views**: For compound isnads, show all transmission paths
6. **Animation Speed Control**: Let users adjust chain animation speed
7. **Export Chain**: Download chain visualization as image

---

## Migration Notes

If you want to fully remove the old pages:
1. Delete `frontend/src/app/narrator/[id]/page.tsx`
2. Delete `frontend/src/app/hadith/[id]/page.tsx`
3. Update any remaining direct links
4. Add redirects in `next.config.ts` if needed

Current approach keeps them for backward compatibility and direct URL access.
