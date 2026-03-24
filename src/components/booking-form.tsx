"use client";

import { startTransition, useEffect, useEffectEvent, useState } from "react";
import { SlotsList } from "@/components/slots-list";
import { BOOKING_WINDOW_DAYS } from "@/constants";
import { formatDateLabel, getUpcomingDays } from "@/lib/utils";
import type {
  AvailabilityWindowResponse,
  BookingCreateResponse,
  BookingRecord,
  BookingsAvailabilityResponse,
  DayAvailabilityState,
  StorageMode,
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

type FieldErrors = Partial<Record<keyof FormState, string>>;

const initialFormState: FormState = {
  clientName: "",
  phone: "",
  telegram: "",
  note: "",
};

function normalizeTelegramValue(value: string) {
  const trimmed = value
    .trim()
    .replace(/^https?:\/\/t\.me\//i, "")
    .replace(/^https?:\/\/telegram\.me\//i, "")
    .replace(/^t\.me\//i, "")
    .replace(/^telegram\.me\//i, "");

  if (!trimmed) {
    return "";
  }

  return trimmed.startsWith("@") ? trimmed : `@${trimmed}`;
}

function validateFormFields(formState: FormState): FieldErrors {
  const errors: FieldErrors = {};

  if (!formState.clientName.trim()) {
    errors.clientName = "Укажи имя.";
  }

  if (!formState.phone.trim()) {
    errors.phone = "Укажи телефон.";
  } else if (formState.phone.replace(/\D/g, "").length < 10) {
    errors.phone = "Укажи телефон в понятном формате.";
  }

  if (!formState.telegram.trim()) {
    errors.telegram = "Укажи Telegram.";
  } else if (!/^@[A-Za-z0-9_]{5,32}$/.test(normalizeTelegramValue(formState.telegram))) {
    errors.telegram = "Укажи Telegram в формате @username или t.me/username.";
  }

  return errors;
}

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
  const [dayAvailability, setDayAvailability] = useState<DayAvailabilityState[]>(
    [],
  );
  const [selectedTime, setSelectedTime] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [formState, setFormState] = useState<FormState>(initialFormState);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [confirmedBooking, setConfirmedBooking] =
    useState<BookingRecord | null>(null);
  const [storageMode, setStorageMode] = useState<StorageMode>("demo");
  const [status, setStatus] = useState<StatusState>({
    tone: "idle",
    message: "",
  });
  const [isLoadingSlots, setIsLoadingSlots] = useState(true);
  const [isLoadingCalendar, setIsLoadingCalendar] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reloadNonce, setReloadNonce] = useState(0);

  const availabilityStartDate = days[0]?.value ?? "";

  const loadAvailabilityWindow = useEffectEvent(async () => {
    if (!availabilityStartDate) {
      return;
    }

    setIsLoadingCalendar(true);

    try {
      const response = await fetch(
        `/api/availability?start=${availabilityStartDate}&duration=${BOOKING_WINDOW_DAYS}`,
        {
          cache: "no-store",
        },
      );
      const data = await readApiResponse<AvailabilityWindowResponse>(response);

      if (!response.ok) {
        throw new Error(
          ("error" in data ? data.error : undefined) ??
            "Не удалось загрузить доступность дней.",
        );
      }

      if (!("days" in data)) {
        throw new Error("Сервер вернул неожиданный ответ при загрузке календаря.");
      }

      setStorageMode(data.storageMode);

      startTransition(() => {
        setDayAvailability(data.days);
        setSelectedDate((current) => {
          const currentDay = data.days.find((day) => day.date === current);

          if (currentDay && !currentDay.isDisabled) {
            return current;
          }

          return data.days.find((day) => !day.isDisabled)?.date ?? data.days[0]?.date ?? current;
        });
      });
    } catch (error) {
      setDayAvailability([]);
      setStatus({
        tone: "error",
        message: readErrorMessage(
          error,
          "Не удалось загрузить доступность дней. Попробуй ещё раз.",
        ),
      });
    } finally {
      setIsLoadingCalendar(false);
    }
  });

  const loadSlots = useEffectEvent(async (date: string) => {
    if (!date) {
      return;
    }

    setIsLoadingSlots(true);

    try {
      const response = await fetch(`/api/bookings?date=${date}`, {
        cache: "no-store",
      });
      const data = await readApiResponse<BookingsAvailabilityResponse>(response);

      if (!response.ok) {
        throw new Error(
          ("error" in data ? data.error : undefined) ??
            "Не удалось загрузить доступные слоты.",
        );
      }

      if (!("slots" in data)) {
        throw new Error("Сервер вернул неожиданный ответ при загрузке слотов.");
      }

      setStorageMode(data.storageMode);

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

  useEffect(() => {
    void loadAvailabilityWindow();
  }, [availabilityStartDate, reloadNonce]);

  function updateField(field: keyof FormState, value: string) {
    const nextFormState = {
      ...formState,
      [field]: value,
    };

    setFormState(nextFormState);

    const nextErrors = validateFormFields(nextFormState);

    setFieldErrors((existingErrors) => {
      const updatedErrors = { ...existingErrors };

      if (nextErrors[field]) {
        updatedErrors[field] = nextErrors[field];
      } else {
        delete updatedErrors[field];
      }

      return updatedErrors;
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextFieldErrors = validateFormFields(formState);

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      setStatus({
        tone: "error",
        message: "Заполни обязательные поля перед отправкой.",
      });
      return;
    }

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
      setFieldErrors({});
      setConfirmedBooking(data.booking);
      setStorageMode(data.storageMode);
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
  const availabilityByDate = new Map(
    dayAvailability.map((day) => [day.date, day] as const),
  );
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
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row">
        <div className="min-w-0">
          <p className="text-sm uppercase tracking-[0.22em] text-muted">
            Онлайн-запись
          </p>
          <div className="mt-3 flex flex-col items-start gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <h2 className="font-[family-name:var(--font-display)] text-3xl leading-none text-foreground sm:text-4xl">
              Выбери день и время
            </h2>
            <span
              className={[
                "rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]",
                storageMode === "demo"
                  ? "border-[#e7c4a0] bg-[#fff1e1] text-[#9a6236]"
                  : "border-success/20 bg-success-soft text-success",
              ].join(" ")}
            >
              {storageMode === "demo" ? "demo mode" : "supabase"}
            </span>
          </div>
        </div>
        <div className="self-start rounded-full border border-card-border bg-white/70 px-4 py-2 text-sm text-muted">
          {freeSlotsCount} свободно
        </div>
      </div>

      <div className="mt-6">
        <p className="text-sm font-medium text-foreground">
          Даты на ближайшие {BOOKING_WINDOW_DAYS} дней
        </p>
        <div className="mt-3 -mx-1 flex gap-3 overflow-x-auto px-1 py-2">
          {days.map((day) => {
            const isActive = day.value === selectedDate;
            const dayState = availabilityByDate.get(day.value);
            const isDisabledDay = isLoadingCalendar
              ? false
              : (dayState?.isDisabled ?? false);

            return (
              <button
                key={day.value}
                type="button"
                disabled={isDisabledDay}
                className={[
                  "min-w-[92px] rounded-[22px] border px-4 py-3 text-left",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
                  isActive
                    ? "border-accent bg-[#fff1e6] shadow-[0_14px_28px_rgba(185,109,82,0.16)]"
                    : isDisabledDay
                      ? "cursor-not-allowed border-card-border bg-[#f1ebe6] text-muted/65 opacity-75"
                      : "border-card-border bg-white/70 hover:-translate-y-0.5 hover:bg-white",
                ].join(" ")}
                onClick={() => {
                  if (isDisabledDay) {
                    return;
                  }

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
                {isDisabledDay ? (
                  <p className="mt-2 text-[11px] uppercase tracking-[0.16em] text-muted/70">
                    нет записи
                  </p>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-6">
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
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

      {confirmedBooking ? (
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="mt-8 rounded-[24px] border border-success/20 bg-success-soft/70 p-5 text-success shadow-[0_18px_36px_rgba(47,107,87,0.08)]"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-success/80">
                Подтверждение
              </p>
              <h3 className="mt-2 text-2xl font-semibold text-success">
                Запись оформлена
              </h3>
              <p className="mt-2 text-sm leading-6 text-success/85">
                {confirmedBooking.clientName}, запись сохранена и слот успешно
                забронирован.
              </p>
            </div>
            <button
              type="button"
              className="rounded-full border border-success/20 bg-white/70 px-4 py-2 text-sm text-success transition hover:bg-white"
              onClick={() => setConfirmedBooking(null)}
            >
              Скрыть
            </button>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-[18px] bg-white/75 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.16em] text-success/70">
                Дата
              </p>
              <p className="mt-2 text-sm font-medium text-success">
                {formatDateLabel(confirmedBooking.bookingDate)}
              </p>
            </div>
            <div className="rounded-[18px] bg-white/75 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.16em] text-success/70">
                Время
              </p>
              <p className="mt-2 text-sm font-medium text-success">
                {confirmedBooking.bookingTime}
              </p>
            </div>
            <div className="rounded-[18px] bg-white/75 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.16em] text-success/70">
                Телефон
              </p>
              <p className="mt-2 text-sm font-medium text-success">
                {confirmedBooking.phone}
              </p>
            </div>
            <div className="rounded-[18px] bg-white/75 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.16em] text-success/70">
                Telegram
              </p>
              <p className="mt-2 text-sm font-medium text-success">
                {confirmedBooking.telegram}
              </p>
            </div>
          </div>

          {confirmedBooking.note ? (
            <div className="mt-3 rounded-[18px] bg-white/75 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.16em] text-success/70">
                Комментарий
              </p>
              <p className="mt-2 text-sm leading-6 text-success">
                {confirmedBooking.note}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

      <form
        id="booking-fields"
        className="mt-8 space-y-4 scroll-mt-28"
        noValidate
        onSubmit={handleSubmit}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-foreground">Имя</span>
            <input
              required
              aria-invalid={Boolean(fieldErrors.clientName)}
              aria-describedby={
                fieldErrors.clientName ? "client-name-error" : undefined
              }
              className={[
                "mt-2 w-full rounded-[18px] border bg-white px-4 py-3 text-foreground outline-none placeholder:text-muted/65 focus:border-accent",
                fieldErrors.clientName
                  ? "border-danger bg-danger-soft/30"
                  : "border-card-border",
              ].join(" ")}
              placeholder="Как к тебе обращаться"
              value={formState.clientName}
              onChange={(event) => updateField("clientName", event.target.value)}
            />
            {fieldErrors.clientName ? (
              <p id="client-name-error" className="mt-2 text-sm text-danger">
                {fieldErrors.clientName}
              </p>
            ) : null}
          </label>

          <label className="block">
            <span className="text-sm font-medium text-foreground">
              Телефон
            </span>
            <input
              required
              aria-invalid={Boolean(fieldErrors.phone)}
              aria-describedby={fieldErrors.phone ? "phone-error" : undefined}
              className={[
                "mt-2 w-full rounded-[18px] border bg-white px-4 py-3 text-foreground outline-none placeholder:text-muted/65 focus:border-accent",
                fieldErrors.phone
                  ? "border-danger bg-danger-soft/30"
                  : "border-card-border",
              ].join(" ")}
              placeholder="+7 999 123-45-67"
              value={formState.phone}
              onChange={(event) => updateField("phone", event.target.value)}
            />
            {fieldErrors.phone ? (
              <p id="phone-error" className="mt-2 text-sm text-danger">
                {fieldErrors.phone}
              </p>
            ) : null}
          </label>
        </div>

        <label className="block">
          <span className="text-sm font-medium text-foreground">Telegram</span>
          <input
            required
            aria-invalid={Boolean(fieldErrors.telegram)}
            aria-describedby={fieldErrors.telegram ? "telegram-error" : undefined}
            className={[
              "mt-2 w-full rounded-[18px] border bg-white px-4 py-3 text-foreground outline-none placeholder:text-muted/65 focus:border-accent",
              fieldErrors.telegram
                ? "border-danger bg-danger-soft/30"
                : "border-card-border",
            ].join(" ")}
            placeholder="@username или t.me/username"
            value={formState.telegram}
            onChange={(event) => updateField("telegram", event.target.value)}
          />
          {fieldErrors.telegram ? (
            <p id="telegram-error" className="mt-2 text-sm text-danger">
              {fieldErrors.telegram}
            </p>
          ) : null}
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
            role={status.tone === "error" ? "alert" : "status"}
            aria-live={status.tone === "error" ? "assertive" : "polite"}
            aria-atomic="true"
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
          {isSubmitting
            ? "Сохраняю запись..."
            : "Записаться на выбранный слот"}
        </button>
      </form>
    </section>
  );
}
