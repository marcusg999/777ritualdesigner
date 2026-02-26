'use client';

import { useState, useMemo } from 'react';
import type { Intent, Entity } from '@/lib/types';
import { getSigilByEntityId } from '@/lib/sigils';
import intentsData from '@/data/intents.json';
import entitiesData from '@/data/entities.json';

const intents = intentsData as Intent[];
const entities = entitiesData as Entity[];

const traditions = ['All', 'Greek', 'Egyptian', 'Norse', 'Celtic', 'Sumerian', 'Hindu', 'Abrahamic', 'Kabbalistic', 'Goetia', 'Orishas', 'Pop Culture'];

export default function LibraryPage() {
  const [search, setSearch] = useState('');
  const [tradition, setTradition] = useState('All');
  const [tab, setTab] = useState<'entities' | 'intents'>('entities');

  const filteredEntities = useMemo(() => {
    return entities.filter((e) => {
      const matchesTradition = tradition === 'All' || e.tradition.toLowerCase().includes(tradition.toLowerCase());
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        e.name.toLowerCase().includes(q) ||
        e.tradition.toLowerCase().includes(q) ||
        e.tags.some((t) => t.toLowerCase().includes(q)) ||
        e.description.toLowerCase().includes(q);
      return matchesTradition && matchesSearch;
    });
  }, [search, tradition]);

  const filteredIntents = useMemo(() => {
    const q = search.toLowerCase();
    return intents.filter(
      (i) =>
        !q ||
        i.label.toLowerCase().includes(q) ||
        i.tags.some((t) => t.toLowerCase().includes(q)) ||
        (i.description && i.description.toLowerCase().includes(q))
    );
  }, [search]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif text-gold font-bold mb-2">✦ Library</h1>
        <p className="text-foreground/50">Browse all entities, deities, and intention archetypes.</p>
      </div>

      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search entities, intents, tags..."
        className="w-full px-4 py-3 bg-surface border border-gold/20 rounded-xl text-foreground placeholder-foreground/30 focus:outline-none focus:border-gold/50 transition-colors"
      />

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab('entities')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'entities' ? 'bg-gold text-background' : 'bg-surface text-foreground/60 hover:text-foreground'}`}
        >
          Entities ({filteredEntities.length})
        </button>
        <button
          onClick={() => setTab('intents')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'intents' ? 'bg-gold text-background' : 'bg-surface text-foreground/60 hover:text-foreground'}`}
        >
          Intents ({filteredIntents.length})
        </button>
      </div>

      {/* Tradition Filter (entities only) */}
      {tab === 'entities' && (
        <div className="flex flex-wrap gap-2">
          {traditions.map((t) => (
            <button
              key={t}
              onClick={() => setTradition(t)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                tradition === t
                  ? 'bg-gold/20 border-gold/50 text-gold'
                  : 'border-white/10 text-foreground/50 hover:border-white/20 hover:text-foreground/70'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {/* Entities Grid */}
      {tab === 'entities' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEntities.map((entity) => {
            const sigil = getSigilByEntityId(entity.id);
            return (
            <div key={entity.id} className="card space-y-2 hover:border-gold/30 transition-colors">
              {entity.isPopCulture && (
                <span className="text-xs px-2 py-0.5 bg-purple-500/20 border border-purple-500/30 rounded text-purple-300">
                  Pop Culture
                </span>
              )}
              {entity.isClosed && (
                <span className="text-xs px-2 py-0.5 bg-amber-500/20 border border-amber-500/30 rounded text-amber-300">
                  Initiatory Tradition
                </span>
              )}
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-serif text-gold font-semibold">{entity.name}</h3>
                    {entity.sphere && (
                      <span className="text-xs text-foreground/30 shrink-0">{entity.sphere}</span>
                    )}
                  </div>
                  <p className="text-xs text-foreground/40">{entity.tradition} · {entity.type}</p>
                </div>
                {sigil && (
                  <div className="shrink-0" title={sigil.symbolName}>
                    <svg
                      viewBox={sigil.viewBox}
                      width="44"
                      height="44"
                      className="text-gold/60 hover:text-gold transition-colors"
                      aria-label={sigil.symbolName}
                      dangerouslySetInnerHTML={{ __html: sigil.svgContent }}
                    />
                  </div>
                )}
              </div>
              <p className="text-sm text-foreground/70 leading-relaxed">{entity.description}</p>
              {sigil && (
                <p className="text-xs text-foreground/40 italic">{sigil.symbolName}</p>
              )}
              <div className="flex flex-wrap gap-1 pt-1">
                {entity.tags.slice(0, 5).map((tag) => (
                  <span key={tag} className="text-xs px-1.5 py-0.5 bg-white/5 rounded text-foreground/40">{tag}</span>
                ))}
              </div>
            </div>
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
            <div key={intent.id} className="card space-y-2 hover:border-gold/30 transition-colors">
              <h3 className="font-serif text-gold font-semibold">{intent.label}</h3>
              {intent.description && (
                <p className="text-sm text-foreground/70">{intent.description}</p>
              )}
              <div className="flex flex-wrap gap-1 pt-1">
                {intent.tags.slice(0, 5).map((tag) => (
                  <span key={tag} className="text-xs px-1.5 py-0.5 bg-white/5 rounded text-foreground/40">{tag}</span>
                ))}
              </div>
            </div>
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
