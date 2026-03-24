"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useEffect, useEffectEvent, useState } from "react";
import { AdminAvailabilityEditor } from "@/components/admin-availability-editor";
import { AdminLogoutButton } from "@/components/admin-logout-button";
import { AdminTelegramPanel } from "@/components/admin-telegram-panel";
import { formatDateLabel } from "@/lib/utils";
import type {
  AdminBookingsListResponse,
  BookingDeleteResponse,
  BookingRecord,
  DayAvailabilityConfig,
  StorageMode,
} from "@/types/booking";

type AdminBookingsPanelProps = {
  initialDate: string;
};

type StatusState = {
  tone: "idle" | "success" | "error";
  message: string;
};

const createdAtFormatter = new Intl.DateTimeFormat("ru-RU", {
  dateStyle: "short",
  timeStyle: "short",
});

function normalizeServerErrorText(raw: string) {
  const normalized = raw.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return normalized || "Сервер вернул пустой ответ. Попробуй ещё раз.";
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

function getTelegramHref(telegram: string) {
  const handle = telegram.replace(/^@/, "").trim();
  return handle ? `https://t.me/${handle}` : "#";
}

function formatCreatedAt(value: string) {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return createdAtFormatter.format(parsed);
}

export function AdminBookingsPanel({ initialDate }: AdminBookingsPanelProps) {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [availability, setAvailability] = useState<DayAvailabilityConfig | null>(
    null,
  );
  const [storageMode, setStorageMode] = useState<StorageMode>("demo");
  const [status, setStatus] = useState<StatusState>({
    tone: "idle",
    message: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState("");
  const [reloadNonce, setReloadNonce] = useState(0);

  const loadBookings = useEffectEvent(async (date: string) => {
    if (!date) {
      return;
    }

    setIsLoading(true);
    setBookings([]);
    setAvailability(null);

    try {
      const response = await fetch(`/api/admin/bookings?date=${date}`, {
        cache: "no-store",
      });
      const data = await readApiResponse<AdminBookingsListResponse>(response);

      if (!response.ok) {
        if (response.status === 401) {
          router.replace("/admin/login");
          router.refresh();
        }

        throw new Error(
          ("error" in data ? data.error : undefined) ??
            "Не удалось загрузить записи на выбранную дату.",
        );
      }

      if (!("bookings" in data)) {
        throw new Error("Сервер вернул неожиданный ответ при загрузке админки.");
      }

      setStorageMode(data.storageMode);

      startTransition(() => {
        setBookings(data.bookings);
        setAvailability(data.availability);
      });
    } catch (error) {
      setBookings([]);
      setAvailability(null);
      setStatus({
        tone: "error",
        message:
          error instanceof Error
            ? error.message
            : "Не удалось загрузить записи. Попробуй ещё раз.",
      });
    } finally {
      setIsLoading(false);
    }
  });

  useEffect(() => {
    void loadBookings(selectedDate);
  }, [reloadNonce, selectedDate]);

  async function handleDelete(booking: BookingRecord) {
    const confirmed = window.confirm(
      `Удалить запись ${booking.clientName} на ${booking.bookingTime}?`,
    );

      if (!confirmed) {
        return;
      }

    setDeletingId(booking.id);
    setStatus({
      tone: "idle",
      message: "",
    });

    try {
      const response = await fetch(`/api/admin/bookings/${booking.id}`, {
        method: "DELETE",
      });
      const data = await readApiResponse<BookingDeleteResponse>(response);

      if (!response.ok) {
        if (response.status === 401) {
          router.replace("/admin/login");
          router.refresh();
        }

        throw new Error(
          ("error" in data ? data.error : undefined) ??
            "Не удалось удалить запись.",
        );
      }

      if (!("booking" in data)) {
        throw new Error("Сервер вернул неожиданный ответ после удаления записи.");
      }

      setStorageMode(data.storageMode);
      setStatus({
        tone: "success",
        message: data.telegramWarning
          ? `Запись ${data.booking.clientName} на ${data.booking.bookingTime} удалена. ${data.telegramWarning}`
          : `Запись ${data.booking.clientName} на ${data.booking.bookingTime} удалена.`,
      });
      setReloadNonce((value) => value + 1);
    } catch (error) {
      setStatus({
        tone: "error",
        message:
          error instanceof Error
            ? error.message
            : "Не удалось удалить запись. Попробуй ещё раз.",
      });
    } finally {
      setDeletingId("");
    }
  }

  const statusClassName =
    status.tone === "success"
      ? "border-success/25 bg-success-soft text-success"
      : status.tone === "error"
        ? "border-danger/25 bg-danger-soft text-danger"
        : "hidden";

  return (
    <section className="rounded-[34px] border border-card-border bg-paper-strong p-6 shadow-[0_30px_90px_rgba(75,40,28,0.12)] sm:p-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-sm uppercase tracking-[0.22em] text-muted">
            Админка
          </p>
          <div className="mt-3 flex flex-col items-start gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <h1 className="font-[family-name:var(--font-display)] text-3xl leading-none text-foreground sm:text-4xl">
              Записи по дням
            </h1>
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
          <p className="mt-4 max-w-xl text-sm leading-6 text-muted sm:text-base">
            Здесь можно быстро посмотреть занятые слоты, контакты клиента и
            удалить запись, если нужно освободить время.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full border border-card-border bg-white/80 px-5 py-3 text-sm font-medium text-foreground hover:-translate-y-0.5 hover:bg-white"
          >
            Открыть сайт
          </Link>
          <AdminLogoutButton />
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-full bg-[#2d1d19] px-5 py-3 text-sm font-medium text-white shadow-[0_14px_28px_rgba(45,29,25,0.18)] hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:bg-[#8b746d]"
            onClick={() => setReloadNonce((value) => value + 1)}
            disabled={isLoading}
          >
            {isLoading ? "Обновляю..." : "Обновить"}
          </button>
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-4 rounded-[28px] border border-card-border bg-white/60 p-4 sm:flex-row sm:items-end sm:justify-between">
        <label className="block max-w-xs">
          <span className="text-sm font-medium text-foreground">
            Дата записей
          </span>
          <input
            type="date"
            className="mt-2 w-full rounded-[18px] border border-card-border bg-white px-4 py-3 text-foreground outline-none focus:border-accent"
            value={selectedDate}
            onChange={(event) => {
              setIsLoading(true);
              setBookings([]);
              setSelectedDate(event.target.value);
              setAvailability(null);
              setStatus({
                tone: "idle",
                message: "",
              });
            }}
          />
        </label>

        <div className="flex flex-wrap gap-3">
          <div className="rounded-[20px] border border-card-border bg-paper-strong px-4 py-3">
            <p className="text-xs uppercase tracking-[0.16em] text-muted">
              Выбрано
            </p>
            <p className="mt-2 text-sm font-medium text-foreground">
              {formatDateLabel(selectedDate)}
            </p>
          </div>
          <div className="rounded-[20px] border border-card-border bg-paper-strong px-4 py-3">
            <p className="text-xs uppercase tracking-[0.16em] text-muted">
              Записей
            </p>
            <p className="mt-2 text-2xl font-semibold text-foreground">
              {bookings.length}
            </p>
          </div>
        </div>
      </div>

      {status.message ? (
        <div
          role={status.tone === "error" ? "alert" : "status"}
          aria-live={status.tone === "error" ? "assertive" : "polite"}
          aria-atomic="true"
          className={`mt-6 rounded-[18px] border px-4 py-3 text-sm leading-6 ${statusClassName}`}
        >
          {status.message}
        </div>
      ) : null}

      <AdminTelegramPanel />

      <AdminAvailabilityEditor
        key={selectedDate}
        date={selectedDate}
        availability={availability}
        bookings={bookings}
        onSaved={(nextAvailability, nextStorageMode) => {
          setAvailability(nextAvailability);
          setStorageMode(nextStorageMode);
          setReloadNonce((value) => value + 1);
        }}
      />

      <div className="mt-8">
        {isLoading ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {Array.from({ length: 4 }, (_, index) => (
              <div
                key={index}
                className="rounded-[28px] border border-card-border bg-white/70 p-5"
              >
                <div className="h-6 w-28 rounded-full bg-[#eadfd8]" />
                <div className="mt-5 h-8 w-40 rounded-full bg-[#eadfd8]" />
                <div className="mt-5 space-y-3">
                  <div className="h-4 w-3/4 rounded-full bg-[#f1e7e1]" />
                  <div className="h-4 w-2/3 rounded-full bg-[#f1e7e1]" />
                  <div className="h-4 w-1/2 rounded-full bg-[#f1e7e1]" />
                </div>
              </div>
            ))}
          </div>
        ) : bookings.length === 0 ? (
          <div className="rounded-[30px] border border-dashed border-card-border bg-white/70 px-6 py-12 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
              Пусто
            </p>
            <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl text-foreground">
              На эту дату записей нет
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-muted sm:text-base">
              Можно выбрать другую дату или вернуться на сайт и проверить, как
              выглядит форма записи для клиента.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {bookings.map((booking) => {
              const isDeleting = deletingId === booking.id;

              return (
                <article
                  key={booking.id}
                  className="rounded-[28px] border border-card-border bg-white/80 p-5 shadow-[0_18px_36px_rgba(75,40,28,0.08)]"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
                        {formatDateLabel(booking.bookingDate)}
                      </p>
                      <h2 className="mt-3 text-3xl font-semibold text-foreground">
                        {booking.bookingTime}
                      </h2>
                    </div>
                    <button
                      type="button"
                      className="inline-flex items-center justify-center rounded-full border border-danger/20 bg-danger-soft px-4 py-2 text-sm font-medium text-danger hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
                      onClick={() => void handleDelete(booking)}
                      disabled={Boolean(deletingId)}
                    >
                      {isDeleting ? "Удаляю..." : "Удалить"}
                    </button>
                  </div>

                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[18px] bg-[#fbf5f0] px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.16em] text-muted">
                        Клиент
                      </p>
                      <p className="mt-2 text-sm font-medium text-foreground">
                        {booking.clientName}
                      </p>
                    </div>
                    <div className="rounded-[18px] bg-[#fbf5f0] px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.16em] text-muted">
                        Добавлено
                      </p>
                      <p className="mt-2 text-sm font-medium text-foreground">
                        {formatCreatedAt(booking.createdAt)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    <a
                      href={`tel:${booking.phone}`}
                      className="flex items-center justify-between gap-4 rounded-[18px] border border-card-border bg-paper-strong px-4 py-3 hover:border-accent/30 hover:bg-white"
                    >
                      <span className="text-sm text-muted">Телефон</span>
                      <span className="text-sm font-medium text-foreground">
                        {booking.phone}
                      </span>
                    </a>

                    <a
                      href={getTelegramHref(booking.telegram)}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between gap-4 rounded-[18px] border border-card-border bg-paper-strong px-4 py-3 hover:border-accent/30 hover:bg-white"
                    >
                      <span className="text-sm text-muted">Telegram</span>
                      <span className="text-sm font-medium text-foreground">
                        {booking.telegram}
                      </span>
                    </a>
                  </div>

                  {booking.note ? (
                    <div className="mt-4 rounded-[20px] border border-card-border bg-paper-strong px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.16em] text-muted">
                        Комментарий
                      </p>
                      <p className="mt-2 text-sm leading-6 text-foreground">
                        {booking.note}
                      </p>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
