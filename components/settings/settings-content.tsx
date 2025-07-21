"use client";

import { useState, useEffect } from "react";
import { error as logError } from "@/lib/utils/logger";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  User,
  Settings as SettingsIcon,
  LogOut,
  CheckCircle,
  XCircle,
  Building,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { supabase } from "@/lib/supabase/client";

interface UserProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string;
  company_name: string | null;
  phone: string | null;
  avatar_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

export function SettingsContent() {
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    if (user) {
      loadUserProfile();
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const loadUserProfile = async () => {
    if (!user) return;

    try {
      setProfileLoading(true);
      const { data: profile, error } = await supabase
        .from("profiles")
        .select(
          "id,full_name,email,role,company_name,phone,avatar_url,created_at,updated_at",
        )
        .eq("id", user.id)
        .single();

      if (error && error.code === "PGRST116") {
        // Profile doesn't exist, create one
        const newProfile = {
          id: user.id,
          full_name: user.user_metadata?.full_name || "",
          email: user.email,
          role: "viewer",
          company_name: user.user_metadata?.company_name || "",
          phone: "",
        };

        const { data: createdProfile, error: createError } = await supabase
          .from("profiles")
          .insert(newProfile)
          .select(
            "id,full_name,email,role,company_name,phone,avatar_url,created_at,updated_at",
          )
          .single();

        if (createError) {
          logError("Failed to create user profile", {
            error: createError,
            component: "Settings",
          });
          setMessage({ type: "error", text: "Failed to create user profile" });
        } else {
          setProfile(createdProfile);
        }
      } else if (error) {
        logError("Failed to load user profile", {
          error,
          component: "Settings",
        });
        setMessage({ type: "error", text: "Failed to load profile" });
      } else {
        setProfile(profile);
      }
    } catch (error) {
      logError("Unexpected error in settings", {
        error,
        component: "Settings",
      });
      setMessage({ type: "error", text: "An unexpected error occurred" });
    } finally {
      setProfileLoading(false);
    }
  };

  const saveProfile = async () => {
    if (!profile || !user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: profile.full_name,
          company_name: profile.company_name,
          phone: profile.phone,
        })
        .eq("id", user.id);

      if (error) throw error;

      setMessage({ type: "success", text: "Profile updated successfully!" });
    } catch (error) {
      logError("Failed to update profile", {
        error,
        component: "Settings",
      });
      setMessage({ type: "error", text: "Failed to update profile" });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await signOut();
      setMessage({ type: "success", text: "Signed out successfully" });
    } catch (error) {
      logError("Sign out failed", {
        error,
        component: "Settings",
      });
      setMessage({ type: "error", text: "Failed to sign out" });
    } finally {
      setLoading(false);
    }
  };

  if (profileLoading) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground">Loading settings...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-4xl">
      <div className="flex items-center gap-2 mb-6">
        <SettingsIcon className="h-6 w-6" />
        <h1 className="text-3xl font-bold">Settings</h1>
        <Badge variant="outline">EstimatePro</Badge>
      </div>

      {message && (
        <Alert
          variant={message.type === "success" ? "success" : "destructive"}
          className="mb-6"
        >
          {message.type === "success" ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <XCircle className="h-4 w-4" />
          )}
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="company" className="flex items-center gap-2">
            <Building className="h-4 w-4" />
            Company
          </TabsTrigger>
          <TabsTrigger value="account" className="flex items-center gap-2">
            <SettingsIcon className="h-4 w-4" />
            Account
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Personal Information
              </CardTitle>
              <CardDescription>
                Update your personal details and contact information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={profile?.full_name || ""}
                    onChange={(e) =>
                      setProfile((prev) =>
                        prev ? { ...prev, full_name: e.target.value } : null,
                      )
                    }
                    placeholder="Enter your full name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    value={user?.email || ""}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    Email cannot be changed
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={profile?.phone || ""}
                    onChange={(e) =>
                      setProfile((prev) =>
                        prev ? { ...prev, phone: e.target.value } : null,
                      )
                    }
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        profile?.role === "admin" ? "default" : "secondary"
                      }
                    >
                      {profile?.role || "viewer"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      Role is managed by administrators
                    </span>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="flex justify-end">
                <Button onClick={saveProfile} disabled={loading}>
                  {loading ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="company" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Company Information
              </CardTitle>
              <CardDescription>
                Manage your company details and business settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  value={profile?.company_name || ""}
                  onChange={(e) =>
                    setProfile((prev) =>
                      prev ? { ...prev, company_name: e.target.value } : null,
                    )
                  }
                  placeholder="Enter company name"
                />
              </div>

              <Separator />

              <div className="flex justify-end">
                <Button onClick={saveProfile} disabled={loading}>
                  {loading ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="account" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>
                Your account details and session information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>User ID</Label>
                <Input
                  value={user?.id || "Not available"}
                  disabled
                  className="text-xs font-mono"
                />
              </div>

              <div className="space-y-2">
                <Label>Account Created</Label>
                <Input
                  value={
                    user?.created_at
                      ? new Date(user.created_at).toLocaleDateString()
                      : "Not available"
                  }
                  disabled
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
              <CardDescription>
                Actions that affect your account session
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleSignOut}
                disabled={loading}
                variant="destructive"
                className="w-full"
              >
                <LogOut className="h-4 w-4 mr-2" />
                {loading ? "Signing out..." : "Sign Out"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
