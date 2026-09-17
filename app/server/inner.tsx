"use client";

import { Preloaded, usePreloadedQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export default function Home({
  preloaded,
}: {
  preloaded: Preloaded<typeof api.myFunctions.getViewer>;
}) {
  const viewer = usePreloadedQuery(preloaded);
  return (
    <div className="flex flex-col gap-4 bg-slate-200 dark:bg-slate-800 p-4 rounded-md">
      <h2 className="text-xl font-bold">Server Preloaded User Viewer</h2>
      <p>{viewer ? `Authenticated as: ${viewer}` : "Not authenticated"}</p>
    </div>
  );
}
