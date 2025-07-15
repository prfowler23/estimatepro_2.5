'use client'

import { GuidedEstimationFlow } from '@/components/estimation/guided-flow/index'
import { config } from '@/lib/config'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { EstimationFlowSkeleton } from '@/components/ui/analysis-loading'

export default function GuidedEstimationPage() {
  // Check if guided flow is enabled
  if (!config.features.guidedFlow) {
    redirect('/quotes/new')
  }

  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={<EstimationFlowSkeleton />}>
        <GuidedEstimationFlow />
      </Suspense>
    </div>
  )
}