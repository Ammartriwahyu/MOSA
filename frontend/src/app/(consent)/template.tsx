import type { ReactNode } from "react";
import { PageTransition } from "@/shared/motion";

export default function Template({ children }: { children: ReactNode }) {
  return <PageTransition className="flex min-w-0 flex-1 flex-col gap-4">{children}</PageTransition>;
}
