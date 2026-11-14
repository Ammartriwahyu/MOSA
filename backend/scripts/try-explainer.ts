
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

const SAMPLE = {
  householdId: "uji-manual",
  usageRule: "Diminum 2 x sehari 1 tablet sesudah makan pagi dan malam",
  warnings: "Jangan dihentikan mendadak tanpa petunjuk dokter",
  notes: "Simpan di tempat kering, jauh dari sinar matahari langsung",
};

const gemini = new GeminiJsonGenerator(createGeminiGenerateContent(apiKey), { model });
const useCase = new ExplainMedicineText(new GeminiPlainLanguageExplainer(gemini));

const started = performance.now();
const result = await useCase.execute(SAMPLE);
const latencyMs = Math.round(performance.now() - started);

console.info(JSON.stringify({ model, latencyMs, result }, null, 2));

process.exitCode = result.ok ? 0 : 1;
