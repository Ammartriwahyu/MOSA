
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  DEMO_DATA_CONSENT_AT,
  DEMO_HOUSEHOLD_ID,
  DEMO_USER_ID,
  demoMedicines,
  type SeedMode,
} from "./demo-data";

const envSchema = z.object({
  SUPABASE_URL: z.url(),
  SUPABASE_SECRET_KEY: z.string().min(1),
  DEMO_EMAIL: z.email(),
  DEMO_PASSWORD: z.string().min(8),
});

function fail(message: string): never {
  console.error(`Seed demo gagal: ${message}`);
  process.exit(1);
}

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  const names = [...new Set(parsed.error.issues.map((issue) => String(issue.path[0])))];
  fail(`variabel di backend/.env belum diisi atau tidak valid: ${names.join(", ")}`);
}
const env = parsed.data;
const mode: SeedMode = process.argv.includes("--due") ? "jatuh_tempo" : "normal";

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function ensureDemoUser(): Promise<void> {
  const attributes = { email: env.DEMO_EMAIL, password: env.DEMO_PASSWORD, email_confirm: true };
  const existing = await supabase.auth.admin.getUserById(DEMO_USER_ID);

  if (existing.data.user) {

    const { error } = await supabase.auth.admin.updateUserById(DEMO_USER_ID, attributes);
    if (error) fail(`memperbarui pengguna demo (${error.status ?? "?"} ${error.code ?? ""})`);
    return;
  }
  if (existing.error && existing.error.status !== 404) {
    fail(`membaca pengguna demo (${existing.error.status ?? "?"} ${existing.error.code ?? ""})`);
  }

  const { error } = await supabase.auth.admin.createUser({ id: DEMO_USER_ID, ...attributes });
  if (error) {
    fail(
      `membuat pengguna demo (${error.status ?? "?"} ${error.code ?? ""}). ` +
        "Bila email sudah dipakai akun lain, ganti DEMO_EMAIL atau hapus akun itu di dasbor.",
    );
  }
}

async function resetDemoHousehold(): Promise<void> {
  const household = await supabase.from("households").upsert(
    {
      id: DEMO_HOUSEHOLD_ID,
      owner_user_id: DEMO_USER_ID,
      is_demo: true,
      data_consent_at: DEMO_DATA_CONSENT_AT,

      scan_consent_at: null,
      output_mode: null,
    },
    { onConflict: "id" },
  );
  if (household.error) fail(`rumah tangga demo (${household.error.code})`);

  const medicines = demoMedicines(mode, new Date()).map((medicine) => ({
    ...medicine,

    intake_times_started_at: Object.fromEntries(medicine.intake_times.map((time) => [time, medicine.created_at])),
  }));
  const keepIds = medicines.map((m) => m.id);

  const confirmations = await supabase
    .from("dose_confirmations")
    .delete()
    .eq("household_id", DEMO_HOUSEHOLD_ID);
  if (confirmations.error) fail(`menghapus catatan minum demo (${confirmations.error.code})`);

  const extras = await supabase
    .from("medicines")
    .delete()
    .eq("household_id", DEMO_HOUSEHOLD_ID)
    .not("id", "in", `(${keepIds.join(",")})`);
  if (extras.error) fail(`menghapus obat tambahan demo (${extras.error.code})`);

  const upserted = await supabase.from("medicines").upsert(medicines, { onConflict: "id" });
  if (upserted.error) fail(`obat demo (${upserted.error.code})`);

  const usage = await supabase.from("ai_usage").delete().eq("household_id", DEMO_HOUSEHOLD_ID);
  if (usage.error) fail(`jatah AI demo (${usage.error.code})`);
}

await ensureDemoUser();
await resetDemoHousehold();

const due = mode === "jatuh_tempo" ? demoMedicines(mode, new Date())[1]?.intake_times[0] : null;
console.info(
  due
    ? `Seed demo selesai (mode jatuh tempo): satu dosis demo dijadwalkan ${due.replace(":", ".")} WIB.`
    : "Seed demo selesai (jadwal normal).",
);

export {};
