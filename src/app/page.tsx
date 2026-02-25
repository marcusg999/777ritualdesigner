'use client';

import { useState, useCallback } from 'react';
import type { CorrespondenceResult, EnrichmentData } from '@/lib/types';
import CorrespondenceCard from '@/components/CorrespondenceCard';
import RitualOutline from '@/components/RitualOutline';
import CulturalContextBanner from '@/components/CulturalContextBanner';
import OfferingsCard from '@/components/OfferingsCard';
import { getOfferingsForEntities } from '@/lib/offerings';
import intentsData from '@/data/intents.json';
import entitiesData from '@/data/entities.json';
import type { Intent, Entity } from '@/lib/types';
import { matchQuery } from '@/lib/matcher';
import { normalizeResult } from '@/lib/normalizer';
import { saveResult } from '@/lib/storage';

const intents = intentsData as Intent[];
const entities = entitiesData as Entity[];

export default function HomePage() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<CorrespondenceResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [enrichment, setEnrichment] = useState<EnrichmentData | undefined>();
  const [includePopCulture, setIncludePopCulture] = useState(false);
  const [aiEnrichment, setAiEnrichment] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = useCallback(async () => {
    const q = query.trim();
    if (!q) return;

    setLoading(true);
    setError('');
    setSaved(false);
    setEnrichment(undefined);

    try {
      const match = matchQuery(q, intents, entities, includePopCulture);
      const res = normalizeResult(match, q);
      setResult(res);

      if (aiEnrichment) {
        const enrichRes = await fetch('/api/enrich', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: q, result: res }),
        });
        if (enrichRes.ok) {
          const data = await enrichRes.json() as EnrichmentData;
          setEnrichment(data);
        }
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [query, includePopCulture, aiEnrichment]);

  const handleSave = useCallback(() => {
    if (!result) return;
    const toSave = enrichment ? { ...result, enrichment } : result;
    saveResult(toSave);
    setSaved(true);
  }, [result, enrichment]);

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="text-center space-y-4 pt-6">
        <div className="text-5xl">✦</div>
        <h1 className="text-4xl sm:text-5xl font-serif text-gold font-bold tracking-tight">
          Design Your Ritual
        </h1>
        <p className="text-foreground/60 max-w-xl mx-auto text-base sm:text-lg">
          Enter an intention, deity, or concept to discover symbolic correspondences and a personalized ritual outline drawn from world traditions.
        </p>
      </div>

      {/* Cultural Banner */}
      <CulturalContextBanner />

      {/* Search */}
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Enter a desire, concept, or deity..."
            className="w-full px-5 py-4 bg-surface border border-gold/30 rounded-xl text-foreground placeholder-foreground/30 focus:outline-none focus:border-gold/70 focus:ring-1 focus:ring-gold/30 text-base transition-colors"
          />
        </div>

        <button
          onClick={handleSearch}
          disabled={loading || !query.trim()}
          className="w-full py-3.5 bg-gold text-background font-serif font-bold text-lg rounded-xl hover:bg-gold-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Consulting the Ether...' : '✦ Manifest Correspondences'}
        </button>

        {/* Toggles */}
        <div className="flex flex-col sm:flex-row gap-3">
          <label className="flex items-center gap-3 cursor-pointer flex-1 card py-3">
            <div
              onClick={() => setIncludePopCulture(!includePopCulture)}
              className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${includePopCulture ? 'bg-gold' : 'bg-white/20'}`}
            >
              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${includePopCulture ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
            <span className="text-sm text-foreground/70">Include Pop Culture Archetypes</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer flex-1 card py-3">
            <div
              onClick={() => setAiEnrichment(!aiEnrichment)}
              className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${aiEnrichment ? 'bg-gold' : 'bg-white/20'}`}
            >
              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${aiEnrichment ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
            <span className="text-sm text-foreground/70">AI Enrichment (Hybrid Mode)</span>
          </label>
        </div>
      </div>

      {error && (
        <p className="text-center text-red-400 text-sm">{error}</p>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-6 animate-fade-in">
          {/* Match info */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              {result.matchedIntent && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-foreground/40 uppercase tracking-widest">Intent</span>
                  <span className="px-2 py-0.5 bg-gold/10 border border-gold/30 rounded text-xs text-gold font-medium">
                    {result.matchedIntent.label}
                  </span>
                </div>
              )}
              {result.matchedEntities.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-foreground/40 uppercase tracking-widest">Entities</span>
                  {result.matchedEntities.map((e) => (
                    <span key={e.id} className="px-2 py-0.5 bg-white/5 border border-white/10 rounded text-xs text-foreground/70">
                      {e.name}
                      {e.isPopCulture && ' ✦'}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={handleSave}
              disabled={saved}
              className="px-4 py-2 border border-gold/40 text-gold rounded-lg text-sm hover:bg-gold/10 transition-colors disabled:opacity-50"
            >
              {saved ? '✓ Saved' : '♡ Save Ritual'}
            </button>
          </div>

          {/* Entity Descriptions */}
          {result.matchedEntities.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {result.matchedEntities.map((entity) => (
                <div key={entity.id} className="card space-y-2">
                  {entity.isPopCulture && (
                    <span className="text-xs px-2 py-0.5 bg-purple-500/20 border border-purple-500/30 rounded text-purple-300">
                      Pop Culture Archetype
                    </span>
                  )}
                  <h3 className="font-serif text-gold font-semibold">{entity.name}</h3>
                  <p className="text-xs text-foreground/50">{entity.tradition} · {entity.type}</p>
                  <p className="text-sm text-foreground/70 leading-relaxed">{entity.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {entity.tags.slice(0, 4).map((tag) => (
                      <span key={tag} className="text-xs px-1.5 py-0.5 bg-white/5 rounded text-foreground/40">{tag}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CorrespondenceCard correspondences={result.correspondences} enrichment={enrichment} />
            <RitualOutline steps={result.ritualOutline} disclaimer={result.disclaimer} enrichment={enrichment} />
          </div>

          {(() => {
            const ifaOfferings = getOfferingsForEntities(result.matchedEntities.map((e) => e.id));
            return ifaOfferings.length > 0 ? <OfferingsCard offerings={ifaOfferings} /> : null;
          })()}
        </div>
      )}
    </div>
  );
}
