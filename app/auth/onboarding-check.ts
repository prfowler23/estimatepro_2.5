import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function checkOnboardingStatus() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("id", user.id)
    .single();

  if (!profile?.onboarding_completed) {
    return redirect("/onboarding");
  }

  return { user, profile };
}
