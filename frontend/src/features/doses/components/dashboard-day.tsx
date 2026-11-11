import { DASBOR, tanggalDasbor, waktuDasbor } from "@/shared/copy";
import { cx } from "@/shared/ui";

const shortWeekday = new Intl.DateTimeFormat("id-ID", { weekday: "short", timeZone: "Asia/Jakarta" });

/** Kalender dekoratif mengikuti tanggal WIB server; bukan pemilih riwayat. */
export function DashboardDay({ date, serverTime, calendar = false }: { date: string; serverTime: string; calendar?: boolean }) {
  const today = new Date(`${date}T12:00:00+07:00`);
  const days = [-1, 0, 1, 2, 3].map((offset) => {
    const day = new Date(today.getTime() + offset * 86_400_000);
    return { offset, day, iso: day.toISOString().slice(0, 10) };
  });

  return (
    <section aria-label={DASBOR.tanggalHariIni} className={cx("rounded-field bg-linear-to-b from-day-from to-day-to px-3.5 py-2.5", calendar && "flex flex-col gap-3.5 rounded-card p-4.5")}>
      <p className="text-body font-bold">
        <time dateTime={serverTime}>{tanggalDasbor(serverTime)} · {waktuDasbor(serverTime)}</time>
      </p>
      {calendar ? (
        <ol className="flex gap-2" aria-label={DASBOR.kalender}>
          {days.map(({ offset, day, iso }) => (
            <li key={offset} aria-current={offset === 0 ? "date" : undefined} className={cx("flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-sheet py-3", offset === 0 ? "bg-action text-on-action" : "bg-surface text-ink")}>
              <span className="text-small">{shortWeekday.format(day)}</span>
              <time className="text-section" dateTime={iso}>{day.getUTCDate()}</time>
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}
