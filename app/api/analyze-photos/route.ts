import { NextRequest, NextResponse } from 'next/server';
import { analyzePhotos } from '@/lib/ai/photo-analysis';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('photos') as File[];
    
    // Validate files are images
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) {
      return NextResponse.json({ error: 'No image files provided' }, { status: 400 });
    }
    
    // Analyze photos
    const results = await analyzePhotos(imageFiles);
    
    return NextResponse.json({ results }, { status: 200 });
  } catch (error) {
    console.error('Photo analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze photos' },
      { status: 500 }
    );
  }
}