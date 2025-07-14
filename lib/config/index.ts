export const config = {
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY!,
  },
  email: {
    apiKey: process.env.RESEND_API_KEY!,
    from: process.env.EMAIL_FROM!,
  },
  app: {
    url: process.env.NEXT_PUBLIC_APP_URL!,
    name: process.env.NEXT_PUBLIC_APP_NAME!,
    version: process.env.NEXT_PUBLIC_APP_VERSION!,
  },
  features: {
    ai: process.env.NEXT_PUBLIC_ENABLE_AI === 'true',
    threeDimensional: process.env.NEXT_PUBLIC_ENABLE_3D === 'true',
    weather: process.env.NEXT_PUBLIC_ENABLE_WEATHER === 'true',
    drone: process.env.NEXT_PUBLIC_ENABLE_DRONE === 'true',
    guidedFlow: process.env.NEXT_PUBLIC_ENABLE_GUIDED_FLOW === 'true',
  },
  isDevelopment: process.env.NODE_ENV === 'development',
  isDebug: process.env.NEXT_PUBLIC_DEBUG === 'true',
}

export const validateConfig = () => {
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'OPENAI_API_KEY',
    'RESEND_API_KEY',
    'EMAIL_FROM',
    'NEXT_PUBLIC_APP_URL',
    'NEXT_PUBLIC_APP_NAME',
    'NEXT_PUBLIC_APP_VERSION',
  ]

  const missing = requiredEnvVars.filter(
    (envVar) => !process.env[envVar]
  )

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    )
  }
}