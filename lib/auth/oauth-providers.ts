/**
 * OAuth Providers Integration
 * Supports GitHub and Microsoft OAuth authentication
 */

import { supabase } from "@/lib/supabase/client";
import { AuthError, Provider } from "@supabase/supabase-js";

export interface OAuthConfig {
  redirectTo?: string;
  scopes?: string;
  queryParams?: Record<string, string>;
}

export interface OAuthResult {
  success: boolean;
  data?: any;
  error?: string;
  provider?: Provider;
  requiresRedirect?: boolean;
  redirectUrl?: string;
}

export interface OAuthUserProfile {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  provider: Provider;
  provider_id: string;
  raw_user_meta_data?: Record<string, any>;
}

// Default OAuth configurations
const DEFAULT_OAUTH_CONFIGS: Record<Provider, OAuthConfig> = {
  github: {
    scopes: "user:email",
    queryParams: {
      allow_signup: "true",
    },
  },
  azure: {
    scopes: "openid email profile",
    queryParams: {
      prompt: "select_account",
    },
  },
  google: {
    scopes: "openid email profile",
  },
  facebook: {
    scopes: "email",
  },
  twitter: {
    scopes: "users.read tweet.read",
  },
  discord: {
    scopes: "identify email",
  },
  spotify: {
    scopes: "user-read-email",
  },
  slack: {
    scopes: "identity.basic identity.email",
  },
  notion: {
    scopes: "read",
  },
  workos: {
    scopes: "openid email profile",
  },
  zoom: {
    scopes: "user:read",
  },
  figma: {
    scopes: "file_read",
  },
  linkedin: {
    scopes: "r_emailaddress r_liteprofile",
  },
  linkedin_oidc: {
    scopes: "openid email profile",
  },
  twitch: {
    scopes: "user:read:email",
  },
  kakao: {
    scopes: "profile_nickname account_email",
  },
  bitbucket: {
    scopes: "account email",
  },
  gitlab: {
    scopes: "read_user",
  },
  keycloak: {
    scopes: "openid email profile",
  },
  fly: {
    scopes: "read",
  },
};

/**
 * Initiate OAuth sign-in with a provider
 */
export async function signInWithOAuth(
  provider: Provider,
  config?: OAuthConfig,
): Promise<OAuthResult> {
  try {
    const supabaseClient = supabase;
    const providerConfig = {
      ...DEFAULT_OAUTH_CONFIGS[provider],
      ...config,
    };

    const { data, error } = await supabaseClient.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo:
          providerConfig.redirectTo ||
          `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
        scopes: providerConfig.scopes,
        queryParams: providerConfig.queryParams,
      },
    });

    if (error) {
      console.error(`${provider} OAuth error:`, error);
      return {
        success: false,
        error: error.message,
        provider,
      };
    }

    // For OAuth flows, we typically get a redirect URL
    return {
      success: true,
      data,
      provider,
      requiresRedirect: true,
      redirectUrl: data.url,
    };
  } catch (error: any) {
    console.error(`${provider} OAuth sign-in error:`, error);
    return {
      success: false,
      error: error.message || "OAuth authentication failed",
      provider,
    };
  }
}

/**
 * Handle OAuth callback after user returns from provider
 */
export async function handleOAuthCallback(
  code: string,
  state?: string,
): Promise<OAuthResult> {
  try {
    const supabaseClient = supabase;

    const { data, error } =
      await supabaseClient.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("OAuth callback error:", error);
      return {
        success: false,
        error: error.message,
      };
    }

    if (!data.user) {
      return {
        success: false,
        error: "No user data received from OAuth provider",
      };
    }

    // Log successful OAuth authentication
    await logOAuthEvent(
      data.user.id,
      "oauth_login_success",
      data.user.app_metadata.provider,
      {
        provider: data.user.app_metadata.provider,
        email: data.user.email,
      },
    );

    return {
      success: true,
      data,
      provider: data.user.app_metadata.provider,
    };
  } catch (error: any) {
    console.error("OAuth callback processing error:", error);
    return {
      success: false,
      error: error.message || "Failed to process OAuth callback",
    };
  }
}

/**
 * Get user profile information from OAuth provider
 */
export function extractOAuthProfile(user: any): OAuthUserProfile | null {
  if (!user || !user.app_metadata?.provider) {
    return null;
  }

  const provider = user.app_metadata.provider as Provider;
  const userMetadata = user.user_metadata || {};

  // Extract common profile information based on provider
  let profile: OAuthUserProfile = {
    id: user.id,
    email: user.email,
    name: userMetadata.full_name || userMetadata.name || user.email,
    provider,
    provider_id: userMetadata.provider_id || user.id,
    raw_user_meta_data: userMetadata,
  };

  // Provider-specific profile extraction
  switch (provider) {
    case "github":
      profile.name =
        userMetadata.user_name || userMetadata.full_name || user.email;
      profile.avatar_url = userMetadata.avatar_url;
      profile.provider_id = userMetadata.provider_id || userMetadata.sub;
      break;

    case "azure":
      profile.name =
        userMetadata.name ||
        `${userMetadata.given_name || ""} ${userMetadata.family_name || ""}`.trim();
      profile.avatar_url = userMetadata.picture;
      profile.provider_id = userMetadata.oid || userMetadata.sub;
      break;

    case "google":
      profile.name = userMetadata.full_name || userMetadata.name;
      profile.avatar_url = userMetadata.avatar_url || userMetadata.picture;
      profile.provider_id = userMetadata.sub;
      break;

    default:
      // Use generic extraction for other providers
      profile.avatar_url = userMetadata.avatar_url || userMetadata.picture;
      break;
  }

  return profile;
}

/**
 * Link OAuth account to existing user
 */
export async function linkOAuthAccount(
  provider: Provider,
  config?: OAuthConfig,
): Promise<OAuthResult> {
  try {
    const supabaseClient = supabase;

    // Check if user is already authenticated
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return {
        success: false,
        error: "User must be authenticated to link OAuth accounts",
        provider,
      };
    }

    const providerConfig = {
      ...DEFAULT_OAUTH_CONFIGS[provider],
      ...config,
    };

    const { data, error } = await supabaseClient.auth.linkIdentity({
      provider,
      options: {
        redirectTo:
          providerConfig.redirectTo ||
          `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
        scopes: providerConfig.scopes,
        queryParams: providerConfig.queryParams,
      },
    });

    if (error) {
      console.error(`${provider} OAuth linking error:`, error);
      return {
        success: false,
        error: error.message,
        provider,
      };
    }

    return {
      success: true,
      data,
      provider,
      requiresRedirect: true,
      redirectUrl: data.url,
    };
  } catch (error: any) {
    console.error(`${provider} OAuth linking error:`, error);
    return {
      success: false,
      error: error.message || "Failed to link OAuth account",
      provider,
    };
  }
}

