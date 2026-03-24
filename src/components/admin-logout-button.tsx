"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AdminLogoutButton() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleLogout() {
    setIsSubmitting(true);

    try {
      await fetch("/api/admin/session", {
        method: "DELETE",
      });
    } finally {
      router.replace("/admin/login");
      router.refresh();
      setIsSubmitting(false);
    }
  }

  return (
    <button
      type="button"
      className="inline-flex items-center justify-center rounded-full border border-card-border bg-white/80 px-5 py-3 text-sm font-medium text-foreground hover:-translate-y-0.5 hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"
      onClick={handleLogout}
      disabled={isSubmitting}
    >
      {isSubmitting ? "Выхожу..." : "Выйти"}
    </button>
  );
}
