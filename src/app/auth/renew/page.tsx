"use client";

import { useEffect } from "react";
import { safeProtectedPath } from "@/lib/auth/constants";

export default function RenewSessionPage() {
  useEffect(() => {
    const next = safeProtectedPath(
      new URLSearchParams(window.location.search).get("next"),
    );
    void fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "same-origin",
    })
      .then((response) => {
        if (response.ok) return next;
        if (response.status === 401)
          return `/login?next=${encodeURIComponent(next)}`;
        return `/auth/unavailable?next=${encodeURIComponent(next)}`;
      })
      .catch(() => `/auth/unavailable?next=${encodeURIComponent(next)}`)
      .then((destination) => window.location.replace(destination));
  }, []);

  return <p role="status">Restoring your Inkwell session…</p>;
}
