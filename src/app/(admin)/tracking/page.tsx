"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function TrackingPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/statistiques");
  }, [router]);

  return (
    <div className="flex min-h-[240px] items-center justify-center rounded-2xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
      Redirection vers la page statistiques...
    </div>
  );
}
