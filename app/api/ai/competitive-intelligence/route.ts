import { NextRequest, NextResponse } from 'next/server';
import { extractCompetitiveIntelligence } from '../../../../lib/ai/extraction';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { competitorContent } = body;

    // Validate input
    if (!competitorContent) {
      return NextResponse.json(
        { error: 'Competitor content is required' },
        { status: 400 }
      );
    }

    if (typeof competitorContent !== 'string') {
      return NextResponse.json(
        { error: 'Competitor content must be a string' },
        { status: 400 }
      );
    }

    // Extract competitive intelligence
    const analysis = await extractCompetitiveIntelligence(competitorContent);

    return NextResponse.json({
      success: true,
      analysis,
      processedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Competitive intelligence error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze competitive intelligence' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Competitive intelligence analysis endpoint',
    methods: ['POST'],
    required_fields: ['competitorContent'],
    description: 'Analyze competitor quotes and proposals for market intelligence',
    output_fields: [
      'extraction: standard project data extraction',
      'competitive.competitors: list of competitor companies',
      'competitive.pricingStrategy: observed pricing approach',
      'competitive.serviceOfferings: services they offer',
      'competitive.strengthsWeaknesses: competitive advantages/disadvantages',
      'competitive.marketRates: service pricing ranges observed',
      'competitive.differentiators: unique selling points',
      'competitive.threats: competitive threats identified',
      'competitive.opportunities: market gaps identified'
    ]
  });
}