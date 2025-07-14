# Files/Photos Component Integration Guide

## Setup Steps:
1. Run: `npm install openai`
2. Add `OPENAI_API_KEY` to `.env.local`
3. Import FilesPhotos in `guided-flow/index.tsx`
4. Add to STEPS array as step 3

## Usage:
- Component accepts multiple file types via drag/drop or file picker
- Click 'Analyze All Photos' to trigger AI analysis
- Results display inline with confidence scores
- Summary aggregates findings across all photos

## API Endpoints:
- `POST /api/analyze-photos` - Analyzes uploaded photos

## State Management:
- Files stored in component state during analysis
- Results passed to parent via `onUpdate` callback
- Summary data included for use in later steps

## Error Handling:
- Network errors show user-friendly messages
- Failed analyses marked with error status
- Partial results saved if some photos fail

## File Types Supported:
- **Photos** (.jpg, .png, .webp) - Building facade images for AI analysis
- **Videos** (.mp4, .mov) - Walkthrough recordings
- **Area Maps** - Site layout and mapping files
- **Measurements** - Dimension screenshots and drawings
- **Plans** - Floor plans, blueprints, and technical drawings

## Analysis Features:
- **Window Detection** - Counts windows, identifies patterns, calculates area
- **Material Classification** - Identifies materials, conditions, cleaning difficulty
- **Damage Assessment** - Finds staining, oxidation, physical damage
- **Safety Analysis** - Identifies hazards, access challenges, equipment needs
- **Building Measurements** - Estimates dimensions using visual reference points

## Integration Points:

### Component Props:
```typescript
interface FilesPhotosProps {
  data: any; // Previous step data
  onUpdate: (data: any) => void; // Pass results to parent
  onNext: () => void; // Navigate to next step
  onBack: () => void; // Navigate to previous step
}
```

### Data Structure:
```typescript
interface FilesPhotosData {
  files: FileData[];
  analysisComplete: boolean;
  summary: {
    totalPhotos: number;
    analyzedPhotos: number;
    totalWindows: number;
    totalArea: number;
    avgDamageLevel: string;
    safetyHazards: string[];
    materials: Record<string, number>;
  };
}
```

### Environment Variables:
```bash
# Required for OpenAI API
OPENAI_API_KEY=your_openai_api_key_here
```

### Dependencies:
```json
{
  "openai": "^4.28.0"
}
```

## Customization Options:

### File Type Detection:
Modify `lib/ai/photo-helpers.ts` to adjust file type detection logic:
```typescript
export function getFileType(file: File): FileType {
  // Custom logic for your file naming conventions
}
```

### Analysis Prompts:
Update `lib/ai/analysis-prompts.ts` to customize AI analysis behavior:
```typescript
export const WINDOW_DETECTION_PROMPT = `Your custom prompt...`;
```

### UI Styling:
Component uses Tailwind CSS classes - customize appearance by modifying class names in the component.

## Testing:

### Unit Tests:
```bash
npm test photo-analysis.test.ts
```

### Manual Testing:
1. Upload various file types
2. Trigger analysis with sample building photos
3. Verify results display correctly
4. Test error scenarios (invalid files, network issues)

## Troubleshooting:

### Common Issues:
- **OpenAI API errors** - Check API key and quota limits
- **File upload failures** - Verify file size limits and MIME types
- **Analysis timeouts** - Implement retry logic for large batches

### Debug Mode:
Enable console logging by setting:
```typescript
const DEBUG_MODE = true;
```

### Performance Optimization:
- Use rate limiting for batch photo analysis
- Implement caching for repeated analyses
- Consider image compression before API calls

## Security Considerations:
- API key should be server-side only (not exposed to client)
- Validate file types and sizes on server
- Implement user authentication for API endpoints
- Consider file storage cleanup after analysis

## Future Enhancements:
- Real-time analysis progress tracking
- Batch processing optimization
- Custom analysis model training
- Integration with building databases
- Automated report generation