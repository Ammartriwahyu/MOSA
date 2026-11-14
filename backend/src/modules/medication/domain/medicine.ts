import { domainError, type DomainError } from "../../../shared/domain/domain-error.js";
import { err, ok, type Result } from "../../../shared/domain/result.js";
import { isFaithfulExplanation } from "./services/explanation-guard.js";
import { normalizeMedicineName } from "./services/medicine-name-normalizer.js";
import { parseScheduleTimes } from "./value-objects/schedule-times.js";
import { parseStrength } from "./value-objects/strength.js";

export type LabelSource = "apoteker" | "keluarga";

export type ExplanationOrigin = "ai_dikonfirmasi" | "teks_pengisi";

export type Medicine = {
  readonly id: string;
  readonly householdId: string;
  readonly name: string;
  readonly nameNormalized: string;
  readonly strength: string;
  readonly strengthNormalized: string;
  readonly purpose: string;
  readonly doseAmount: string;
  readonly usageRule: string;
  readonly warnings: string;
  readonly notes: string | null;

  readonly intakeTimes: readonly string[];
  readonly labelSource: LabelSource;
  readonly explanation: string | null;
  readonly explanationOrigin: ExplanationOrigin;
  readonly active: boolean;

  readonly createdAt: number;
};

export type MedicineInput = {
  readonly name: string;
  readonly strength: string;
  readonly purpose: string;
  readonly doseAmount: string;
  readonly usageRule: string;
  readonly warnings: string;
  readonly notes: string | null;
  readonly intakeTimes: readonly string[];
  readonly labelSource: LabelSource;
  readonly explanationOrigin: ExplanationOrigin;

  readonly explanation: string | null;
};

export type MedicineDraft = Omit<Medicine, "id" | "householdId" | "active" | "createdAt">;

export const LIMITS = {
  name: 100,
  strength: 30,
  purpose: 300,
  doseAmount: 50,
  usageRule: 300,
  warnings: 500,
  notes: 500,
  explanation: 600,
} as const;

type Field = keyof MedicineInput;

function requiredText(value: string, max: number): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= max ? trimmed : null;
}

export function validateMedicineInput(input: MedicineInput): Result<MedicineDraft, DomainError> {
  const invalid: Field[] = [];
  const text = (field: Field, value: string, max: number) => {
    const result = requiredText(value, max);
    if (result === null) invalid.push(field);
    return result ?? "";
  };

  const name = text("name", input.name, LIMITS.name);
  const nameNormalized = normalizeMedicineName(name);
  if (name && !nameNormalized) invalid.push("name");

  const strength = text("strength", input.strength, LIMITS.strength);
  const parsedStrength = strength ? parseStrength(strength) : null;
  if (strength && !parsedStrength) invalid.push("strength");

  const purpose = text("purpose", input.purpose, LIMITS.purpose);
  const doseAmount = text("doseAmount", input.doseAmount, LIMITS.doseAmount);
  const usageRule = text("usageRule", input.usageRule, LIMITS.usageRule);

  const warnings = text("warnings", input.warnings, LIMITS.warnings);

  const notesTrimmed = input.notes?.trim() ?? "";
  if (notesTrimmed.length > LIMITS.notes) invalid.push("notes");
  const notes = notesTrimmed.length > 0 ? notesTrimmed : null;

  const times = parseScheduleTimes(input.intakeTimes);
  if (!times.ok) invalid.push("intakeTimes");

  let explanation: string | null = null;
  if (input.explanationOrigin === "ai_dikonfirmasi") {
    explanation = requiredText(input.explanation ?? "", LIMITS.explanation);

    const source = [usageRule, warnings, notes ?? ""].join("\n");
    if (explanation === null || !isFaithfulExplanation(source, explanation)) invalid.push("explanation");
  } else if (input.explanation !== null && input.explanation.trim() !== "") {
    invalid.push("explanation");
  }

  if (invalid.length > 0 || !parsedStrength || !times.ok) {
    return err(
      domainError("VALIDATION_FAILED", "Data obat tidak valid.", { fields: [...new Set(invalid)] }),
    );
  }

  return ok({
    name,
    nameNormalized,
    strength,
    strengthNormalized: parsedStrength.normalized,
    purpose,
    doseAmount,
    usageRule,
    warnings,
    notes,
    intakeTimes: times.value,
    labelSource: input.labelSource,
    explanation,
    explanationOrigin: input.explanationOrigin,
  });
}

export function reviseMedicine(medicine: Medicine, input: MedicineInput): Result<Medicine, DomainError> {
  if (!medicine.active) return err(domainError("NOT_FOUND", "Obat tidak ditemukan."));
  const draft = validateMedicineInput(input);
  if (!draft.ok) return draft;
  return ok({ ...medicine, ...draft.value });
}

export function deactivateMedicine(medicine: Medicine): Result<Medicine, DomainError> {
  if (!medicine.active) return err(domainError("NOT_FOUND", "Obat tidak ditemukan."));
  return ok({ ...medicine, active: false });
}
