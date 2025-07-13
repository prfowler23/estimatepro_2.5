'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { 
  Building, 
  Calculator, 
  FileText, 
  BarChart3, 
  Settings, 
  User, 
  LogOut,
  Menu,
  X
} from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'

export function AppHeader() {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: BarChart3 },
    { name: 'Calculator', href: '/calculator', icon: Calculator },
    { name: 'Quotes', href: '/quotes', icon: FileText },
    { name: 'Settings', href: '/settings', icon: Settings },
  ]

  const handleSignOut = async () => {
    await signOut()
    router.push('/auth/login')
  }

  return (
    <header className="bg-background border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2">
            <Building className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold">EstimatePro</span>
            <Badge variant="outline" className="hidden sm:inline-flex">
              Pro
            </Badge>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {navigation.map((item) => (
              <Link key={item.name} href={item.href}>
                <Button variant="ghost" className="flex items-center gap-2">
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </Button>
              </Link>
            ))}
          </nav>

          {/* User Menu */}
          <div className="flex items-center gap-2">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span className="hidden sm:inline">
                      {user.user_metadata?.full_name || user.email}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/settings" className="flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link href="/auth/login">
                <Button>Sign In</Button>
              </Link>
            )}

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 space-y-2">
            {navigation.map((item) => (
              <Link key={item.name} href={item.href}>
                <Button 
                  variant="ghost" 
                  className="w-full justify-start gap-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </Button>
              </Link>
            ))}
          </div>
        )}
      </div>
    </header>
  )
}