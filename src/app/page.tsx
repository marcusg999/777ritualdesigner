'use client';

import { Suspense, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import type { CorrespondenceResult } from '@/lib/types';
import CorrespondenceCard from '@/components/CorrespondenceCard';
import RitualOutline from '@/components/RitualOutline';
import CulturalContextBanner from '@/components/CulturalContextBanner';
import OfferingsCard from '@/components/OfferingsCard';
import dynamic from 'next/dynamic';
import { getOfferingsForEntities } from '@/lib/offerings';
import { getSigilByEntityId } from '@/lib/sigils';
import { buildRitual, type RitualOptions } from '@/lib/ritual';
import { saveRitual } from '@/lib/storage';
import { suggestArchetypes } from '@/lib/archetypes';

// Loaded on demand: the astronomy code is only needed once a ritual is shown.
const TimingCard = dynamic(() => import('@/components/TimingCard'), { ssr: false });

function Toggle({
  on,
  onToggle,
  label,
}: {
  on: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      className="card flex items-center gap-3 flex-1 !py-3.5 !px-4 text-left cursor-pointer"
    >
      <span className="switch" data-on={on}>
        <span className="switch__dot" />
      </span>
      <span className="text-sm text-foreground/75">{label}</span>
    </button>
  );
}

const DEFAULT_OPTIONS: RitualOptions = { includePopCulture: false, reflection: false };

function Generator({ initialQuery = '' }: { initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery);
  // The result plus the options it was built with — what Save records, even
  // if the toggles are changed afterwards.
  // A query arriving in the URL (?q=…, e.g. from the Almanac) is built straight away.
  const [built, setBuilt] = useState<{ result: CorrespondenceResult; options: RitualOptions } | null>(() =>
    initialQuery ? { result: buildRitual(initialQuery, DEFAULT_OPTIONS), options: DEFAULT_OPTIONS } : null
  );
  const result = built?.result ?? null;
  const enrichment = result?.enrichment;
  const archetypes = useMemo(
    () => (built ? suggestArchetypes(built.result, { includePopCulture: built.options.includePopCulture }) : []),
    [built]
  );
  const [loading, setLoading] = useState(false);
  const [includePopCulture, setIncludePopCulture] = useState(false);
  const [reflection, setReflection] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = useCallback(() => {
    const q = query.trim();
    if (!q) return;

    setLoading(true);
    setError('');
    setSaved(false);

    try {
      const options = { includePopCulture, reflection };
      setBuilt({ result: buildRitual(q, options), options });
    } catch {
      setError('The working faltered — try phrasing your intention again.');
    } finally {
      setLoading(false);
    }
  }, [query, includePopCulture, reflection]);

  const handleSave = useCallback(() => {
    if (!built) return;
    if (saveRitual({ query: built.result.query, ...built.options })) {
      setSaved(true);
    } else {
      setError('This browser blocked saving — storage may be full or disabled in private browsing.');
    }
  }, [built]);

  return (
    <div className="space-y-10">
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <header className="text-center pt-6 sm:pt-10">
        <p className="eyebrow text-gold/60 reveal reveal-1">
          Liber 777 · Correspondence Engine
        </p>
        <h1 className="display-title text-4xl sm:text-6xl mt-4 reveal reveal-2">
          <span className="gilt">Design Your Ritual</span>
        </h1>
        <p className="mx-auto max-w-xl mt-5 text-foreground/60 text-lg reveal reveal-3">
          Name an intention, a deity, or a concept. The engine draws its
          symbolic correspondences — and a seven-fold ritual outline — from the
          world&apos;s traditions.
        </p>
      </header>

      <div className="max-w-2xl mx-auto space-y-5 reveal reveal-4">
        <CulturalContextBanner />

        {/* Invocation field */}
        <div>
          <label htmlFor="intention" className="section-label block mb-2">
            Your Intention
          </label>
          <input
            id="intention"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="e.g. love, protection, Aphrodite, clarity of mind…"
            className="field px-5 py-4 text-base"
          />
        </div>

        <button
          onClick={handleSearch}
          disabled={loading || !query.trim()}
          className="btn-gold w-full py-4 text-lg"
        >
          {loading ? 'Consulting the Ether…' : '✦  Manifest Correspondences'}
        </button>

        <div className="flex flex-col sm:flex-row gap-3">
          <Toggle
            on={includePopCulture}
            onToggle={() => setIncludePopCulture(!includePopCulture)}
            label="Include Pop-Culture Archetypes"
          />
          <Toggle
            on={reflection}
            onToggle={() => setReflection(!reflection)}
            label="Add Reflection Prompts"
          />
        </div>

        {error && (
          <p className="text-center text-sm" style={{ color: 'var(--caution-title)' }}>
            {error}
          </p>
        )}
      </div>

      {/* ── Results ───────────────────────────────────────────────────────── */}
      {result && (
        <div className="space-y-6 animate-fade-in">
          <div className="rule" />

          {/* Match summary */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-2">
              {result.matchedIntent && (
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="section-label">Intent</span>
                  <span className="chip">✦ {result.matchedIntent.label}</span>
                </div>
              )}
              {result.matchedEntities.length > 0 && (
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="section-label">Entities</span>
                  {result.matchedEntities.map((e) => (
                    <span key={e.id} className="tag">
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
              className="btn-ghost px-4 py-2"
            >
              {saved ? '✓ Saved to Grimoire' : '♦ Save Ritual'}
            </button>
          </div>

          {/* Entity descriptions */}
          {result.matchedEntities.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {result.matchedEntities.map((entity) => {
                const sigil = getSigilByEntityId(entity.id);
                return (
                  <article key={entity.id} className="card card-hover space-y-3">
                    {entity.isPopCulture && (
                      <span
                        className="tag"
                        style={{
                          color: 'var(--amethyst)',
                          background: 'color-mix(in srgb, var(--amethyst) 12%, transparent)',
                          borderColor: 'color-mix(in srgb, var(--amethyst) 30%, transparent)',
                        }}
                      >
                        Pop-Culture Archetype
                      </span>
                    )}
                    {entity.isClosed && (
                      <span
                        className="tag"
                        title="Divination in this tradition is performed only by initiated priests (babalawos and iyanifa)."
                        style={{
                          color: 'var(--caution-title)',
                          background: 'var(--caution-bg)',
                          borderColor: 'var(--caution-border)',
                        }}
                      >
                        Initiatory Tradition
                      </span>
                    )}
                    <div className="flex items-start gap-3">
                      {sigil && (
                        <div className="shrink-0" title={sigil.symbolName}>
                          <svg
                            viewBox={sigil.viewBox}
                            width="46"
                            height="46"
                            className="text-gold/70"
                            aria-label={sigil.symbolName}
                            dangerouslySetInnerHTML={{ __html: sigil.svgContent }}
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-display text-gold font-semibold text-lg leading-tight">
                          {entity.name}
                        </h3>
                        <p className="eyebrow text-foreground/40 mt-1">
                          {entity.tradition} · {entity.type}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-foreground/75 leading-relaxed">
                      {entity.description}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {entity.tags.slice(0, 4).map((tag) => (
                        <span key={tag} className="tag">{tag}</span>
                      ))}
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {/* Archetypes that answer the desire */}
          {archetypes.length > 0 && (
            <section className="space-y-3" aria-labelledby="archetypes-heading">
              <h2 id="archetypes-heading" className="section-label">
                Archetypes for your desire
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {archetypes.map(({ entity, matched, planet }) => (
                  <article key={entity.id} className="card card-hover space-y-3 flex flex-col">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-display text-gold font-semibold text-lg leading-tight">{entity.name}</h3>
                        {entity.sphere && <span className="eyebrow text-foreground/35 shrink-0">{entity.sphere}</span>}
                      </div>
                      <p className="eyebrow text-foreground/40 mt-1">
                        {entity.tradition} · {entity.category ?? entity.type}
                      </p>
                    </div>
                    <p className="text-sm text-foreground/75 leading-relaxed flex-1">{entity.description}</p>
                    <p className="text-xs text-foreground/55">
                      {matched.length > 0
                        ? `Answers to: ${matched.slice(0, 3).join(' · ')}`
                        : `Shares this working’s planet, ${planet}`}
                    </p>
                    <Link
                      href={`/?q=${encodeURIComponent(entity.name)}`}
                      className="text-sm text-gold hover:underline self-start"
                    >
                      Open ritual →
                    </Link>
                  </article>
                ))}
              </div>
            </section>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CorrespondenceCard correspondences={result.correspondences} basis={result.basis} enrichment={enrichment} />
            <RitualOutline steps={result.ritualOutline} disclaimer={result.disclaimer} enrichment={enrichment} />
          </div>

          <TimingCard correspondences={result.correspondences} />

          {(() => {
            const ifaOfferings = getOfferingsForEntities(result.matchedEntities.map((e) => e.id));
            const names = Object.fromEntries(result.matchedEntities.map((e) => [e.id, e.name]));
            return ifaOfferings.length > 0 ? <OfferingsCard offerings={ifaOfferings} names={names} /> : null;
          })()}
        </div>
      )}
    </div>
  );
}

function GeneratorFromUrl() {
  const q = useSearchParams().get('q')?.trim() ?? '';
  // Keyed by the query so following another ?q= link starts a fresh ritual.
  return <Generator key={q} initialQuery={q} />;
}

export default function HomePage() {
  // The static page renders the empty generator; the URL's query, if any,
  // is read on the client.
  return (
    <Suspense fallback={<Generator />}>
      <GeneratorFromUrl />
    </Suspense>
  );
}
