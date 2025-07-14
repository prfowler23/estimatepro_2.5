import { useState } from 'react';
import { DollarSign, TrendingUp, PieChart, BarChart3, AlertTriangle, Info, Download, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';

interface EquipmentCost {
  id: string;
  name: string;
  quantity: number;
  rate: number;
  days: number;
  totalCost: number;
  services: string[];
}

interface MaterialCost {
  id: string;
  name: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  service: string;
  category: string;
}

interface LaborCost {
  service: string;
  role: string;
  regularHours: number;
  overtimeHours: number;
  totalHours: number;
  totalCost: number;
  workers: number;
}

interface OtherCost {
  id: string;
  description: string;
  amount: number;
  category: string;
  service?: string;
}

interface CostMargins {
  equipment: number;
  materials: number;
  labor: number;
  other: number;
}

interface CostBreakdownProps {
  equipment: EquipmentCost[];
  materials: MaterialCost[];
  labor: LaborCost[];
  other: OtherCost[];
  margins: CostMargins;
  services: string[];
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

export function CostBreakdown({ 
  equipment, 
  materials, 
  labor, 
  other, 
  margins,
  services 
}: CostBreakdownProps) {
  const [selectedView, setSelectedView] = useState<'table' | 'visual'>('table');
  const [showDetails, setShowDetails] = useState<Record<string, boolean>>({});

  // Calculate costs by service
  const serviceBreakdown = services.map(service => {
    // Equipment cost (shared across services)
    const equipmentCost = equipment
      .filter(e => e.services.includes(service))
      .reduce((sum, e) => sum + (e.totalCost / e.services.length), 0);
    
    // Material cost (service-specific)
    const materialCost = materials
      .filter(m => m.service === service || m.service.includes(service))
      .reduce((sum, m) => {
        // If material is used by multiple services, split the cost
        const serviceCount = m.service.split(',').length;
        return sum + (m.totalCost / serviceCount);
      }, 0);
    
    // Labor cost (service-specific)
    const laborCost = labor
      .filter(l => l.service === service)
      .reduce((sum, l) => sum + l.totalCost, 0);
    
    // Other costs (allocated to services if specified)
    const otherCost = other
      .filter(o => !o.service || o.service === service)
      .reduce((sum, o) => {
        if (o.service) return sum + o.amount;
        // Split unallocated costs across all services
        return sum + (o.amount / services.length);
      }, 0);
    
    const directCost = equipmentCost + materialCost + laborCost + otherCost;
    
    // Apply margins
    const markedUpCosts = {
      equipment: equipmentCost * (1 + margins.equipment / 100),
      materials: materialCost * (1 + margins.materials / 100),
      labor: laborCost * (1 + margins.labor / 100),
      other: otherCost * (1 + margins.other / 100)
    };
    
    const totalMarkedUp = Object.values(markedUpCosts).reduce((a, b) => a + b, 0);
    const profit = totalMarkedUp - directCost;
    const profitMargin = directCost > 0 ? (profit / totalMarkedUp) * 100 : 0;
    
    // Get detailed items for this service
    const serviceEquipment = equipment.filter(e => e.services.includes(service));
    const serviceMaterials = materials.filter(m => m.service === service || m.service.includes(service));
    const serviceLabor = labor.filter(l => l.service === service);
    const serviceOther = other.filter(o => !o.service || o.service === service);
    
    return {
      service,
      serviceName: SERVICE_NAMES[service] || service,
      directCosts: { 
        equipment: equipmentCost, 
        materials: materialCost, 
        labor: laborCost, 
        other: otherCost,
        total: directCost 
      },
      markedUpCosts,
      totalMarkedUp,
      profit,
      profitMargin,
      details: {
        equipment: serviceEquipment,
        materials: serviceMaterials,
        labor: serviceLabor,
        other: serviceOther
      }
    };
  });
  
  // Calculate totals
  const totals = {
    equipment: equipment.reduce((sum, e) => sum + e.totalCost, 0),
    materials: materials.reduce((sum, m) => sum + m.totalCost, 0),
    labor: labor.reduce((sum, l) => sum + l.totalCost, 0),
    other: other.reduce((sum, o) => sum + o.amount, 0),
    directCost: 0,
    markedUpCost: 0,
    profit: 0
  };
  
  totals.directCost = totals.equipment + totals.materials + totals.labor + totals.other;
  
  totals.markedUpCost = 
    totals.equipment * (1 + margins.equipment / 100) +
    totals.materials * (1 + margins.materials / 100) +
    totals.labor * (1 + margins.labor / 100) +
    totals.other * (1 + margins.other / 100);
  
  totals.profit = totals.markedUpCost - totals.directCost;
  
  const overallMargin = totals.directCost > 0 ? (totals.profit / totals.markedUpCost) * 100 : 0;
  
  // Calculate cost category percentages
  const costPercentages = {
    equipment: totals.directCost > 0 ? (totals.equipment / totals.directCost) * 100 : 0,
    materials: totals.directCost > 0 ? (totals.materials / totals.directCost) * 100 : 0,
    labor: totals.directCost > 0 ? (totals.labor / totals.directCost) * 100 : 0,
    other: totals.directCost > 0 ? (totals.other / totals.directCost) * 100 : 0
  };
  
  const toggleDetails = (service: string) => {
    setShowDetails(prev => ({ ...prev, [service]: !prev[service] }));
  };
  
  const getMarginColor = (margin: number): string => {
    if (margin >= 30) return 'bg-green-100 text-green-700 border-green-200';
    if (margin >= 20) return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    return 'bg-red-100 text-red-700 border-red-200';
  };
  
  const exportBreakdown = () => {
    // Export functionality would go here
    console.log('Exporting cost breakdown...');
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <PieChart className="w-5 h-5" />
            Cost Breakdown Analysis
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={exportBreakdown}
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="table" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="table">Detailed Table</TabsTrigger>
            <TabsTrigger value="visual">Visual Analysis</TabsTrigger>
          </TabsList>
          
          <TabsContent value="table" className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                <CardContent className="p-4">
                  <p className="text-sm text-blue-600 font-medium">Direct Cost</p>
                  <p className="text-2xl font-bold text-blue-900">${totals.directCost.toFixed(2)}</p>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                <CardContent className="p-4">
                  <p className="text-sm text-purple-600 font-medium">Marked Up Total</p>
                  <p className="text-2xl font-bold text-purple-900">${totals.markedUpCost.toFixed(2)}</p>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                <CardContent className="p-4">
                  <p className="text-sm text-green-600 font-medium">Gross Profit</p>
                  <p className="text-2xl font-bold text-green-900">${totals.profit.toFixed(2)}</p>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                <CardContent className="p-4">
                  <p className="text-sm text-orange-600 font-medium">Overall Margin</p>
                  <p className="text-2xl font-bold text-orange-900">{overallMargin.toFixed(1)}%</p>
                </CardContent>
              </Card>
            </div>
            
            {/* Service Breakdown Table */}
            <div className="border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Service</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Equipment</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Materials</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Labor</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Other</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Direct Cost</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Marked Up</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Profit</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Margin</th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {serviceBreakdown.map(({ service, serviceName, directCosts, totalMarkedUp, profit, profitMargin, details }) => (
                      <React.Fragment key={service}>
                        <tr className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-medium">{serviceName}</p>
                              <p className="text-xs text-gray-500">({service})</p>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">${directCosts.equipment.toFixed(2)}</td>
                          <td className="px-4 py-3 text-right">${directCosts.materials.toFixed(2)}</td>
                          <td className="px-4 py-3 text-right">${directCosts.labor.toFixed(2)}</td>
                          <td className="px-4 py-3 text-right">${directCosts.other.toFixed(2)}</td>
                          <td className="px-4 py-3 text-right font-medium">${directCosts.total.toFixed(2)}</td>
                          <td className="px-4 py-3 text-right font-medium">${totalMarkedUp.toFixed(2)}</td>
                          <td className="px-4 py-3 text-right text-green-600 font-medium">${profit.toFixed(2)}</td>
                          <td className="px-4 py-3 text-right">
                            <Badge className={getMarginColor(profitMargin)}>
                              {profitMargin.toFixed(1)}%
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleDetails(service)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                        
                        {/* Detailed breakdown row */}
                        {showDetails[service] && (
                          <tr>
                            <td colSpan={10} className="bg-gray-50 px-4 py-4">
                              <div className="space-y-4">
                                {/* Equipment details */}
                                {details.equipment.length > 0 && (
                                  <div>
                                    <h5 className="font-medium text-sm mb-2">Equipment Details</h5>
                                    <div className="text-sm space-y-1">
                                      {details.equipment.map(eq => (
                                        <div key={eq.id} className="flex justify-between text-gray-600">
                                          <span>{eq.name} ({eq.quantity}x for {eq.days} days)</span>
                                          <span>${(eq.totalCost / eq.services.length).toFixed(2)}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                
                                {/* Material details */}
                                {details.materials.length > 0 && (
                                  <div>
                                    <h5 className="font-medium text-sm mb-2">Material Details</h5>
                                    <div className="text-sm space-y-1">
                                      {details.materials.map(mat => (
                                        <div key={mat.id} className="flex justify-between text-gray-600">
                                          <span>{mat.name} ({mat.quantity} units)</span>
                                          <span>${mat.totalCost.toFixed(2)}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                
                                {/* Labor details */}
                                {details.labor.length > 0 && (
                                  <div>
                                    <h5 className="font-medium text-sm mb-2">Labor Details</h5>
                                    <div className="text-sm space-y-1">
                                      {details.labor.map((lab, idx) => (
                                        <div key={idx} className="flex justify-between text-gray-600">
                                          <span>{lab.role} ({lab.workers} worker{lab.workers > 1 ? 's' : ''}, {lab.totalHours}h)</span>
                                          <span>${lab.totalCost.toFixed(2)}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-100 border-t-2">
                    <tr>
                      <td className="px-4 py-3 font-bold">TOTAL</td>
                      <td className="px-4 py-3 text-right font-bold">${totals.equipment.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-bold">${totals.materials.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-bold">${totals.labor.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-bold">${totals.other.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-bold">${totals.directCost.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-bold">${totals.markedUpCost.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-bold text-green-600">${totals.profit.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right">
                        <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                          {overallMargin.toFixed(1)}%
                        </Badge>
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
            
            {/* Margin Warnings */}
            {serviceBreakdown.some(s => s.profitMargin < 20) && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Some services have profit margins below 20%. Consider adjusting pricing or reducing costs.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>
          
          <TabsContent value="visual" className="space-y-6">
            {/* Cost Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Cost Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">Equipment</span>
                      <span className="text-sm">{costPercentages.equipment.toFixed(1)}%</span>
                    </div>
                    <Progress value={costPercentages.equipment} className="h-3" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">Materials</span>
                      <span className="text-sm">{costPercentages.materials.toFixed(1)}%</span>
                    </div>
                    <Progress value={costPercentages.materials} className="h-3" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">Labor</span>
                      <span className="text-sm">{costPercentages.labor.toFixed(1)}%</span>
                    </div>
                    <Progress value={costPercentages.labor} className="h-3" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">Other</span>
                      <span className="text-sm">{costPercentages.other.toFixed(1)}%</span>
                    </div>
                    <Progress value={costPercentages.other} className="h-3" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Service Profitability */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Service Profitability</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {serviceBreakdown
                    .sort((a, b) => b.profitMargin - a.profitMargin)
                    .map(service => (
                      <div key={service.service} className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex justify-between mb-1">
                            <span className="text-sm font-medium">{service.serviceName}</span>
                            <span className="text-sm">{service.profitMargin.toFixed(1)}%</span>
                          </div>
                          <Progress 
                            value={service.profitMargin} 
                            className={`h-2 ${
                              service.profitMargin >= 30 ? '[&>div]:bg-green-500' :
                              service.profitMargin >= 20 ? '[&>div]:bg-yellow-500' :
                              '[&>div]:bg-red-500'
                            }`}
                          />
                        </div>
                        <div className="ml-4 text-right">
                          <p className="text-sm font-medium">${service.profit.toFixed(0)}</p>
                          <p className="text-xs text-gray-500">profit</p>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
            
            {/* Margin Analysis */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  Margin Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div className="p-3 bg-gray-50 rounded">
                    <p className="text-sm text-gray-600">Equipment</p>
                    <p className="text-lg font-bold">{margins.equipment}%</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded">
                    <p className="text-sm text-gray-600">Materials</p>
                    <p className="text-lg font-bold">{margins.materials}%</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded">
                    <p className="text-sm text-gray-600">Labor</p>
                    <p className="text-lg font-bold">{margins.labor}%</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded">
                    <p className="text-sm text-gray-600">Other</p>
                    <p className="text-lg font-bold">{margins.other}%</p>
                  </div>
                </div>
                
                <div className="mt-4 p-4 bg-blue-50 rounded">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Blended Margin</span>
                    <span className="text-2xl font-bold text-blue-700">{overallMargin.toFixed(1)}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}