/**
 * Unlink OAuth account from user
 */
export async function unlinkOAuthAccount(
  provider: Provider,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabaseClient = supabase;

    const { error } = await supabaseClient.auth.unlinkIdentity({
      provider,
    });

    if (error) {
      console.error(`${provider} OAuth unlinking error:`, error);
      return {
        success: false,
        error: error.message,
      };
    }

    // Log account unlinking
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();
    if (user) {
      await logOAuthEvent(user.id, "oauth_account_unlinked", provider, {
        provider,
        email: user.email,
      });
    }

    return { success: true };
  } catch (error: any) {
    console.error(`${provider} OAuth unlinking error:`, error);
    return {
      success: false,
      error: error.message || "Failed to unlink OAuth account",
    };
  }
}

/**
 * Get all linked OAuth providers for a user
 */
export async function getUserOAuthProviders(): Promise<{
  providers: Provider[];
  identities: any[];
  error?: string;
}> {
  try {
    const supabaseClient = supabase;

    const {
      data: { user },
      error,
    } = await supabaseClient.auth.getUser();

    if (error || !user) {
      return {
        providers: [],
        identities: [],
        error: "User not authenticated",
      };
    }

    const identities = user.identities || [];
    const providers = identities.map(
      (identity) => identity.provider as Provider,
    );

    return {
      providers,
      identities,
    };
  } catch (error: any) {
    console.error("Failed to get user OAuth providers:", error);
    return {
      providers: [],
      identities: [],
      error: error.message || "Failed to retrieve OAuth providers",
    };
  }
}

/**
 * Check if a specific OAuth provider is linked to the user
 */
export async function isOAuthProviderLinked(
  provider: Provider,
): Promise<boolean> {
  try {
    const { providers } = await getUserOAuthProviders();
    return providers.includes(provider);
  } catch (error) {
    console.error(`Failed to check if ${provider} is linked:`, error);
    return false;
  }
}

/**
 * Log OAuth-related security events
 */
async function logOAuthEvent(
  userId: string,
  eventType: string,
  provider: string,
  metadata: Record<string, any> = {},
): Promise<void> {
  try {
    await supabase.from("auth_security_events").insert({
      user_id: userId,
      event_type: eventType,
      severity: "low",
      description: getOAuthEventDescription(eventType, provider),
      metadata: {
        ...metadata,
        provider,
      },
    });
  } catch (error) {
    console.error("Failed to log OAuth event:", error);
  }
}

/**
 * Get human-readable description for OAuth events
 */
function getOAuthEventDescription(eventType: string, provider: string): string {
  const descriptions: Record<string, string> = {
    oauth_login_success: `User successfully logged in with ${provider}`,
    oauth_login_failed: `Failed login attempt with ${provider}`,
    oauth_account_linked: `${provider} account linked to user`,
    oauth_account_unlinked: `${provider} account unlinked from user`,
    oauth_callback_error: `OAuth callback error with ${provider}`,
  };

  return (
    descriptions[eventType] || `OAuth event: ${eventType} with ${provider}`
  );
}

/**
 * Get supported OAuth providers list
 */
export function getSupportedOAuthProviders(): Provider[] {
  return ["github", "azure", "google"];
}

/**
 * Check if OAuth provider is configured
 */
export function isOAuthProviderConfigured(provider: Provider): boolean {
  const envVarMap: Record<string, string> = {
    github: "GITHUB_CLIENT_ID",
    azure: "AZURE_CLIENT_ID",
    google: "GOOGLE_CLIENT_ID",
  };

  const envVar = envVarMap[provider];
  return envVar ? !!process.env[envVar] : false;
}

/**
 * Get OAuth provider display information
 */
export function getOAuthProviderInfo(provider: Provider): {
  name: string;
  icon: string;
  color: string;
  description: string;
} {
  const providerInfo: Record<string, any> = {
    github: {
      name: "GitHub",
      icon: "github",
      color: "#333",
      description: "Continue with your GitHub account",
    },
    azure: {
      name: "Microsoft",
      icon: "microsoft",
      color: "#0078d4",
      description: "Continue with your Microsoft account",
    },
    google: {
      name: "Google",
      icon: "google",
      color: "#4285f4",
      description: "Continue with your Google account",
    },
  };

  return (
    providerInfo[provider] || {
      name: provider,
      icon: "link",
      color: "#666",
      description: `Continue with ${provider}`,
    }
  );
}
