import { Calendar, Clock, Cloud, TrendingUp, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface ServiceDuration {
  service: string;
  serviceName?: string;
  baseDuration: number;
  weatherImpact: number;
  finalDuration: number;
  confidence: 'high' | 'medium' | 'low';
  dependencies: string[];
}

interface TimelineEntry {
  service: string;
  startDate: Date;
  endDate: Date;
  duration: number;
  dependencies: string[];
  weatherRisk: 'low' | 'medium' | 'high';
  isOnCriticalPath: boolean;
}

interface Timeline {
  entries: TimelineEntry[];
  totalDuration: number;
  criticalPath: string[];
}

interface WeatherAnalysis {
  location: string;
  riskScore: number;
  forecast: {
    recommendations: string[];
  };
  serviceImpacts: Record<string, any>;
}

interface DurationSummaryProps {
  serviceDurations: ServiceDuration[];
  totalDuration: number;
  weatherAnalysis: WeatherAnalysis;
  timeline: Timeline;
  confidence?: number;
}

const SERVICE_NAMES: Record<string, string> = {
  'WC': 'Window Cleaning',
  'GR': 'Glass Restoration',
  'BWP': 'Building Wash (Pressure)',
  'BWS': 'Building Wash (Soft)',
  'HBW': 'High-Rise Building Wash',
  'PWF': 'Pressure Wash (Flat)',
  'HFS': 'Hard Floor Scrubbing',
  'PC': 'Parking Cleaning',
  'PWP': 'Parking Pressure Wash',
  'IW': 'Interior Wall Cleaning',
  'DC': 'Deck Cleaning'
};

export function DurationSummary({ 
  serviceDurations, 
  totalDuration, 
  weatherAnalysis,
  timeline,
  confidence = 85
}: DurationSummaryProps) {
  const startDate = timeline.entries[0]?.startDate || new Date();
  const endDate = timeline.entries.length > 0 ? 
    new Date(Math.max(...timeline.entries.map(e => e.endDate.getTime()))) : 
    new Date();
  
  // Calculate statistics
  const totalBaseDuration = serviceDurations.reduce((sum, sd) => sum + sd.baseDuration, 0);
  const totalWeatherImpact = serviceDurations.reduce((sum, sd) => sum + sd.weatherImpact, 0);
  const weatherSensitiveServices = serviceDurations.filter(sd => sd.weatherImpact > 0).length;
  const criticalPathDuration = timeline.criticalPath.reduce((sum, service) => {
    const serviceEntry = timeline.entries.find(e => e.service === service);
    return sum + (serviceEntry?.duration || 0);
  }, 0);
  
  // Confidence assessment
  const highConfidenceServices = serviceDurations.filter(sd => sd.confidence === 'high').length;
  const lowConfidenceServices = serviceDurations.filter(sd => sd.confidence === 'low').length;
  
  const getConfidenceColor = (conf: number): string => {
    if (conf >= 80) return 'text-green-600';
    if (conf >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };
  
  const getWeatherRiskColor = (risk: number): string => {
    if (risk < 0.3) return 'bg-green-500';
    if (risk < 0.6) return 'bg-yellow-500';
    return 'bg-red-500';
  };
  
  const getWeatherRiskLabel = (risk: number): string => {
    if (risk < 0.3) return 'Low Risk';
    if (risk < 0.6) return 'Medium Risk';
    return 'High Risk';
  };
  
  return (
    <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Duration Summary
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Based on measurements, production rates, and weather analysis
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-blue-600">{totalDuration}</p>
            <p className="text-sm text-muted-foreground">Total Days</p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium">Start Date</span>
            </div>
            <p className="font-semibold">{startDate.toLocaleDateString()}</p>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-green-500" />
              <span className="text-sm font-medium">End Date</span>
            </div>
            <p className="font-semibold">{endDate.toLocaleDateString()}</p>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-purple-500" />
              <span className="text-sm font-medium">Confidence</span>
            </div>
            <p className={`font-semibold ${getConfidenceColor(confidence)}`}>
              {confidence}%
            </p>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Cloud className="w-4 h-4 text-orange-500" />
              <span className="text-sm font-medium">Weather Risk</span>
            </div>
            <p className="font-semibold">
              {getWeatherRiskLabel(weatherAnalysis.riskScore)}
            </p>
          </div>
        </div>
        
        {/* Duration Breakdown */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Service Duration Breakdown
          </h4>
          
          <div className="space-y-3">
            {serviceDurations.map(sd => (
              <div key={sd.service} className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <span className="font-medium">
                    {SERVICE_NAMES[sd.service] || sd.serviceName || sd.service}
                  </span>
                  <Badge 
                    variant={sd.confidence === 'high' ? 'default' : 
                            sd.confidence === 'medium' ? 'secondary' : 'destructive'}
                    className="text-xs"
                  >
                    {sd.confidence} confidence
                  </Badge>
                  {timeline.criticalPath.includes(sd.service) && (
                    <Badge variant="destructive" className="text-xs">
                      Critical Path
                    </Badge>
                  )}
                </div>
                
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-muted-foreground">
                    {sd.baseDuration}d base
                  </span>
                  {sd.weatherImpact > 0 && (
                    <span className="text-orange-600 flex items-center gap-1">
                      <Cloud className="w-3 h-3" />
                      +{sd.weatherImpact}d weather
                    </span>
                  )}
                  <span className="font-semibold min-w-[3rem] text-right">
                    {sd.finalDuration}d total
                  </span>
                </div>
              </div>
            ))}
          </div>
          
          {/* Summary totals */}
          <div className="border-t pt-3 mt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Base Duration:</span>
              <span className="font-medium">{totalBaseDuration} days</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Weather Buffer:</span>
              <span className="font-medium text-orange-600">+{totalWeatherImpact} days</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Parallel Work Savings:</span>
              <span className="font-medium text-green-600">
                -{Math.max(0, (totalBaseDuration + totalWeatherImpact) - totalDuration)} days
              </span>
            </div>
            <div className="flex justify-between font-semibold text-base border-t pt-2">
              <span>Project Total:</span>
              <span>{totalDuration} days</span>
            </div>
          </div>
        </div>
        
        {/* Weather Risk Assessment */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-semibold flex items-center gap-2">
              <Cloud className="w-4 h-4" />
              Weather Risk Assessment
            </h4>
            <div className="flex items-center gap-2">
              <div className="w-24 h-2 bg-gray-200 rounded-full">
                <div 
                  className={`h-full rounded-full ${getWeatherRiskColor(weatherAnalysis.riskScore)}`}
                  style={{ width: `${weatherAnalysis.riskScore * 100}%` }}
                />
              </div>
              <span className="text-sm font-medium">
                {Math.round(weatherAnalysis.riskScore * 100)}%
              </span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm mb-3">
            <div>
              <span className="text-muted-foreground">Weather-sensitive services:</span>
              <span className="font-medium ml-2">{weatherSensitiveServices}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Location:</span>
              <span className="font-medium ml-2">{weatherAnalysis.location}</span>
            </div>
          </div>
          
          {/* Weather Recommendations */}
          {weatherAnalysis.forecast.recommendations.length > 0 && (
            <div className="space-y-2">
              <h5 className="font-medium text-sm">Recommendations:</h5>
              {weatherAnalysis.forecast.recommendations.slice(0, 3).map((rec, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <Info className="w-4 h-4 mt-0.5 text-blue-500 flex-shrink-0" />
                  <span className="text-muted-foreground">{rec}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Critical Path Information */}
        {timeline.criticalPath.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h4 className="font-semibold mb-2 flex items-center gap-2 text-red-800">
              <AlertTriangle className="w-4 h-4" />
              Critical Path Analysis
            </h4>
            <div className="text-sm space-y-2">
              <p className="text-red-700">
                Critical path duration: <span className="font-semibold">{criticalPathDuration} days</span>
              </p>
              <p className="text-red-600">
                Services on critical path: {timeline.criticalPath.join(', ')}
              </p>
              <p className="text-red-600 text-xs">
                Delays to these services will directly impact the project completion date.
              </p>
            </div>
          </div>
        )}
        
        {/* Project Confidence */}
        <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg p-4 text-center border">
          <div className="flex items-center justify-center gap-2 mb-2">
            {confidence >= 80 ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : confidence >= 60 ? (
              <Info className="w-5 h-5 text-yellow-500" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-500" />
            )}
            <span className="font-semibold">
              Overall Confidence: <span className={getConfidenceColor(confidence)}>{confidence}%</span>
            </span>
          </div>
          
          <div className="text-sm text-muted-foreground space-y-1">
            <p>
              Based on {highConfidenceServices} high-confidence and {lowConfidenceServices} low-confidence services
            </p>
            <p>
              Historical weather data and current forecast analysis included
            </p>
            {confidence < 70 && (
              <p className="text-yellow-600 font-medium">
                Consider adding more detailed measurements to improve accuracy
              </p>
            )}
          </div>
        </div>
        
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="bg-white rounded-lg p-3 shadow-sm">
            <p className="text-2xl font-bold text-blue-600">{serviceDurations.length}</p>
            <p className="text-xs text-muted-foreground">Services</p>
          </div>
          <div className="bg-white rounded-lg p-3 shadow-sm">
            <p className="text-2xl font-bold text-purple-600">{timeline.criticalPath.length}</p>
            <p className="text-xs text-muted-foreground">Critical Path</p>
          </div>
          <div className="bg-white rounded-lg p-3 shadow-sm">
            <p className="text-2xl font-bold text-orange-600">{weatherSensitiveServices}</p>
            <p className="text-xs text-muted-foreground">Weather Dependent</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}