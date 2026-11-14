import { OutputPreferenceScreen } from "@/features/preferences";

export default async function OutputPreferencePage({ searchParams }: PageProps<"/output-preference">) {
  const { next } = await searchParams;
  return <OutputPreferenceScreen next={typeof next === "string" ? next : undefined} />;
}
