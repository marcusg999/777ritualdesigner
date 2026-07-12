'use client';

import type { OfferingRecord } from '@/lib/offerings';

interface OfferingsCardProps {
  offerings: OfferingRecord[];
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

export default function OfferingsCard({ offerings }: OfferingsCardProps) {
  if (offerings.length === 0) return null;

  return (
    <div className="card space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xl font-display text-gold font-semibold">Ifá/Yorùbá Offerings</h3>
        <span className="eyebrow text-foreground/40">Informational only</span>
      </div>
      <p className="text-sm text-foreground/55 italic leading-relaxed">
        The following is provided for educational purposes. Practices vary significantly across lineages and houses.
        Always consult an initiated practitioner or elder before approaching these traditions.
      </p>
      {offerings.map((record, idx) => (
        <div
          key={record.entityId}
          className="space-y-4"
          style={idx > 0 ? { borderTop: '1px solid var(--hairline)', paddingTop: '1rem' } : undefined}
        >
          <h4 className="font-display text-gold font-semibold capitalize">{record.entityId === 'ifa' ? 'Ifá' : record.entityId.charAt(0).toUpperCase() + record.entityId.slice(1)}</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Section label="Common Offerings">
              <TagList items={record.commonOfferings} />
            </Section>
            <Section label="Symbolism">
              <TagList items={record.symbolism} />
            </Section>
            <Section label="Ritual Objects">
              <TagList items={record.ritualObjects} />
            </Section>
          </div>
          {record.cautions.map((caution, i) => (
            <div key={i} className="notice px-3 py-2 flex items-start gap-2">
              <span className="notice-title shrink-0 text-sm">⚠</span>
              <p className="notice-text text-xs leading-relaxed">{caution}</p>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
