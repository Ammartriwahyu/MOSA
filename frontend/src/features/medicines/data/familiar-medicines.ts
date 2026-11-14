
export const FAMILIAR_MEDICINES = [
  "Allopurinol",
  "Amlodipin",
  "Aspirin",
  "Atorvastatin",
  "Bisoprolol",
  "Candesartan",
  "Captopril",
  "Glimepirid",
  "Lansoprazol",
  "Mecobalamin",
  "Metformin",
  "Omeprazol",
  "Parasetamol",
  "Simvastatin",
  "Vitamin B Kompleks",
] as const;

export type FamiliarMedicine = (typeof FAMILIAR_MEDICINES)[number];
