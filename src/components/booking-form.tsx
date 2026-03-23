"use client";

import { startTransition, useEffect, useEffectEvent, useState } from "react";
import { SlotsList } from "@/components/slots-list";
import { BOOKING_WINDOW_DAYS } from "@/constants";
import { formatDateLabel, getUpcomingDays } from "@/lib/utils";
import type {
  BookingCreateResponse,
  BookingsListResponse,
} from "@/types/booking";
import type { Slot } from "@/types/slot";

type StatusState = {
  tone: "idle" | "success" | "error";
  message: string;
};

type FormState = {
  clientName: string;
  phone: string;
  telegram: string;
  note: string;
};

const initialFormState: FormState = {
  clientName: "",
  phone: "",
  telegram: "",
  note: "",
};

function readErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function normalizeServerErrorText(raw: string) {
  const normalized = raw.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

  if (!normalized) {
    return "Сервер вернул пустой ответ. Попробуй ещё раз.";
  }

  if (normalized.includes("Internal Server Error")) {
    return "Сервер вернул Internal Server Error. Перезапусти `npm.cmd run dev` и повтори попытку.";
  }

  return normalized;
}

async function readApiResponse<T>(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return (await response.json()) as T | { error?: string };
  }

  return {
    error: normalizeServerErrorText(await response.text()),
  };
}

