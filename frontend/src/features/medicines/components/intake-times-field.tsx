"use client";

import { Plus } from "lucide-react";
import { useId } from "react";
import { FORM_OBAT, labelJamMinum, OBAT } from "@/shared/copy";
import { Button, CheckboxCard, TextField } from "@/shared/ui";
import { MAX_INTAKE_TIMES, type TimeRow } from "../schemas/medicine-form";

export function IntakeTimesField({
  rows,
  onChange,
  error,
  rowErrors = {},
}: {
  rows: TimeRow[];
  onChange: (rows: TimeRow[]) => void;
  error?: string;
  rowErrors?: Record<string, string>;
}) {
  const id = useId();
  const errorId = `${id}-galat`;

  const update = (key: string, patch: Partial<TimeRow>) =>
    onChange(rows.map((row) => (row.key === key ? { ...row, ...patch } : row)));

  const addRow = () => onChange([...rows, { key: `${id}-${rows.length}`, time: "", checked: true }]);

  return (
    <fieldset className="flex flex-col gap-3" aria-describedby={error ? errorId : undefined}>
      <legend className="pb-1 text-card-title">{OBAT.jamMinum}</legend>
      {rows.map((row) => (
        <div key={row.key} className="flex flex-col gap-2">
          <CheckboxCard
            label={row.time ? labelJamMinum(row.time) : FORM_OBAT.jamLain}
            description={row.checked ? FORM_OBAT.jamBisaDiubah : undefined}
            checked={row.checked}
            onChange={(event) => update(row.key, { checked: event.target.checked })}
          />
          {row.checked ? (
            <TextField
              type="time"
              label={`${FORM_OBAT.ubahJam}: ${row.time ? labelJamMinum(row.time) : FORM_OBAT.jamLain}`}
              value={row.time}
              onChange={(event) => update(row.key, { time: event.target.value })}
              error={rowErrors[row.key]}
            />
          ) : null}
        </div>
      ))}
      {rows.length < MAX_INTAKE_TIMES ? (
        <Button variant="secondary" icon={<Plus />} onClick={addRow}>
          {FORM_OBAT.tambahJam}
        </Button>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="text-body font-semibold text-danger">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
