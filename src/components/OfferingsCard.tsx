'use client';

import type { OfferingRecord } from '@/lib/offerings';

interface OfferingsCardProps {
  offerings: OfferingRecord[];
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
        <span key={item} className="px-2 py-0.5 bg-white/5 border border-white/10 rounded text-xs text-foreground/80">
          {item}
        </span>
      ))}
    </div>
  );
}

export default function OfferingsCard({ offerings }: OfferingsCardProps) {
  if (offerings.length === 0) return null;

  return (
    <div className="card space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-serif text-gold font-semibold">Ifá/Yorùbá Offerings</h3>
        <div className="text-xs text-foreground/40">Informational only</div>
      </div>
      <p className="text-xs text-foreground/50 italic">
        The following is provided for educational purposes. Practices vary significantly across lineages and houses.
        Always consult an initiated practitioner or elder before approaching these traditions.
      </p>
      {offerings.map((record) => (
        <div key={record.entityId} className="space-y-4 border-t border-white/10 pt-4 first:border-0 first:pt-0">
          <h4 className="font-serif text-gold/90 font-semibold capitalize">{record.entityId === 'ifa' ? 'Ifá' : record.entityId.charAt(0).toUpperCase() + record.entityId.slice(1)}</h4>
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
            <div key={i} className="bg-amber-950/60 border border-amber-600/40 rounded-lg px-3 py-2 flex items-start gap-2">
              <span className="text-amber-400 shrink-0 text-sm">⚠</span>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--caution-text)' }}>{caution}</p>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
