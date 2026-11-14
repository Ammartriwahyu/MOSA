import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { useState } from "react";
import { describe, expect, test } from "vitest";
import { DRAFT, formatHariMinum } from "@/shared/copy";
import { IntakeDaysField } from "./intake-days-field";

function Harness({ initial = [1, 2, 3, 4, 5, 6, 7], error }: { initial?: number[]; error?: string }) {
  const [days, setDays] = useState(initial);
  return <><IntakeDaysField days={days} onChange={setDays} error={error} /><output>{days.join(",")}</output></>;
}

describe("IntakeDaysField", () => {
  test("bawaan setiap hari; mematikannya membuka pilihan hari tanpa hari terpilih", async () => {
    const user = userEvent.setup();
    const { container } = render(<Harness />);
    const everyDay = screen.getByRole("checkbox", { name: DRAFT.setiapHari });
    expect(everyDay).toBeChecked();
    expect(screen.queryByRole("checkbox", { name: "Senin" })).not.toBeInTheDocument();
    await user.click(everyDay);
    expect(container.querySelector("output")?.textContent).toBe("");
    await user.click(screen.getByRole("checkbox", { name: "Jumat" }));
    await user.click(screen.getByRole("checkbox", { name: "Senin" }));
    expect(screen.getByText("1,5", { selector: "output" })).toBeInTheDocument();
  });

  test("memilih ketujuh hari kembali menjadi setiap hari", async () => {
    const user = userEvent.setup();
    render(<Harness initial={[1, 2, 3, 4, 5, 6]} />);
    await user.click(screen.getByRole("checkbox", { name: "Minggu" }));
    expect(screen.getByRole("checkbox", { name: DRAFT.setiapHari })).toBeChecked();
  });

  test("galat tampil dan lolos axe", async () => {
    const { container } = render(<Harness initial={[]} error={DRAFT.galatHariMinimal} />);
    expect(screen.getByRole("alert")).toHaveTextContent(DRAFT.galatHariMinimal);
    expect((await axe.run(container)).violations).toEqual([]);
  });

  test("formatHariMinum: semua hari = Setiap hari, selain itu nama hari berurutan", () => {
    expect(formatHariMinum([7, 6, 5, 4, 3, 2, 1])).toBe(DRAFT.setiapHari);
    expect(formatHariMinum([5, 1, 3])).toBe("Senin, Rabu, Jumat");
  });
});
