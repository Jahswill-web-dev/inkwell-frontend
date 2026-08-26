"use client";

import axios from "axios";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function useSignOut() {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const signOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    try {
      await axios.post("/api/auth/logout");
      router.replace("/login");
      router.refresh();
    } finally {
      setIsSigningOut(false);
    }
  };

  return { isSigningOut, signOut };
}
