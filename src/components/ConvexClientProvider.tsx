"use client";

import { ConvexReactClient } from "convex/react";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ReactNode } from "react";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!convexUrl && typeof window === "undefined") {
  // During build time on the server, if the URL is missing, we don't want to crash.
  // We provide a dummy URL just to allow the build to complete.
  // At runtime on the client, the variable must be present.
}
const convex = new ConvexReactClient(convexUrl || "https://unknown.convex.cloud");

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexAuthProvider client={convex}>
      {children}
    </ConvexAuthProvider>
  );
}
