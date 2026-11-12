import { focusManager, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { getTodaysDoses } from "../api/doses";
import { DOSES_POLL_INTERVAL_MS } from "../config";
import { todaysDosesFixture } from "../testing/dosing-fixture";
import { useTodaysDoses } from "./use-todays-doses";

vi.mock("../api/doses", () => ({ getTodaysDoses: vi.fn() }));
const getDoses = vi.mocked(getTodaysDoses);
function Probe() { const q = useTodaysDoses(); return <p>{q.data?.serverTime}</p>; }
afterEach(() => { focusManager.setFocused(undefined); getDoses.mockReset(); vi.useRealTimers(); });

test("polling 20 dtk, tidak di latar, dan kembali fokus mengambil waktu/status server baru", async () => {
  vi.useFakeTimers();
  focusManager.setFocused(true);
  let data = todaysDosesFixture();
  getDoses.mockImplementation(async () => data);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const view = render(<QueryClientProvider client={client}><Probe /></QueryClientProvider>);
  try {
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    expect(getDoses).toHaveBeenCalledOnce();
    expect(screen.getByText(data.serverTime)).toBeInTheDocument();
    data = { ...data, serverTime: "2026-11-11T00:30:20Z" };
    await act(async () => { await vi.advanceTimersByTimeAsync(DOSES_POLL_INTERVAL_MS); });
    expect(getDoses).toHaveBeenCalledTimes(2);
    expect(screen.getByText(data.serverTime)).toBeInTheDocument();
    focusManager.setFocused(false);
    await act(async () => { await vi.advanceTimersByTimeAsync(DOSES_POLL_INTERVAL_MS); });
    expect(getDoses).toHaveBeenCalledTimes(2);
    await act(async () => { focusManager.setFocused(true); await vi.advanceTimersByTimeAsync(1); });
    expect(getDoses).toHaveBeenCalledTimes(3);
  } finally { view.unmount(); client.clear(); }
});