export function BookingForm() {
  const [days] = useState(() => getUpcomingDays());
  const [selectedDate, setSelectedDate] = useState(() => days[0]?.value ?? "");
  const [selectedTime, setSelectedTime] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [formState, setFormState] = useState<FormState>(initialFormState);
  const [status, setStatus] = useState<StatusState>({
    tone: "idle",
    message: "",
  });
  const [isLoadingSlots, setIsLoadingSlots] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reloadNonce, setReloadNonce] = useState(0);

  const loadSlots = useEffectEvent(async (date: string) => {
    if (!date) {
      return;
    }

    setIsLoadingSlots(true);

    try {
      const response = await fetch(`/api/bookings?date=${date}`, {
        cache: "no-store",
      });
      const data = await readApiResponse<BookingsListResponse>(response);

      if (!response.ok) {
        throw new Error(
          ("error" in data ? data.error : undefined) ??
            "Не удалось загрузить доступные слоты.",
        );
      }

      if (!("slots" in data)) {
        throw new Error("Сервер вернул неожиданный ответ при загрузке слотов.");
      }

      startTransition(() => {
        setSlots(data.slots);
        setSelectedTime((current) => {
          const currentStillAvailable = data.slots.some(
            (slot) => slot.time === current && slot.status === "free",
          );

          if (currentStillAvailable) {
            return current;
          }

          return data.slots.find((slot) => slot.status === "free")?.time ?? "";
        });
      });
    } catch (error) {
      setSlots([]);
      setSelectedTime("");
      setStatus({
        tone: "error",
        message: readErrorMessage(
          error,
          "Не удалось загрузить слоты. Попробуй ещё раз.",
        ),
      });
    } finally {
      setIsLoadingSlots(false);
    }
  });

  useEffect(() => {
    void loadSlots(selectedDate);
  }, [selectedDate, reloadNonce]);

  function updateField(field: keyof FormState, value: string) {
    setFormState((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedTime) {
      setStatus({
        tone: "error",
        message: "Сначала выбери свободный слот по времени.",
      });
      return;
    }

    setIsSubmitting(true);
    setStatus({
      tone: "idle",
      message: "",
    });

    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formState,
          bookingDate: selectedDate,
          bookingTime: selectedTime,
        }),
      });

      const data = await readApiResponse<BookingCreateResponse>(response);

      if (!response.ok) {
        throw new Error(
          ("error" in data ? data.error : undefined) ??
            "Не удалось сохранить запись.",
        );
      }

      if (!("telegramDelivered" in data)) {
        throw new Error("Сервер вернул неожиданный ответ после создания записи.");
      }

      setFormState(initialFormState);
      setStatus({
        tone: "success",
        message: data.telegramDelivered
          ? "Запись сохранена, а уведомление уже отправлено в Telegram."
          : data.telegramWarning ??
            "Запись сохранена, но Telegram пока не настроен.",
      });

      setReloadNonce((value) => value + 1);
    } catch (error) {
      setStatus({
        tone: "error",
        message: readErrorMessage(
          error,
          "Не удалось оформить запись. Попробуй ещё раз.",
        ),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const freeSlotsCount = slots.filter((slot) => slot.status === "free").length;
  const statusClassName =
    status.tone === "success"
      ? "border-success/25 bg-success-soft text-success"
      : status.tone === "error"
        ? "border-danger/25 bg-danger-soft text-danger"
        : "hidden";

  return (
    <section
      id="booking"
      className="scroll-mt-24 rounded-[32px] border border-card-border bg-paper-strong p-6 shadow-[0_30px_90px_rgba(75,40,28,0.12)] sm:p-8"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.22em] text-muted">
            Онлайн-запись
          </p>
          <h2 className="mt-3 font-[family-name:var(--font-display)] text-4xl leading-none text-foreground">
            Выбери день и время
          </h2>
        </div>
        <div className="rounded-full border border-card-border bg-white/70 px-4 py-2 text-sm text-muted">
          {freeSlotsCount} свободно
        </div>
      </div>

      <div className="mt-6">
        <p className="text-sm font-medium text-foreground">
          Даты на ближайшие {BOOKING_WINDOW_DAYS} дней
        </p>
        <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
          {days.map((day) => {
            const isActive = day.value === selectedDate;

            return (
              <button
                key={day.value}
                type="button"
                className={[
                  "min-w-[92px] rounded-[22px] border px-4 py-3 text-left",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
                  isActive
                    ? "border-accent bg-[#fff1e6] shadow-[0_14px_28px_rgba(185,109,82,0.16)]"
                    : "border-card-border bg-white/70 hover:-translate-y-0.5 hover:bg-white",
                ].join(" ")}
                onClick={() => {
                  setSelectedDate(day.value);
                  setStatus({
                    tone: "idle",
                    message: "",
                  });
                }}
              >
                <p className="text-xs uppercase tracking-[0.16em] text-muted">
                  {day.isToday ? "сегодня" : day.weekdayLabel}
                </p>
                <p className="mt-2 text-2xl font-semibold text-foreground">
                  {day.dayLabel}
                </p>
                <p className="mt-1 text-sm text-muted">{day.monthLabel}</p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-foreground">
              Свободные окна
            </p>
            <p className="mt-1 text-sm text-muted">
              {formatDateLabel(selectedDate)}
            </p>
          </div>
          <div className="text-right text-xs uppercase tracking-[0.18em] text-muted">
            Автообновление
          </div>
        </div>

        <div className="mt-4">
          <SlotsList
            slots={slots}
            selectedTime={selectedTime}
            isLoading={isLoadingSlots}
            onSelect={setSelectedTime}
          />
        </div>
      </div>

      <form
        id="booking-fields"
        className="mt-8 space-y-4 scroll-mt-28"
        onSubmit={handleSubmit}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-foreground">Имя</span>
            <input
              className="mt-2 w-full rounded-[18px] border border-card-border bg-white px-4 py-3 text-foreground outline-none placeholder:text-muted/65 focus:border-accent"
              placeholder="Как к тебе обращаться"
              value={formState.clientName}
              onChange={(event) => updateField("clientName", event.target.value)}
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-foreground">Телефон</span>
            <input
              className="mt-2 w-full rounded-[18px] border border-card-border bg-white px-4 py-3 text-foreground outline-none placeholder:text-muted/65 focus:border-accent"
              placeholder="+7 999 123-45-67"
              value={formState.phone}
              onChange={(event) => updateField("phone", event.target.value)}
            />
          </label>
        </div>

        <label className="block">
          <span className="text-sm font-medium text-foreground">
            Telegram
          </span>
          <input
            className="mt-2 w-full rounded-[18px] border border-card-border bg-white px-4 py-3 text-foreground outline-none placeholder:text-muted/65 focus:border-accent"
            placeholder="@username или t.me/username"
            value={formState.telegram}
            onChange={(event) => updateField("telegram", event.target.value)}
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-foreground">
            Комментарий
          </span>
          <textarea
            rows={4}
            className="mt-2 w-full resize-none rounded-[18px] border border-card-border bg-white px-4 py-3 text-foreground outline-none placeholder:text-muted/65 focus:border-accent"
            placeholder="Например: нужен френч, снятие или укрепление."
            value={formState.note}
            onChange={(event) => updateField("note", event.target.value)}
          />
        </label>

        {status.message ? (
          <div
            className={`rounded-[18px] border px-4 py-3 text-sm leading-6 ${statusClassName}`}
          >
            {status.message}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting || isLoadingSlots || !selectedTime}
          className="flex w-full items-center justify-center rounded-[22px] bg-[#2d1d19] px-5 py-4 text-base font-semibold text-white shadow-[0_18px_34px_rgba(45,29,25,0.22)] disabled:cursor-not-allowed disabled:bg-[#8b746d]"
        >
          {isSubmitting ? "Сохраняю запись..." : "Записаться на выбранный слот"}
        </button>
      </form>
    </section>
  );
}
