'use client'

import { config } from '@/lib/config'
import { GuidedEstimationFlow } from '@/components/estimation/guided-flow'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowRight, Calculator, Sparkles } from 'lucide-react'
import Link from 'next/link'

export default function NewEstimate() {
  // If guided flow is enabled, show workflow selection
  if (config.features.guidedFlow) {
    return (
      <div className="container py-6 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Create New Estimate</h1>
          <p className="text-muted-foreground">
            Choose your preferred estimation method
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Guided Flow Option */}
          <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-primary" />
                <CardTitle>AI-Guided Estimation</CardTitle>
              </div>
              <CardDescription>
                Step-by-step wizard with AI assistance for accurate estimates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground mb-4 space-y-1">
                <li>• AI extracts info from emails/notes</li>
                <li>• Photo analysis for measurements</li>
                <li>• Smart service recommendations</li>
                <li>• Automated takeoff calculations</li>
                <li>• Professional proposal generation</li>
              </ul>
              <Button asChild className="w-full">
                <Link href="/estimates/new/guided">
                  Start Guided Flow
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Quick Calculator Option */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Calculator className="h-6 w-6" />
                <CardTitle>Quick Calculator</CardTitle>
              </div>
              <CardDescription>
                Direct service selection for experienced users
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground mb-4 space-y-1">
                <li>• Immediate service selection</li>
                <li>• Manual data entry</li>
                <li>• Real-time calculations</li>
                <li>• Fast estimate generation</li>
                <li>• Perfect for repeat customers</li>
              </ul>
              <Button variant="outline" asChild className="w-full">
                <Link href="/calculator">
                  Use Calculator
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="text-center text-sm text-muted-foreground">
          Need help deciding? Try the AI-guided flow for more comprehensive estimates.
        </div>
      </div>
    )
  }

  // Fallback for when guided flow is disabled
  return (
    <div className="container py-6">
      <h1 className="text-3xl font-bold">New Estimate</h1>
      <p className="text-muted-foreground mb-6">Use the calculator to create a new estimate.</p>
      <Button asChild>
        <Link href="/calculator">
          Open Calculator
          <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </Button>
    </div>
  )
}