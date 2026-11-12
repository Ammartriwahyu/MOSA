"use client";
import { useRouter } from "next/navigation";
import { useHousehold } from "@/features/auth";
import { ROUTES, safeInternalPath } from "@/shared/config";
import { PREFERENSI } from "@/shared/copy";
import { PageHeader, Spinner } from "@/shared/ui";
import { OutputPreferenceChoice } from "./output-preference-choice";

export function OutputPreferenceScreen({ next }: { next?: string }) {
  const router = useRouter();
  const household = useHousehold();
  const destination = safeInternalPath(next, ROUTES.home);
  if (household.isPending) return <Spinner visibleLabel />;
  return <>
    <PageHeader title={PREFERENSI.judulLayar} />
    <OutputPreferenceChoice outputMode={household.data?.outputMode ?? null} continueToResult={Boolean(next)} onSaved={() => router.replace(destination)} />
  </>;
}
