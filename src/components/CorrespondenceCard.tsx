'use client';

import type { Correspondence, EnrichmentData } from '@/lib/types';

interface CorrespondenceCardProps {
  correspondences: Correspondence;
  enrichment?: EnrichmentData;
}

const COLOR_MAP: Record<string, string> = {
  red: '#ef4444', rose: '#f43f5e', pink: '#ec4899', orange: '#f97316',
  gold: '#d4af37', yellow: '#eab308', green: '#22c55e', teal: '#14b8a6',
  blue: '#3b82f6', indigo: '#6366f1', violet: '#8b5cf6', purple: '#a855f7',
  white: '#f8fafc', silver: '#94a3b8', black: '#1e293b', brown: '#78350f',
  gray: '#6b7280', amber: '#f59e0b', cyan: '#06b6d4', crimson: '#dc143c',
};

function getSwatchColor(colorName: string): string {
  const lower = colorName.toLowerCase();
  for (const [key, val] of Object.entries(COLOR_MAP)) {
    if (lower.includes(key)) return val;
  }
  return '#c9a84c';
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-xs uppercase tracking-widest text-gold/60 font-semibold mb-1.5">{label}</h4>
      {children}
    </div>
  );
}

function TagList({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <span key={item} className="px-2 py-0.5 rounded text-xs text-foreground/80" style={{ backgroundColor: 'var(--tag-bg)', border: '1px solid var(--tag-border)' }}>
          {item}
        </span>
      ))}
    </div>
  );
}

