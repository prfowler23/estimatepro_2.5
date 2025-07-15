'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { 
  Calculator, 
  Home, 
  FileText, 
  BarChart3, 
  Settings,
  Menu,
  X,
  Building2
} from 'lucide-react'
import { useState } from 'react'

const navItems = [
  {
    title: 'Home',
    href: '/',
    icon: Home
  },
  {
    title: 'New Estimate',
    href: '/estimates/new',
    icon: Calculator
  },
  {
    title: 'Estimates',
    href: '/estimates',
    icon: FileText
  },
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: BarChart3
  },
  {
    title: 'Settings',
    href: '/settings',
    icon: Settings
  }
]

export function Navigation() {
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <nav className='border-b border-border-primary bg-primary-action'>
      <div className='container mx-auto px-4'>
        <div className='flex items-center justify-between h-16'>
          {/* Logo */}
          <Link href='/' className='flex items-center gap-2'>
            <Building2 className='h-8 w-8 text-accent' />
            <span className='text-xl font-bold text-primary-foreground'>EstimatePro</span>
          </Link>

          {/* Desktop Navigation */}
          <div className='hidden md:flex items-center gap-6'>
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2 text-sm font-medium transition-all hover:text-bg-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bg-base focus-visible:ring-offset-2 focus-visible:ring-offset-primary-action rounded-md px-2 py-1',
                    isActive ? 'text-bg-base bg-primary-active/20' : 'text-primary-foreground/80 hover:bg-primary-hover/10 active:bg-primary-active/20'
                  )}
                >
                  <Icon className='h-4 w-4' />
                  {item.title}
                </Link>
              )
            })}
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant='ghost'
            size='icon'
            className='md:hidden text-primary-foreground hover:bg-primary-hover/20 active:bg-primary-active/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bg-base focus-visible:ring-offset-2 focus-visible:ring-offset-primary-action'
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className='h-6 w-6' /> : <Menu className='h-6 w-6' />}
          </Button>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className='md:hidden py-4 border-t border-border-primary/30'>
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all hover:bg-primary-hover/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bg-base focus-visible:ring-offset-2 focus-visible:ring-offset-primary-action rounded-md mx-2',
                    isActive ? 'text-bg-base bg-primary-active/20' : 'text-primary-foreground/80 active:bg-primary-active/20'
                  )}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Icon className='h-5 w-5' />
                  {item.title}
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </nav>
  )
}