import { LiveClockBar } from "@/components/LiveClockBar";
import { NewsTickerBar } from "@/components/NewsTickerBar";
import { BirthdayCountdownBar } from "@/components/BirthdayCountdownBar";

/**
 * Combined top section: timer/date-time + news headlines + birthday card.
 * Wrapped together inside a single bordered (stroke) container.
 * The member name/greeting block is intentionally rendered BELOW this section
 * (kept inside the individual dashboards).
 */
export function HomeTopSection() {
  return (
    <section
      aria-label="হোম শীর্ষ সেকশন"
      className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-sm overflow-hidden shadow-sm divide-y divide-border/40"
    >
      <LiveClockBar />
      <NewsTickerBar />
      <div className="p-2 md:p-3">
        <BirthdayCountdownBar />
      </div>
    </section>
  );
}
