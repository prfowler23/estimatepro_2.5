"use client";

import { useEffect } from "react";
import { redirect } from "next/navigation";

export default function QuotesPage() {
  useEffect(() => {
    // Redirect to the estimates listing page
    redirect("/estimates");
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Redirecting...</h1>
        <p className="text-muted-foreground">
          Taking you to the estimates listing
        </p>
      </div>
    </div>
  );
}
