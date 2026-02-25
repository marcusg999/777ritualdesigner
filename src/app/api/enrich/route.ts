import { NextRequest, NextResponse } from 'next/server';
import type { CorrespondenceResult } from '@/lib/types';
import { stubEnrichmentProvider } from '@/lib/enrichment';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { query: string; result: CorrespondenceResult };
    const { query, result } = body;

    if (!query || !result) {
      return NextResponse.json({ error: 'Missing query or result' }, { status: 400 });
    }

    const enrichment = await stubEnrichmentProvider.enrich(query, result);
    return NextResponse.json(enrichment);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
