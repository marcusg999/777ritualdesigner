'use client';

import { useState, useEffect } from 'react';
import type { CorrespondenceResult } from '@/lib/types';
import { getSavedResults, deleteResult } from '@/lib/storage';
import CorrespondenceCard from '@/components/CorrespondenceCard';
import RitualOutline from '@/components/RitualOutline';

export default function SavedPage() {
  const [results, setResults] = useState<CorrespondenceResult[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    setResults(getSavedResults());
  }, []);

  const handleDelete = (query: string) => {
    deleteResult(query);
    setResults(getSavedResults());
    if (expanded === query) setExpanded(null);
  };

  if (results.length === 0) {
    return (
      <div className="text-center py-24 space-y-4">
        <div className="text-6xl text-gold opacity-25">✦</div>
        <h2 className="text-2xl font-display text-foreground/55">No Saved Rituals</h2>
        <p className="text-foreground/40">Generate a ritual and save it to keep it in your grimoire.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="pt-4">
        <p className="eyebrow text-gold/60">Your Grimoire</p>
        <h1 className="display-title text-4xl sm:text-5xl mt-3">
          <span className="gilt">Saved Rituals</span>
        </h1>
        <p className="text-foreground/55 mt-3 text-lg">
          {results.length} ritual{results.length !== 1 ? 's' : ''} kept for return.
        </p>
      </header>

      <div className="space-y-4">
        {results.map((result) => (
          <div key={result.query} className="card">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="font-display text-gold font-semibold text-lg truncate">&ldquo;{result.query}&rdquo;</h3>
                <div className="flex flex-wrap gap-2 mt-2">
                  {result.matchedIntent && (
                    <span className="chip">{result.matchedIntent.label}</span>
                  )}
                  {result.matchedEntities.map((e) => (
                    <span key={e.id} className="tag">{e.name}</span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setExpanded(expanded === result.query ? null : result.query)}
                  className="btn-ghost px-3 py-1.5"
                >
                  {expanded === result.query ? 'Collapse' : 'Expand'}
                </button>
                <button
                  onClick={() => handleDelete(result.query)}
                  className="btn-ghost px-3 py-1.5"
                  style={{ color: '#e07a7a', borderColor: 'color-mix(in srgb, #e07a7a 28%, transparent)' }}
                >
                  Delete
                </button>
              </div>
            </div>

            {expanded === result.query && (
              <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                <CorrespondenceCard correspondences={result.correspondences} enrichment={result.enrichment} />
                <RitualOutline steps={result.ritualOutline} disclaimer={result.disclaimer} enrichment={result.enrichment} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
