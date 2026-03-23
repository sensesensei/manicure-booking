import type { Slot } from "@/types/slot";

type SlotsListProps = {
  slots: Slot[];
  selectedTime: string;
  isLoading: boolean;
  onSelect: (time: string) => void;
};

const statusCopy = {
  free: "Свободно",
  booked: "Занято",
  past: "Время прошло",
} as const;

export function SlotsList({
  slots,
  selectedTime,
  isLoading,
  onSelect,
}: SlotsListProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div
            key={index}
            className="h-20 animate-pulse rounded-[20px] border border-card-border bg-white/60"
          />
        ))}
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="rounded-[20px] border border-dashed border-card-border bg-white/55 p-4 text-sm leading-6 text-muted">
        На выбранный день пока нет доступных окон.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {slots.map((slot) => {
        const isActive = slot.time === selectedTime && !slot.isDisabled;
        const isBooked = slot.status === "booked";
        const isPast = slot.status === "past";

        const className = [
          "rounded-[22px] border p-4 text-left shadow-[0_10px_28px_rgba(95,65,52,0.06)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
          slot.isDisabled
            ? "cursor-not-allowed border-card-border bg-white/45 text-muted/80"
            : "cursor-pointer border-card-border bg-white hover:-translate-y-0.5 hover:border-accent/55 hover:bg-[#fff8f1]",
          isActive ? "border-accent bg-[#fff0e5] shadow-[0_16px_34px_rgba(185,109,82,0.16)]" : "",
          isBooked ? "border-danger/25 bg-danger-soft/50" : "",
          isPast ? "border-card-border bg-[#f0e8e2]" : "",
        ].join(" ");

        return (
          <button
            key={slot.time}
            type="button"
            disabled={slot.isDisabled}
            className={className}
            onClick={() => onSelect(slot.time)}
            aria-pressed={isActive}
          >
            <p className="text-lg font-semibold text-foreground">{slot.label}</p>
            <p className="mt-2 text-xs uppercase tracking-[0.18em] text-muted">
              {statusCopy[slot.status]}
            </p>
          </button>
        );
      })}
    </div>
  );
}
