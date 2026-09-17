"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Critical root layout error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center p-4 font-sans antialiased">
        <div className="max-w-md w-full text-center space-y-6 bg-neutral-900 border border-neutral-800 p-8 rounded-2xl shadow-2xl">
          <div className="mx-auto w-16 h-16 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center border border-red-500/20 text-2xl font-bold">
            !
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Critical Application Error
            </h1>
            <p className="text-neutral-400 text-sm">
              The application encountered a critical system error. Please try reloading the page.
            </p>
            {error.digest && (
              <p className="text-xs text-neutral-500 font-mono">
                Error ID: {error.digest}
              </p>
            )}
          </div>

          <div className="pt-2">
            <button
              onClick={() => reset()}
              className="w-full px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition-colors shadow-lg shadow-blue-600/20"
            >
              Reload Application
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
