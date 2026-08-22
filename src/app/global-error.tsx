"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => { Sentry.captureException(error); }, [error]);
  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
        <main className="max-w-md text-center">
          <h1 className="text-xl font-semibold">CodeGenie hit an unexpected error</h1>
          <p className="mt-2 text-sm text-muted-foreground">The error was recorded. Refresh the page to continue from your saved project state.</p>
          <button className="mt-5 rounded-md bg-foreground px-4 py-2 text-sm text-background" onClick={() => window.location.reload()}>Refresh</button>
        </main>
      </body>
    </html>
  );
}
