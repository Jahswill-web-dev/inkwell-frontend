"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { consultantRequest } from "@/lib/consultant/client";
export function ExperienceSwitcher({
  current = "marketing",
}: {
  current?: "marketing" | "consultant";
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <div>
      <label>
        Experience{" "}
        <select
          aria-label="Experience"
          value={current}
          disabled={busy}
          onChange={async (event) => {
            const experience = event.target.value;
            setBusy(true);
            setError("");
            try {
              await consultantRequest("experience", "PUT", { experience });
              router.push(
                experience === "consultant" ? "/consultant" : "/dashboard",
              );
              router.refresh();
            } catch (error) {
              setError(
                error instanceof Error ? error.message : "Unable to switch.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <option value="marketing">Content marketing</option>
          <option value="consultant">Consultant</option>
        </select>
      </label>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
