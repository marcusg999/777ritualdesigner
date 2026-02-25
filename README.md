# 777✦ Ritual Designer

A sleek, dark-themed Progressive Web App for designing ritual outlines and exploring occult correspondences across world traditions. Built with Next.js 16 App Router, TypeScript, Tailwind CSS, and next-themes.

---

## Features

- **Correspondence Generator** — Enter any desire, concept, or deity name to receive matching symbolic correspondences: colors, stones, herbs, metals, scents, timing, element, sphere, planet, zodiac, tarot cards, rune associations, and numerology.
- **Ritual Outline** — A 7-step ritual framework generated from your query, grounded in your correspondences.
- **Entity & Intent Library** — Browse 50+ deities, angels, and archetypes across Greek, Egyptian, Norse, Celtic, Sumerian, Hindu, Abrahamic, and Goetia traditions. Filter by tradition.
- **Fuzzy Matching** — Levenshtein-based similarity matching across 80+ intents and entities.
- **AI Enrichment (Stub)** — Toggle on "Hybrid Mode" to receive additional symbolic insights and steps from the enrichment endpoint.
- **Pop Culture Archetypes** — Optional toggle to include archetypal figures from modern mythology.
- **Cultural Respect Notice** — Dismissable banner highlighting initiatory traditions (Ifá, Vodou) not appropriate to replicate without proper training.
- **Save Rituals** — Save and review ritual results locally via `localStorage`.
- **PWA** — Web App Manifest with icons for installable app experience.
- **Dark/Light Mode** — Elegant dark theme (default) with gold accents, togglable via next-themes.

---

## Setup

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server (Turbopack) |
| `npm run build` | Create optimized production build |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm test` | Run Jest test suite |

---

## Architecture

```
src/
  app/
    layout.tsx              # Root layout: ThemeProvider, Navigation, dark mode
    page.tsx                # Home: query input, toggles, results display
    library/page.tsx        # Browse entities & intents with filtering
    saved/page.tsx          # View & manage saved rituals (localStorage)
    api/
      enrich/route.ts       # POST /api/enrich — AI enrichment endpoint (stub)
  components/
    Navigation.tsx          # Top nav with logo, links, and theme toggle
    ThemeToggle.tsx         # Dark/light mode button
    CorrespondenceCard.tsx  # Grid display of all correspondence data
    RitualOutline.tsx       # Numbered step-by-step ritual outline
    CulturalContextBanner.tsx # Dismissable cultural respect notice
  lib/
    types.ts                # All TypeScript interfaces
    matcher.ts              # Fuzzy query matching (Levenshtein + token similarity)
    normalizer.ts           # Converts MatchResult → CorrespondenceResult
    enrichment.ts           # EnrichmentProvider interface + StubEnrichmentProvider
    storage.ts              # localStorage helpers for saving/loading rituals
  data/
    intents.json            # 80+ intention archetypes
    entities.json           # 55+ deities, angels, demons, archetypes
    correspondences.json    # Correspondence mappings by intentId or entityId
  __tests__/
    matcher.test.ts         # Tests for stringSimilarity & matchQuery
    normalizer.test.ts      # Tests for normalizeResult
```

---

## Dataset Structure

### Intents (`src/data/intents.json`)
```json
{
  "id": "love",
  "label": "Love & Romance",
  "tags": ["love", "romance", "relationship"],
  "description": "Attracting or deepening romantic love",
  "tradition": "universal"
}
```

### Entities (`src/data/entities.json`)
```json
{
  "id": "aphrodite",
  "name": "Aphrodite",
  "tradition": "Greek",
  "type": "deity",
  "description": "Greek goddess of love, beauty, and desire.",
  "tags": ["love", "beauty", "Venus"],
  "sphere": "Venus"
}
```

### Correspondences (`src/data/correspondences.json`)
```json
{
  "intentId": "love",
  "colors": ["rose", "red", "pink"],
  "stones": ["rose quartz", "ruby"],
  "herbs": ["rose petals", "damiana"],
  "metals": ["copper", "gold"],
  "scents": ["rose", "jasmine"],
  "timing": "Friday, waxing or full moon",
  "element": "Water",
  "sphere": "Venus",
  "planet": "Venus",
  "tarotCards": ["The Lovers", "Two of Cups"],
  "runeAssociations": ["Gebo", "Wunjo"],
  "numerology": 6
}
```

---

## Ethical Approach

- All entity descriptions are **original, neutral, and non-sensational**.
- Text content does **not** reproduce copyrighted occult tables verbatim.
- A **cultural respect banner** is displayed by default, noting that some traditions (Ifá, Vodou) contain practices not appropriate to replicate without initiation.
- The built-in disclaimer reads: *"This tool offers symbolic inspiration for personal reflection. No outcomes are guaranteed. Always approach spiritual practices with respect for their cultural origins."*

---

## Deployment (Vercel)

1. Push to GitHub.
2. Import the repository into [Vercel](https://vercel.com).
3. No additional environment variables are required for the stub enrichment provider.
4. For production AI enrichment, implement a real `EnrichmentProvider` in `src/lib/enrichment.ts` and add your API key as a Vercel environment variable.

---

## PWA Notes

A `public/manifest.json` and placeholder icons in `public/icons/` are included. For full offline support, add `next-pwa` configuration to `next.config.ts` once your deployment environment is confirmed. The `next-pwa` package is already installed.

---

## License

MIT
