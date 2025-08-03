import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

// Server-side Supabase client for API routes
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    },
  );
}

// Authenticate API requests and return user
export async function authenticateRequest(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    // First, try to get session from cookies
    let session = null;
    try {
      const {
        data: { session: cookieSession },
        error: cookieError,
      } = await supabase.auth.getSession();
      if (!cookieError && cookieSession) {
        session = cookieSession;
      }
    } catch (cookieError) {
      console.log("No valid cookie session found, trying Authorization header");
    }

    // If no cookie session, try Authorization header
    if (!session) {
      const authHeader = request.headers.get("Authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.substring(7); // Remove 'Bearer ' prefix
        try {
          const {
            data: { user },
            error,
          } = await supabase.auth.getUser(token);
          if (user && !error) {
            session = { user, access_token: token, refresh_token: null };
          }
        } catch (tokenError) {
          console.error("Invalid token:", tokenError);
        }
      }
    }

    if (!session) {
      return { user: null, error: "Unauthorized" };
    }

    return { user: session.user, error: null };
  } catch (error) {
    console.error("Authentication error:", error);
    return { user: null, error: "Authentication failed" };
  }
}

// Get server session
export async function getServerSession() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      console.error("Error getting session:", error);
      return { user: null, session: null, error };
    }

    return { user: session?.user || null, session, error: null };
  } catch (error) {
    console.error("Error in getServerSession:", error);
    return { user: null, session: null, error: "Session error" };
  }
}

// Simple user getter function for API routes
export async function getUser() {
  const { user } = await getServerSession();
  return user;
}

// Get user profile with role information
export async function getUserProfile(userId: string) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Error fetching user profile:", error);
      return null;
    }

    return profile;
  } catch (error) {
    console.error("Error getting user profile:", error);
    return null;
  }
}

// Check if user has required role
export async function hasRequiredRole(userId: string, requiredRole: string) {
  const profile = await getUserProfile(userId);
  if (!profile) return false;

  const roleHierarchy = {
    viewer: 1,
    sales: 2,
    admin: 3,
  };

  const userRoleLevel =
    roleHierarchy[profile.role as keyof typeof roleHierarchy] || 0;
  const requiredRoleLevel =
    roleHierarchy[requiredRole as keyof typeof roleHierarchy] || 0;

  return userRoleLevel >= requiredRoleLevel;
}
