'use client';

import { useState, useMemo } from 'react';
import type { Intent, Entity } from '@/lib/types';
import { getSigilByEntityId } from '@/lib/sigils';
import intentsData from '@/data/intents.json';
import entitiesData from '@/data/entities.json';
import { normalizeText } from '@/lib/matcher';

const intents = intentsData as Intent[];
const entities = entitiesData as Entity[];

// CHANGED: 'Hip-Hop' -> 'HipHop'
const traditions = [
  'All',
  'Greek',
  'Egyptian',
  'Norse',
  'Celtic',
  'Sumerian',
  'Hindu',
  'Abrahamic',
  'Kabbalistic',
  'Goetia',
  'Ifá/Yorùbá',
  'Pop Culture',
  'HipHop',
  'Modern',
  'Chinese Zodiac',
  'Animal Kingdom',
];

export default function LibraryPage() {
  const [search, setSearch] = useState('');
  const [tradition, setTradition] = useState('All');
  const [tab, setTab] = useState<'entities' | 'intents'>('entities');

  const filteredEntities = useMemo(() => {
    return entities.filter((e) => {
      // CHANGED: exact-match filter (case-insensitive)
      const matchesTradition =
        tradition === 'All' || e.tradition.toLowerCase() === tradition.toLowerCase();

      // Accent-insensitive, so "ifa" finds Ifá and "yoruba" finds Yorùbá.
      const q = normalizeText(search);
      const has = (text: string) => normalizeText(text).includes(q);
      const matchesSearch =
        !q ||
        has(e.name) ||
        (e.aliases ?? []).some(has) ||
        has(e.tradition) ||
        (e.category !== undefined && has(e.category)) ||
        e.tags.some(has) ||
        has(e.description);

      return matchesTradition && matchesSearch;
    });
  }, [search, tradition]);

  const filteredIntents = useMemo(() => {
    const q = normalizeText(search);
    const has = (text: string) => normalizeText(text).includes(q);
    return intents.filter(
      (i) => !q || has(i.label) || i.tags.some(has) || (i.description !== undefined && has(i.description))
    );
  }, [search]);

  return (
    <div className="space-y-6">
      <header className="pt-4">
        <p className="eyebrow text-gold/60">Codex of Correspondences</p>
        <h1 className="display-title text-4xl sm:text-5xl mt-3">
          <span className="gilt">The Library</span>
        </h1>
        <p className="text-foreground/55 mt-3 text-lg">Browse every entity, deity, and intention archetype.</p>
      </header>

      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search entities, intents, tags…"
        className="field px-4 py-3"
      />

      {/* Tabs */}
      <div className="flex gap-2">
        {(['entities', 'intents'] as const).map((t) => {
          const active = tab === t;
          const count = t === 'entities' ? filteredEntities.length : filteredIntents.length;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={active ? 'btn-gold px-4 py-2 text-sm' : 'btn-ghost px-4 py-2 !text-sm'}
              style={active ? undefined : { fontFamily: 'var(--font-mono)' }}
            >
              {t === 'entities' ? 'Entities' : 'Intents'} · {count}
            </button>
          );
        })}
      </div>

      {/* Tradition Filter (entities only) */}
      {tab === 'entities' && (
        <div className="flex flex-wrap gap-2">
          {traditions.map((t) => {
            const active = tradition === t;
            return (
              <button
                key={t}
                onClick={() => setTradition(t)}
                className="px-3 py-1 rounded-full text-xs transition-colors"
                style={{
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.04em',
                  border: '1px solid',
                  borderColor: active ? 'var(--hairline)' : 'var(--card-border)',
                  color: active ? 'var(--gold)' : 'color-mix(in srgb, var(--foreground) 55%, transparent)',
                  background: active ? 'color-mix(in srgb, var(--gold) 12%, transparent)' : 'transparent',
                }}
              >
                {t}
              </button>
            );
          })}
        </div>
      )}

      {/* Entities Grid */}
      {tab === 'entities' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEntities.map((entity) => {
            const sigil = getSigilByEntityId(entity.id);
            return (
              <article key={entity.id} className="card card-hover space-y-2.5">
                <div className="flex flex-wrap gap-1.5">
                  {entity.tradition === 'HipHop' && (
                    <span
                      className="tag"
                      style={{
                        color: '#8fe0b8',
                        background: 'color-mix(in srgb, #34d399 12%, transparent)',
                        borderColor: 'color-mix(in srgb, #34d399 26%, transparent)',
                      }}
                    >
                      HipHop
                    </span>
                  )}

                  {entity.isPopCulture && entity.tradition !== 'HipHop' && (
                    <span
                      className="tag"
                      style={{
                        color: 'var(--amethyst)',
                        background: 'color-mix(in srgb, var(--amethyst) 12%, transparent)',
                        borderColor: 'color-mix(in srgb, var(--amethyst) 30%, transparent)',
                      }}
                    >
                      Pop Culture
                    </span>
                  )}

                  {entity.isClosed && (
                    <span
                      title="Divination in this tradition is performed only by initiated priests (babalawos and iyanifa)."
                      className="tag"
                      style={{
                        color: 'var(--caution-title)',
                        background: 'var(--caution-bg)',
                        borderColor: 'var(--caution-border)',
                      }}
                    >
                      Initiatory Tradition
                    </span>
                  )}
                </div>

                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-display text-gold font-semibold text-lg leading-tight">{entity.name}</h3>
                      {entity.sphere && (
                        <span className="eyebrow text-foreground/35 shrink-0">{entity.sphere}</span>
                      )}
                    </div>
                    <p className="eyebrow text-foreground/40 mt-1">
                      {entity.tradition} · {entity.category ?? entity.type}
                    </p>
                  </div>

                  {sigil && (
                    <div className="shrink-0" title={sigil.symbolName}>
                      <svg
                        viewBox={sigil.viewBox}
                        width="44"
                        height="44"
                        className="text-gold/70 hover:text-gold transition-colors"
                        aria-label={sigil.symbolName}
                        dangerouslySetInnerHTML={{ __html: sigil.svgContent }}
                      />
                    </div>
                  )}
                </div>

                <p className="text-sm text-foreground/75 leading-relaxed">{entity.description}</p>

                {entity.attributes && entity.attributes.length > 0 && (
                  <div className="pt-1">
                    <p className="section-label mb-1">Visualization</p>
                    <ul className="space-y-0.5">
                      {entity.attributes.map((attr) => (
                        <li key={attr} className="text-sm text-foreground/60 flex gap-1.5">
                          <span className="text-gold/50 shrink-0">·</span>
                          {attr}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {entity.reasonsToInvoke && entity.reasonsToInvoke.length > 0 && (
                  <div className="pt-1">
                    <p className="section-label mb-1">Reasons to Invoke</p>
                    <ul className="space-y-0.5">
                      {entity.reasonsToInvoke.map((reason) => (
                        <li key={reason} className="text-sm text-foreground/60 flex gap-1.5">
                          <span className="text-gold/50 shrink-0">·</span>
                          {reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {sigil && <p className="text-xs text-foreground/40 italic">{sigil.symbolName}</p>}

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {entity.tags.slice(0, 5).map((tag) => (
                    <span key={tag} className="tag">{tag}</span>
                  ))}
                </div>
              </article>
            );
          })}

          {filteredEntities.length === 0 && (
            <div className="col-span-full text-center text-foreground/40 py-12">
              No entities found matching your search.
            </div>
          )}
        </div>
      )}

      {/* Intents Grid */}
      {tab === 'intents' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredIntents.map((intent) => (
            <article key={intent.id} className="card card-hover space-y-2.5">
              <h3 className="font-display text-gold font-semibold text-lg leading-tight">{intent.label}</h3>
              {intent.description && <p className="text-sm text-foreground/75 leading-relaxed">{intent.description}</p>}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {intent.tags.slice(0, 5).map((tag) => (
                  <span key={tag} className="tag">{tag}</span>
                ))}
              </div>
            </article>
          ))}

          {filteredIntents.length === 0 && (
            <div className="col-span-full text-center text-foreground/40 py-12">
              No intents found matching your search.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
