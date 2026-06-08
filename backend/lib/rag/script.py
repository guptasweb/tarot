buildCardFilter(['The Fool', 'The Magician'])
  buildArchetypeFilter('hero_journey')
```

- **`reranking.ts`** (Optional): Re-score results for quality
- **`hybrid-search.ts`** (Optional): Combine vector + keyword search

---

### **3. `/ingestion` - Data Pipeline**
**Purpose:** How you PUT data into the vector DB

#### **`/parsers`** - Read source files
- **`markdown-parser.ts`**: Parse `.md` files → structured objects
- **`json-parser.ts`**: Parse `.jsonl` files → structured objects

#### **`/processors`** - Transform parsed data
- **`card-processor.ts`**: 
  - Extract upright/reversed meanings
  - Add keywords, suit, arcana metadata
  - Chunk into sections

- **`combination-processor.ts`**:
  - Parse card pair/triplet data
  - Extract elemental interactions

- **`archetype-processor.ts`**:
  - Extract archetype stages
  - Link to hero's journey phases

- **`myth-processor.ts`**:
  - Extract myth narratives
  - Tag themes, characters, lessons

#### **`/validators`**
- **`schema-validator.ts`**: Ensure documents match expected structure
- **`quality-check.ts`**: Flag low-quality content (too short, missing metadata)

---

### **4. `/data` - Tarot Knowledge Corpus**

#### **`/raw`** - Source Files (NOT in git, too large)
```
.gitignore entry:
/src/lib/rag/data/raw/*
!/src/lib/rag/data/raw/.gitkeep