export default function CorrespondenceCard({ correspondences: c, enrichment }: CorrespondenceCardProps) {
  const allColors = enrichment?.additionalCorrespondences?.colors
    ? [...c.colors, ...enrichment.additionalCorrespondences.colors]
    : c.colors;

  const allStones = enrichment?.additionalCorrespondences?.stones
    ? [...c.stones, ...enrichment.additionalCorrespondences.stones]
    : c.stones;

  return (
    <div className="card space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-serif text-gold font-semibold">Correspondences</h3>
        <div className="text-xs text-foreground/40">{c.sphere}</div>
      </div>

      <Section label="Colors">
        <div className="flex flex-wrap gap-2">
          {allColors.map((color) => (
            <div key={color} className="flex items-center gap-1.5">
              <div
                className="w-4 h-4 rounded-full border border-white/20 shrink-0"
                style={{ backgroundColor: getSwatchColor(color) }}
              />
              <span className="text-xs text-foreground/80 capitalize">{color}</span>
            </div>
          ))}
        </div>
      </Section>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Section label="Stones">
          <TagList items={allStones} />
        </Section>
        <Section label="Herbs">
          <TagList items={c.herbs} />
        </Section>
        <Section label="Metals">
          <TagList items={c.metals} />
        </Section>
        <Section label="Scents">
          <TagList items={c.scents} />
        </Section>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <Section label="Timing">
          <p className="text-sm text-foreground/80">{c.timing}</p>
        </Section>
        <Section label="Element">
          <p className="text-sm text-foreground/80">{c.element}</p>
        </Section>
        <Section label="Sphere">
          <p className="text-sm text-foreground/80">{c.sphere}</p>
        </Section>
      </div>

      {(c.planet || c.zodiac || c.day) && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {c.planet && (
            <Section label="Planet">
              <p className="text-sm text-foreground/80">{c.planet}</p>
            </Section>
          )}
          {c.day && (
            <Section label="Day">
              <p className="text-sm text-foreground/80">{c.day}</p>
            </Section>
          )}
          {c.zodiac && (
            <Section label="Zodiac">
              <p className="text-sm text-foreground/80">{c.zodiac}</p>
            </Section>
          )}
        </div>
      )}

      {c.tarotCards && c.tarotCards.length > 0 && (
        <Section label="Tarot Cards">
          <TagList items={c.tarotCards} />
        </Section>
      )}

      {c.runeAssociations && c.runeAssociations.length > 0 && (
        <Section label="Rune Associations">
          <TagList items={c.runeAssociations} />
        </Section>
      )}

      {c.numerology !== undefined && (
        <Section label="Numerology">
          <span className="inline-block text-2xl font-serif text-gold font-bold">{c.numerology}</span>
        </Section>
      )}

      {(c.flowers || c.woods || c.candleColor || c.essentialOils || c.direction || c.moonPhase) && (
        <div className="border-t border-gold/20 pt-5 space-y-4">
          <h4 className="text-xs uppercase tracking-widest text-gold/80 font-semibold">
            Witch&apos;s Correspondences
          </h4>

          {(c.candleColor || c.direction || c.moonPhase) && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {c.candleColor && (
                <Section label="Candle Color">
                  <p className="text-sm text-foreground/80">{c.candleColor}</p>
                </Section>
              )}
              {c.direction && (
                <Section label="Direction">
                  <p className="text-sm text-foreground/80">{c.direction}</p>
                </Section>
              )}
              {c.moonPhase && (
                <Section label="Moon Phase">
                  <p className="text-sm text-foreground/80">{c.moonPhase}</p>
                </Section>
              )}
            </div>
          )}

          {c.flowers && c.flowers.length > 0 && (
            <Section label="Flowers">
              <TagList items={c.flowers} />
            </Section>
          )}

          {c.woods && c.woods.length > 0 && (
            <Section label="Sacred Woods">
              <TagList items={c.woods} />
            </Section>
          )}

          {c.essentialOils && c.essentialOils.length > 0 && (
            <Section label="Essential Oils">
              <TagList items={c.essentialOils} />
            </Section>
          )}
        </div>
      )}

      {(c.magicalWeapon || c.magicalPowers || c.virtue || c.vice || c.divineName || c.animals || c.alchemicalProcess || c.bodyPart) && (
        <div className="border-t border-gold/20 pt-5 space-y-4">
          <h4 className="text-xs uppercase tracking-widest text-gold/80 font-semibold">
            777 Correspondences
          </h4>

          {(c.divineName || c.alchemicalProcess || c.bodyPart) && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {c.divineName && (
                <Section label="Divine Name">
                  <p className="text-sm text-foreground/80 font-serif italic">{c.divineName}</p>
                </Section>
              )}
              {c.alchemicalProcess && (
                <Section label="Alchemical Process">
                  <p className="text-sm text-foreground/80">{c.alchemicalProcess}</p>
                </Section>
              )}
              {c.bodyPart && (
                <Section label="Body Correspondence">
                  <p className="text-sm text-foreground/80">{c.bodyPart}</p>
                </Section>
              )}
            </div>
          )}

          {(c.virtue || c.vice) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {c.virtue && (
                <Section label="Virtue">
                  <p className="text-sm text-foreground/80">{c.virtue}</p>
                </Section>
              )}
              {c.vice && (
                <Section label="Vice / Shadow">
                  <p className="text-sm text-foreground/80">{c.vice}</p>
                </Section>
              )}
            </div>
          )}

          {c.magicalWeapon && c.magicalWeapon.length > 0 && (
            <Section label="Magical Weapons & Tools">
              <TagList items={c.magicalWeapon} />
            </Section>
          )}

          {c.magicalPowers && c.magicalPowers.length > 0 && (
            <Section label="Magical Powers & Visions">
              <TagList items={c.magicalPowers} />
            </Section>
          )}

          {c.animals && c.animals.length > 0 && (
            <Section label="Sacred Animals">
              <TagList items={c.animals} />
            </Section>
          )}
        </div>
      )}

      {enrichment?.interpretation && (
        <div className="border-t border-gold/20 pt-4">
          <h4 className="text-xs uppercase tracking-widest text-gold/60 font-semibold mb-2">
            ✦ Symbolic Insight
          </h4>
          <p className="text-sm text-foreground/70 italic leading-relaxed">{enrichment.interpretation}</p>
          <p className="text-xs text-foreground/30 mt-1">Source: AI enrichment (stub)</p>
        </div>
      )}
    </div>
  );
}
