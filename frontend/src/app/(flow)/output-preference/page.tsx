import { OutputPreferenceScreen } from "@/features/preferences";

// /output-preference?next=<path internal>: pilihan Teks/Suara (Figma 09).
export default async function OutputPreferencePage({ searchParams }: PageProps<"/output-preference">) {
  const { next } = await searchParams;
  return <OutputPreferenceScreen next={typeof next === "string" ? next : undefined} />;
}
