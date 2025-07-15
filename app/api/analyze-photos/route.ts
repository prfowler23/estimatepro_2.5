import { NextRequest, NextResponse } from 'next/server';
import { analyzePhotos } from '@/lib/ai/photo-analysis';
import { authenticateRequest } from '@/lib/auth/server';
import { uploadRateLimiter } from '@/lib/utils/rate-limit';

// File size limits
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB per file
const MAX_TOTAL_SIZE = 50 * 1024 * 1024; // 50MB total
const MAX_FILES = 10; // Maximum number of files

export async function POST(request: NextRequest) {
  try {
    // Authenticate the request
    const { user, error: authError } = await authenticateRequest(request);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Apply rate limiting
    const rateLimitResult = await uploadRateLimiter(request);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded',
          retryAfter: rateLimitResult.retryAfter 
        },
        { 
          status: 429,
          headers: {
            'Retry-After': Math.ceil((rateLimitResult.retryAfter || 0) / 1000).toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.resetTime.toString()
          }
        }
      );
    }

    const formData = await request.formData();
    const files = formData.getAll('photos') as File[];
    
    // Validate file count
    if (files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }
    
    if (files.length > MAX_FILES) {
      return NextResponse.json({ 
        error: `Maximum ${MAX_FILES} files allowed` 
      }, { status: 400 });
    }
    
    // Validate files are images and check size limits
    const imageFiles = [];
    let totalSize = 0;
    
    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        return NextResponse.json({ 
          error: `Invalid file type: ${file.name}. Only images are allowed.` 
        }, { status: 400 });
      }
      
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({ 
          error: `File ${file.name} exceeds 10MB limit` 
        }, { status: 400 });
      }
      
      totalSize += file.size;
      imageFiles.push(file);
    }
    
    if (totalSize > MAX_TOTAL_SIZE) {
      return NextResponse.json({ 
        error: 'Total file size exceeds 50MB limit' 
      }, { status: 400 });
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