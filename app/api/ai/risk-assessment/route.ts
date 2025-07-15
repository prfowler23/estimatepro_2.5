import { NextRequest, NextResponse } from 'next/server';
import { performRiskAssessment } from '../../../../lib/ai/extraction';
import { ExtractedData } from '../../../../lib/ai/extraction';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { extractedData, projectContext } = body;

    // Validate input
    if (!extractedData) {
      return NextResponse.json(
        { error: 'Extracted data is required' },
        { status: 400 }
      );
    }

    // Validate extractedData structure
    if (!extractedData.customer || !extractedData.requirements) {
      return NextResponse.json(
        { error: 'Invalid extracted data structure' },
        { status: 400 }
      );
    }

    // Perform risk assessment
    const riskAssessment = await performRiskAssessment(
      extractedData as ExtractedData, 
      projectContext
    );

    return NextResponse.json({
      success: true,
      riskAssessment,
      processedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Risk assessment error:', error);
    return NextResponse.json(
      { error: 'Failed to perform risk assessment' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Project risk assessment endpoint',
    methods: ['POST'],
    required_fields: ['extractedData'],
    optional_fields: ['projectContext'],
    description: 'Analyze project data for potential risks and provide mitigation strategies',
    output_fields: [
      'riskScore: overall risk rating (1-10)',
      'riskFactors: detailed risk analysis by category',
      'recommendations: strategic recommendations',
      'pricing_adjustments: suggested service pricing multipliers'
    ],
    risk_categories: [
      'timeline: scheduling and deadline risks',
      'budget: financial and payment risks',
      'technical: complexity and skill risks',
      'safety: worker and site safety risks',
      'weather: environmental condition risks',
      'access: site access and logistics risks',
      'regulatory: compliance and permit risks',
      'customer: client-related risks'
    ]
  });
}