'use client';

import type { Correspondence, CorrespondenceBasis, EnrichmentData } from '@/lib/types';

interface CorrespondenceCardProps {
  correspondences: Correspondence;
  basis?: CorrespondenceBasis;
  enrichment?: EnrichmentData;
}

// Checked in order, so more specific names must come before the generic
// ones they contain (e.g. "maroon" before "red"-family matches).
const COLOR_MAP: Record<string, string> = {
  maroon: '#6b1d2a', burgundy: '#800020', coral: '#f87171', navy: '#1e3a8a',
  crystal: '#e2e8f0', clear: '#e2e8f0',
  red: '#ef4444', rose: '#f43f5e', pink: '#ec4899', orange: '#f97316',
  gold: '#d4af37', yellow: '#eab308', green: '#22c55e', teal: '#14b8a6',
  blue: '#3b82f6', indigo: '#6366f1', violet: '#8b5cf6', purple: '#a855f7',
  white: '#f8fafc', silver: '#94a3b8', black: '#1e293b', brown: '#78350f',
  gray: '#6b7280', amber: '#f59e0b', cyan: '#06b6d4', crimson: '#dc143c',
};

type FigureKind = 'orisha' | 'biography' | 'traditional';

const FIGURE_HEADING: Record<FigureKind, string> = {
  orisha: 'Orisha Correspondences',
  biography: 'Biography & Derivation',
  traditional: 'Traditional Attributes',
};

const NINE_COLORS =
  'conic-gradient(#800020, #ef4444, #f97316, #eab308, #22c55e, #3b82f6, #6366f1, #a855f7, #78350f, #800020)';

const BASIS_LABEL: Record<CorrespondenceBasis['kind'], string> = {
  entity: 'Correspondences of',
  intent: 'Intent ·',
  planetary: 'Planetary ·',
  default: '',
};

function getSwatchColor(colorName: string): string {
  const lower = colorName.toLowerCase();
  if (lower.includes('nine colors')) return NINE_COLORS;
  for (const [key, val] of Object.entries(COLOR_MAP)) {
    if (lower.includes(key)) return val;
  }
  return '#c9a84c';
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="section-label mb-1.5">{label}</h4>
      {children}
    </div>
  );
}

function TagList({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <span key={item} className="tag">{item}</span>
      ))}
    </div>
  );
}

