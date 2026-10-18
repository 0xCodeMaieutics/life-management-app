"use client";

import type { ReactNode } from "react";

import { Toaster } from "@/components/ui/sonner";
import { TRPCReactProvider } from "@/trpc/client";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <TRPCReactProvider>
      {children}
      <Toaster />
    </TRPCReactProvider>
  );
}
