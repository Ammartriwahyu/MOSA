
export type PackageReading = {
  readonly names: readonly string[];
  readonly strength: string | null;
  readonly legible: boolean;
};

export type RegisteredMedicine = {
  readonly medicineId: string;
  readonly name: string;
  readonly strength: string;
};