export default function CorrespondenceCard({ correspondences: c, basis, enrichment }: CorrespondenceCardProps) {
  const allColors = enrichment?.additionalCorrespondences?.colors
    ? [...c.colors, ...enrichment.additionalCorrespondences.colors]
    : c.colors;

  const allStones = enrichment?.additionalCorrespondences?.stones
    ? [...c.stones, ...enrichment.additionalCorrespondences.stones]
    : c.stones;

  // A deity or figure's own record gets an attributes section, headed and
  // labelled for its tradition; Liber 777 records keep their own section.
  const kind: FigureKind = c.eleke ? 'orisha' : c.birthDate ? 'biography' : 'traditional';
  const is777 = !!(c.divineName || c.magicalWeapon || c.magicalPowers || c.virtue || c.vice || c.alchemicalProcess || c.bodyPart);
  const hasFigure = !!(
    c.eleke || c.birthDate || c.festival || c.feastDay || c.sacredPlaces?.length || c.tools?.length ||
    c.offerings?.length || c.lore?.length || c.temperament?.length || c.syncretism?.length ||
    c.sacredNumbers?.length || c.traditionNote
  );

  return (
    <div className="card space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xl font-display text-gold font-semibold">Correspondences</h3>
        <span className="eyebrow text-foreground/40 text-right">
          {basis && basis.kind !== 'default' ? `${BASIS_LABEL[basis.kind]} ${basis.label}` : c.sphere}
        </span>
      </div>

      <Section label="Colors">
        <div className="flex flex-wrap gap-2.5">
          {allColors.map((color) => (
            <div key={color} className="flex items-center gap-1.5">
              <div
                className="w-4 h-4 rounded-full shrink-0"
                style={{ background: getSwatchColor(color), border: '1px solid var(--tag-border)' }}
              />
              <span className="text-xs text-foreground/80 capitalize">{color}</span>
            </div>
          ))}
        </div>
      </Section>

      {hasFigure && (
        <div className="pt-5 space-y-4" style={{ borderTop: '1px solid var(--hairline)' }}>
          <h4 className="section-label">{FIGURE_HEADING[kind]}</h4>

          {c.eleke && (
            <Section label="Eleke (Sacred Beads)">
              <p className="text-sm text-foreground/80">{c.eleke}</p>
            </Section>
          )}

          {kind === 'biography' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {c.birthDate && (
                <Section label="Born">
                  <p className="text-sm text-foreground/80">{c.birthDate}</p>
                </Section>
              )}
              {c.deathDate && (
                <Section label="Died">
                  <p className="text-sm text-foreground/80">{c.deathDate}</p>
                </Section>
              )}
              {c.natalSun && (
                <Section label="Natal Sun">
                  <p className="text-sm text-foreground/80">{c.natalSun}</p>
                </Section>
              )}
            </div>
          )}

          {((c.sacredNumbers && c.sacredNumbers.length > 0) || (c.eleke && c.day) || c.feastDay || c.festival) && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {c.sacredNumbers && c.sacredNumbers.length > 0 && (
                <Section label="Sacred Numbers">
                  <span className="inline-block text-3xl font-display text-gold font-bold" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {c.sacredNumbers.join(' · ')}
                  </span>
                </Section>
              )}
              {c.eleke && c.day && (
                <Section label="Day">
                  <p className="text-sm text-foreground/80">{c.day}</p>
                </Section>
              )}
              {c.feastDay && (
                <Section label="Feast Day">
                  <p className="text-sm text-foreground/80">{c.feastDay}</p>
                </Section>
              )}
              {c.festival && (
                <div className="sm:col-span-2">
                  <Section label="Festival / Holy Day">
                    <p className="text-sm text-foreground/80">{c.festival}</p>
                  </Section>
                </div>
              )}
            </div>
          )}

          {c.sacredPlaces && c.sacredPlaces.length > 0 && (
            <Section label={kind === 'orisha' ? 'Sacred Places in Nature' : kind === 'biography' ? 'Places' : 'Sacred Places'}>
              <TagList items={c.sacredPlaces} />
            </Section>
          )}
          {c.tools && c.tools.length > 0 && (
            <Section label={kind === 'biography' ? 'Instruments & Emblems' : 'Tools & Emblems'}>
              <TagList items={c.tools} />
            </Section>
          )}
          {c.signatureWorks && c.signatureWorks.length > 0 && (
            <Section label="Signature Works">
              <TagList items={c.signatureWorks} />
            </Section>
          )}
          {c.temperament && c.temperament.length > 0 && (
            <Section label="Temperament">
              <TagList items={c.temperament} />
            </Section>
          )}
          {c.animals && c.animals.length > 0 && !is777 && (
            <Section label="Sacred Animals">
              <TagList items={c.animals} />
            </Section>
          )}
          {c.offerings && c.offerings.length > 0 && (
            <Section label="Traditional Offerings">
              <TagList items={c.offerings} />
            </Section>
          )}
          {c.syncretism && c.syncretism.length > 0 && (
            <Section label="Syncretized Catholic Saints">
              <TagList items={c.syncretism} />
            </Section>
          )}
          {c.taboos && c.taboos.length > 0 && (
            <Section label="Taboos (Èèwọ̀)">
              <TagList items={c.taboos} />
            </Section>
          )}
          {c.lore && c.lore.length > 0 && (
            <Section label="Lore">
              <ul className="space-y-1.5 list-none">
                {c.lore.map((line) => (
                  <li key={line} className="text-sm text-foreground/75 leading-relaxed">✦ {line}</li>
                ))}
              </ul>
            </Section>
          )}
          {c.traditionNote && (
            <p className="text-xs text-foreground/50 italic leading-relaxed">{c.traditionNote}</p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {allStones.length > 0 && (
          <Section label="Stones">
            <TagList items={allStones} />
          </Section>
        )}
        {c.herbs.length > 0 && (
          <Section label="Herbs">
            <TagList items={c.herbs} />
          </Section>
        )}
        {c.metals.length > 0 && (
          <Section label="Metals">
            <TagList items={c.metals} />
          </Section>
        )}
        {c.scents.length > 0 && (
          <Section label="Scents">
            <TagList items={c.scents} />
          </Section>
        )}
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
          {c.day && !c.eleke && (
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

      {c.numerology !== undefined && !c.sacredNumbers && (
        <Section label="Numerology">
          <span className="inline-block text-3xl font-display text-gold font-bold" style={{ fontVariantNumeric: 'tabular-nums' }}>{c.numerology}</span>
        </Section>
      )}

      {(c.flowers || c.woods || c.candleColor || c.essentialOils || c.direction || c.moonPhase) && (
        <div className="pt-5 space-y-4" style={{ borderTop: '1px solid var(--hairline)' }}>
          <h4 className="section-label">
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

      {(c.magicalWeapon || c.magicalPowers || c.virtue || c.vice || c.divineName || (c.animals && is777) || c.alchemicalProcess || c.bodyPart) && (
        <div className="pt-5 space-y-4" style={{ borderTop: '1px solid var(--hairline)' }}>
          <h4 className="section-label">
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

          {c.animals && c.animals.length > 0 && is777 && (
            <Section label="Sacred Animals">
              <TagList items={c.animals} />
            </Section>
          )}
        </div>
      )}

      {enrichment?.interpretation && (
        <div className="pt-4" style={{ borderTop: '1px solid var(--hairline)' }}>
          <h4 className="section-label mb-2">✦ Reflection Prompt</h4>
          <p className="text-sm text-foreground/75 italic leading-relaxed">{enrichment.interpretation}</p>
          <p className="eyebrow text-foreground/30 mt-2">A fixed journaling prompt · not AI-generated</p>
        </div>
      )}
    </div>
  );
}
