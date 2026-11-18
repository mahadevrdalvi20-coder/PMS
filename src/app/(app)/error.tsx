"use client";

import { useEffect } from "react";
import { Alert, buttonClass } from "@/components/ui";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => console.error(error), [error]);
  return (
    <div className="mx-auto max-w-lg py-16">
      <Alert tone="error" title="Something went wrong">
        {error.message || "An unexpected error occurred."} If this keeps happening, check the browser console and the server logs.
      </Alert>
      <div className="mt-4 flex gap-2">
        <button onClick={reset} className={buttonClass("secondary")}>
          Try again
        </button>
        <a href="/setup" className={buttonClass("ghost")}>
          Run setup check
        </a>
      </div>
    </div>
  );
}
