import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'

// Server-side Supabase client for API routes
export function createServerSupabaseClient() {
  return createServerComponentClient({ cookies })
}

// Authenticate API requests and return user
export async function authenticateRequest(request: NextRequest) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: { session }, error } = await supabase.auth.getSession()

    if (error || !session) {
      return { user: null, error: 'Unauthorized' }
    }

    return { user: session.user, error: null }
  } catch (error) {
    console.error('Authentication error:', error)
    return { user: null, error: 'Authentication failed' }
  }
}

// Get user profile with role information
export async function getUserProfile(userId: string) {
  try {
    const supabase = createServerSupabaseClient()
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Error fetching user profile:', error)
      return null
    }

    return profile
  } catch (error) {
    console.error('Error getting user profile:', error)
    return null
  }
}

// Check if user has required role
export async function hasRequiredRole(userId: string, requiredRole: string) {
  const profile = await getUserProfile(userId)
  if (!profile) return false

  const roleHierarchy = {
    'viewer': 1,
    'sales': 2,
    'admin': 3
  }

  const userRoleLevel = roleHierarchy[profile.role as keyof typeof roleHierarchy] || 0
  const requiredRoleLevel = roleHierarchy[requiredRole as keyof typeof roleHierarchy] || 0

  return userRoleLevel >= requiredRoleLevel
}