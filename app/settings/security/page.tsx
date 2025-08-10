"use client";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { MFASettingsPage } from "@/components/auth/mfa-settings-page";
import { useRouter } from "next/navigation";

export default function SecuritySettingsPage() {
  const router = useRouter();

  return (
    <ProtectedRoute>
      <div className="container max-w-4xl mx-auto p-6">
        <MFASettingsPage onBack={() => router.push("/settings")} />
      </div>
    </ProtectedRoute>
  );
}
