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
        <div className="text-6xl opacity-20">✦</div>
        <h2 className="text-2xl font-serif text-foreground/50">No Saved Rituals</h2>
        <p className="text-foreground/30 text-sm">Generate a ritual and save it to see it here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif text-gold font-bold mb-2">✦ Saved Rituals</h1>
        <p className="text-foreground/50">{results.length} saved ritual{results.length !== 1 ? 's' : ''}</p>
      </div>

      <div className="space-y-4">
        {results.map((result) => (
          <div key={result.query} className="card">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="font-serif text-gold font-semibold text-lg truncate">"{result.query}"</h3>
                <div className="flex flex-wrap gap-2 mt-1">
                  {result.matchedIntent && (
                    <span className="text-xs px-2 py-0.5 bg-gold/10 border border-gold/20 rounded text-gold/80">
                      {result.matchedIntent.label}
                    </span>
                  )}
                  {result.matchedEntities.map((e) => (
                    <span key={e.id} className="text-xs px-2 py-0.5 bg-white/5 border border-white/10 rounded text-foreground/50">
                      {e.name}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setExpanded(expanded === result.query ? null : result.query)}
                  className="px-3 py-1.5 text-xs border border-white/10 rounded-lg text-foreground/50 hover:text-foreground hover:border-white/20 transition-colors"
                >
                  {expanded === result.query ? 'Collapse' : 'Expand'}
                </button>
                <button
                  onClick={() => handleDelete(result.query)}
                  className="px-3 py-1.5 text-xs border border-red-500/20 rounded-lg text-red-400/60 hover:text-red-400 hover:border-red-500/40 transition-colors"
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
