'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Calculator,
  Building,
  Droplets,
  Brush,
  Sparkles,
  Car,
  Hammer,
  Wind,
  Zap,
  Diamond,
  Waves
} from 'lucide-react'

const services = [
  {
    code: 'GR',
    name: 'Glass Restoration',
    description: 'Remove mineral deposits from exterior glass surfaces',
    icon: Sparkles,
    pricing: '$70 per window',
    time: '0.5 hours per window',
    equipment: 'Scaffold required',
    badge: 'Premium'
  },
  {
    code: 'WC',
    name: 'Window Cleaning',
    description: 'Professional exterior window cleaning',
    icon: Droplets,
    pricing: '$65-75/hour',
    time: '0.025 hours per window',
    equipment: 'Height dependent',
    badge: 'Popular'
  },
  {
    code: 'PW',
    name: 'Pressure Washing',
    description: 'High-pressure cleaning of building facades',
    icon: Zap,
    pricing: '$0.15-0.50/sq ft',
    time: '350 sq ft/hour',
    equipment: 'Access dependent',
    badge: 'Standard'
  },
  {
    code: 'PWS',
    name: 'Pressure Wash & Seal',
    description: 'Pressure wash with protective sealer application',
    icon: Brush,
    pricing: '$1.25-1.35/sq ft',
    time: '120-160 sq ft/hour',
    equipment: 'Multi-coat process',
    badge: 'Premium'
  },
  {
    code: 'FC',
    name: 'Final Clean',
    description: 'Post-construction detailed cleaning',
    icon: Sparkles,
    pricing: '$70/hour',
    time: '0.167 hours per window',
    equipment: 'Specialized setup',
    badge: 'Standard'
  },
  {
    code: 'FR',
    name: 'Frame Restoration',
    description: 'Window frame repair and restoration',
    icon: Hammer,
    pricing: '$25 per frame',
    time: '0.117 hours per frame',
    equipment: 'Shares scaffold with GR',
    badge: 'Specialized'
  },
  {
    code: 'HD',
    name: 'High Dusting',
    description: 'Remove dust from high surfaces and HVAC systems',
    icon: Wind,
    pricing: '$0.37-0.75/sq ft',
    time: 'Variable by complexity',
    equipment: 'Access dependent',
    badge: 'Standard'
  },
  {
    code: 'SW',
    name: 'Soft Washing',
    description: 'Low-pressure cleaning with specialized chemicals',
    icon: Waves,
    pricing: '$0.45/sq ft',
    time: '1000 sq ft/hour',
    equipment: 'Chemical system',
    badge: 'Eco-Friendly'
  },
  {
    code: 'PD',
    name: 'Parking Deck',
    description: 'Comprehensive parking structure cleaning',
    icon: Car,
    pricing: '$16-23/space',
    time: 'Variable by size',
    equipment: 'Heavy-duty equipment',
    badge: 'Commercial'
  },
  {
    code: 'GRC',
    name: 'Granite Reconditioning',
    description: 'Restore and protect granite surfaces',
    icon: Diamond,
    pricing: '$1.75/sq ft',
    time: 'Multi-step process',
    equipment: 'Specialized tools',
    badge: 'Premium'
  },
  {
    code: 'BR',
    name: 'Biofilm Removal',
    description: 'Remove biological growth and staining',
    icon: Droplets,
    pricing: '$0.75-1.00/sq ft',
    time: 'Treatment dependent',
    equipment: 'Biological safe chemicals',
    badge: 'Specialized'
  }
]

export default function EnhancedCalculatorPage() {
  const [selectedService, setSelectedService] = useState<string | null>(null)

  const getBadgeVariant = (badge: string) => {
    switch (badge) {
      case 'Premium': return 'default'
      case 'Popular': return 'secondary' 
      case 'Eco-Friendly': return 'outline'
      case 'Specialized': return 'destructive'
      default: return 'outline'
    }
  }

  return (
    <div className="container mx-auto py-6 px-4">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Calculator className="h-8 w-8 text-primary" />
          <h1 className="text-4xl font-bold">Service Calculator</h1>
        </div>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Generate accurate quotes for all building services with professional-grade calculations
        </p>
      </div>

      {/* Service Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.map((service) => (
          <Card 
            key={service.code}
            className={`cursor-pointer transition-all hover:shadow-lg ${
              selectedService === service.code ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => setSelectedService(service.code)}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <service.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{service.name}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge 
                        variant={getBadgeVariant(service.badge)}
                        className="text-xs"
                      >
                        {service.badge}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {service.code}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <CardDescription className="mt-2">
                {service.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pricing:</span>
                  <span className="font-medium">{service.pricing}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Time:</span>
                  <span>{service.time}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Equipment:</span>
                  <span>{service.equipment}</span>
                </div>
              </div>
              
              <Button 
                className="w-full mt-4"
                variant={selectedService === service.code ? "default" : "outline"}
              >
                Calculate {service.code}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="mt-8 flex justify-center gap-4">
        <Button size="lg" disabled={!selectedService}>
          Start Calculation
        </Button>
        <Button variant="outline" size="lg">
          View Sample Quote
        </Button>
      </div>
    </div>
  )
}