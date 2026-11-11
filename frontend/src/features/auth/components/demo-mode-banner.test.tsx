import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { AUTH } from "@/shared/copy";
import { householdQueryKey } from "../api/household";
import { DemoModeBanner } from "./demo-mode-banner";

function renderWith(isDemo: boolean) {
  const client = new QueryClient();
  client.setQueryData(householdQueryKey, { dataConsentAt: "x", scanConsentAt: null, outputMode: null, isDemo });
  return render(
    <QueryClientProvider client={client}>
      <DemoModeBanner />
    </QueryClientProvider>,
  );
}

describe("DemoModeBanner", () => {
  test("akun demo ditandai jelas", () => {
    renderWith(true);
    expect(screen.getByRole("status")).toHaveTextContent(AUTH.modeDemo);
  });

  test("akun biasa tidak menampilkan penanda", () => {
    renderWith(false);
    expect(screen.queryByText(AUTH.modeDemo)).not.toBeInTheDocument();
  });
});
