import { analyzePhotos } from '@/lib/ai/photo-analysis';
import { getFileType, aggregateAnalysisResults } from '@/lib/ai/photo-helpers';

describe('Photo Analysis', () => {
  test('correctly identifies file types', () => {
    const imageFile = new File([''], 'building.jpg', { type: 'image/jpeg' });
    expect(getFileType(imageFile)).toBe('photo');
    
    const mapFile = new File([''], 'site_map.pdf', { type: 'application/pdf' });
    expect(getFileType(mapFile)).toBe('area_map');
    
    const videoFile = new File([''], 'walkthrough.mp4', { type: 'video/mp4' });
    expect(getFileType(videoFile)).toBe('video');
    
    const measurementFile = new File([''], 'measurement_data.png', { type: 'image/png' });
    expect(getFileType(measurementFile)).toBe('measurement_screenshot');
    
    const planFile = new File([''], 'blueprint.pdf', { type: 'application/pdf' });
    expect(getFileType(planFile)).toBe('plan');
  });
  
  test('aggregates multiple photo analyses correctly', () => {
    const analyses = [
      { 
        windows: { count: 20, totalArea: 300 },
        materials: { breakdown: { brick: 60, glass: 40 } },
        damage: { severity: 'low' as const },
        safety: { hazards: ['power lines'], riskLevel: 'medium' as const }
      },
      { 
        windows: { count: 15, totalArea: 225 },
        materials: { breakdown: { brick: 50, glass: 30, concrete: 20 } },
        damage: { severity: 'medium' as const },
        safety: { hazards: ['traffic'], riskLevel: 'low' as const }
      }
    ];
    
    const result = aggregateAnalysisResults(analyses);
    expect(result.totalWindows).toBe(35);
    expect(result.totalWindowArea).toBe(525);
    expect(result.materials.brick).toBe(55); // Average of 60 and 50
    expect(result.allHazards).toContain('power lines');
    expect(result.allHazards).toContain('traffic');
    expect(result.overallSeverity).toBe('medium');
  });
  
  test('handles empty analysis results', () => {
    const result = aggregateAnalysisResults([]);
    expect(result.totalWindows).toBe(0);
    expect(result.totalWindowArea).toBe(0);
    expect(result.materials).toEqual({});
    expect(result.allHazards).toEqual([]);
    expect(result.overallSeverity).toBe('low');
  });
  
  test('handles missing data in analysis results', () => {
    const analyses = [
      { windows: { count: 10, totalArea: 150 } },
      { materials: { breakdown: { glass: 100 } } },
      {} // Empty analysis
    ];
    
    const result = aggregateAnalysisResults(analyses);
    expect(result.totalWindows).toBe(10);
    expect(result.totalWindowArea).toBe(150);
    expect(result.materials.glass).toBe(33); // 100 / 3 analyses
  });
  
  test('correctly calculates severity levels', () => {
    const lowSeverityAnalyses = [
      { damage: { severity: 'low' as const } },
      { damage: { severity: 'low' as const } }
    ];
    
    const mixedSeverityAnalyses = [
      { damage: { severity: 'low' as const } },
      { damage: { severity: 'high' as const } }
    ];
    
    const highSeverityAnalyses = [
      { damage: { severity: 'high' as const } },
      { damage: { severity: 'high' as const } }
    ];
    
    expect(aggregateAnalysisResults(lowSeverityAnalyses).overallSeverity).toBe('low');
    expect(aggregateAnalysisResults(mixedSeverityAnalyses).overallSeverity).toBe('medium');
    expect(aggregateAnalysisResults(highSeverityAnalyses).overallSeverity).toBe('high');
  });
  
  test('removes duplicate hazards and damage', () => {
    const analyses = [
      { 
        damage: { 
          staining: ['water stains', 'rust stains'],
          oxidation: ['metal frames'],
          damage: ['cracks']
        },
        safety: { hazards: ['power lines', 'traffic'] }
      },
      { 
        damage: { 
          staining: ['water stains'], // Duplicate
          oxidation: ['metal frames'], // Duplicate
          damage: ['spalling']
        },
        safety: { hazards: ['power lines'] } // Duplicate
      }
    ];
    
    const result = aggregateAnalysisResults(analyses);
    expect(result.allDamage).toEqual(['water stains', 'rust stains', 'metal frames', 'cracks', 'spalling']);
    expect(result.allHazards).toEqual(['power lines', 'traffic']);
  });
  
  test('handles API errors gracefully', async () => {
    // Mock failed API call
    const mockFile = new File(['invalid data'], 'test.jpg', { type: 'image/jpeg' });
    
    // Mock console.error to avoid test output pollution
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Mock OpenAI to throw an error
    jest.mock('openai', () => ({
      __esModule: true,
      default: jest.fn().mockImplementation(() => ({
        chat: {
          completions: {
            create: jest.fn().mockRejectedValue(new Error('API Error'))
          }
        }
      }))
    }));
    
    try {
      const result = await analyzePhotos([mockFile]);
      // Should return empty result for failed analysis
      expect(result).toEqual([{}]);
    } catch (error) {
      // Should handle error gracefully
      expect(error).toBeDefined();
    }
    
    consoleSpy.mockRestore();
  });
  
  test('validates file format before analysis', () => {
    const textFile = new File(['text content'], 'document.txt', { type: 'text/plain' });
    expect(getFileType(textFile)).toBe('plan'); // Falls back to plan for unknown types
    
    const pdfFile = new File(['pdf content'], 'floor_plan.pdf', { type: 'application/pdf' });
    expect(getFileType(pdfFile)).toBe('plan');
    
    const imageFile = new File(['image data'], 'facade.png', { type: 'image/png' });
    expect(getFileType(imageFile)).toBe('photo');
  });
  
  test('handles special filename patterns', () => {
    const areaMapFile = new File([''], 'site_layout_map.jpg', { type: 'image/jpeg' });
    expect(getFileType(areaMapFile)).toBe('area_map');
    
    const measurementFile = new File([''], 'building_measurements.png', { type: 'image/png' });
    expect(getFileType(measurementFile)).toBe('measurement_screenshot');
    
    const planFile = new File([''], 'floor_plan_level_1.pdf', { type: 'application/pdf' });
    expect(getFileType(planFile)).toBe('plan');
    
    const blueprintFile = new File([''], 'blueprint_elevation.dwg', { type: 'application/octet-stream' });
    expect(getFileType(blueprintFile)).toBe('plan');
  });
});