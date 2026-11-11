// Uji manual sungguhan ke Gemini (P04): satu panggilan penjelasan dengan teks
// fiktif, melewati adaptor dan pagar keluaran yang sama dengan aplikasi, tanpa
// jatah harian (tidak menyentuh database). Kunci dibaca dari backend/.env dan
// tidak pernah dicetak; yang dicetak hanya model, latensi, dan hasil fiktif.

import { ExplainMedicineText } from "../src/modules/medication/application/explain-medicine-text.use-case";
import { GeminiPlainLanguageExplainer } from "../src/modules/medication/infrastructure/gemini-plain-language-explainer";
import {
  createGeminiGenerateContent,
  GeminiJsonGenerator,
} from "../src/shared/infrastructure/gemini-json-generator";

const apiKey = process.env.GEMINI_API_KEY;
const model = process.env.GEMINI_MODEL;

if (!apiKey || !model) {
  console.error("Isi GEMINI_API_KEY dan GEMINI_MODEL di backend/.env.");
  process.exit(1);
}

// Data fiktif.
const SAMPLE = {
  householdId: "uji-manual",
  aturanPakai: "Diminum 2 x sehari 1 tablet sesudah makan pagi dan malam",
  larangan: "Jangan dihentikan mendadak tanpa petunjuk dokter",
  catatan: "Simpan di tempat kering, jauh dari sinar matahari langsung",
};

const gemini = new GeminiJsonGenerator(createGeminiGenerateContent(apiKey), { model });
const useCase = new ExplainMedicineText(new GeminiPlainLanguageExplainer(gemini));

const started = performance.now();
const result = await useCase.execute(SAMPLE);
const latencyMs = Math.round(performance.now() - started);

console.info(JSON.stringify({ model, latencyMs, result }, null, 2));
// exitCode, bukan exit(): exit() saat koneksi fetch masih menutup memicu galat libuv di Windows.
process.exitCode = result.ok ? 0 : 1;
