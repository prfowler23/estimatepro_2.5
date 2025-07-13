'use client'

import { AppHeader } from './app-header'
import { useAuth } from '@/contexts/auth-context'
import { PageLoader } from '@/components/ui/loading/page-loader'

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const { loading } = useAuth()

  if (loading) {
    return <PageLoader message="Initializing EstimatePro..." />
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="flex-1">
        {children}
      </main>
    </div>
  )
}