'use client';

import { useEffect, useState } from 'react';
import { WORKING_HOURS } from '@/constants';
import { areTimeSetsEqual, normalizeAvailableTimes } from '@/lib/utils';
import type {
  BookingRecord,
  DayAvailabilityConfig,
  DayAvailabilityUpdateResponse,
  StorageMode,
} from '@/types/booking';

type AdminAvailabilityEditorProps = {
  date: string;
  availability: DayAvailabilityConfig | null;
  bookings: BookingRecord[];
  onSaved: (
    availability: DayAvailabilityConfig,
    storageMode: StorageMode,
  ) => void;
};

type StatusState = {
  tone: 'idle' | 'success' | 'error';
  message: string;
};

type SavedAvailabilityState = {
  isClosed: boolean;
  availableTimes: string[];
};

function normalizeServerErrorText(raw: string) {
  const normalized = raw
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return normalized || 'Сервер вернул пустой ответ. Попробуй ещё раз.';
}

async function readApiResponse(response: Response) {
  const contentType = response.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    return (await response.json()) as
      | DayAvailabilityUpdateResponse
      | { error?: string };
  }

  return {
    error: normalizeServerErrorText(await response.text()),
  };
}

export function AdminAvailabilityEditor({
  date,
  availability,
  bookings,
  onSaved,
}: AdminAvailabilityEditorProps) {
  const [draftIsClosed, setDraftIsClosed] = useState(false);
  const [draftTimes, setDraftTimes] = useState<string[]>([]);
  const [savedState, setSavedState] = useState<SavedAvailabilityState | null>(
    null,
  );
  const [customTime, setCustomTime] = useState('');
  const [status, setStatus] = useState<StatusState>({
    tone: 'idle',
    message: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!availability) {
      return;
    }

    setDraftIsClosed(availability.isClosed);
    setDraftTimes(availability.availableTimes);
    setSavedState({
      isClosed: availability.isClosed,
      availableTimes: availability.availableTimes,
    });
    setStatus({
      tone: 'idle',
      message: '',
    });
    setCustomTime('');
  }, [availability]);

  function addTime(time: string) {
    setDraftTimes((current) => normalizeAvailableTimes([...current, time]));
    setStatus({
      tone: 'idle',
      message: '',
    });
  }

  function removeTime(time: string) {
    setDraftTimes((current) => current.filter((value) => value !== time));
    setStatus({
      tone: 'idle',
      message: '',
    });
  }

  async function handleSave() {
    setIsSaving(true);
    setStatus({
      tone: 'idle',
      message: '',
    });

    try {
      const response = await fetch('/api/admin/availability', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date,
          isClosed: draftIsClosed,
          availableTimes: draftTimes,
        }),
      });
      const data = await readApiResponse(response);

      if (!response.ok || !('availability' in data)) {
        throw new Error(
          ('error' in data ? data.error : undefined) ??
            'Не удалось сохранить доступность дня.',
        );
      }

      setDraftIsClosed(data.availability.isClosed);
      setDraftTimes(data.availability.availableTimes);
      setSavedState({
        isClosed: data.availability.isClosed,
        availableTimes: data.availability.availableTimes,
      });
      setCustomTime('');
      onSaved(data.availability, data.storageMode);
      setStatus({
        tone: 'success',
        message: data.availability.isClosed
          ? 'День закрыт для новых записей.'
          : 'Доступность дня сохранена.',
      });
    } catch (error) {
      setStatus({
        tone: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Не удалось сохранить доступность дня.',
      });
    } finally {
      setIsSaving(false);
    }
  }

  const statusClassName =
    status.tone === 'success'
      ? 'border-success/25 bg-success-soft text-success'
      : status.tone === 'error'
        ? 'border-danger/25 bg-danger-soft text-danger'
        : 'hidden';

  const bookedTimes = new Set(availability?.bookedTimes ?? []);
  const quickAddTimes = WORKING_HOURS.filter(
    (time) => !draftTimes.includes(time),
  );

  if (!availability) {
    return (
      <section className="mt-8 rounded-[28px] border border-card-border bg-white/70 p-5">
        <div className="space-y-3">
          <div className="h-5 w-40 rounded-full bg-[#eadfd8]" />
          <div className="h-4 w-72 rounded-full bg-[#f1e7e1]" />
          <div className="h-32 rounded-[22px] bg-[#f7efe9]" />
        </div>
      </section>
    );
  }

  const hasUnsavedChanges =
    !savedState ||
    draftIsClosed !== savedState.isClosed ||
    !areTimeSetsEqual(draftTimes, savedState.availableTimes);

  return (
    <section className="mt-8 rounded-[28px] border border-card-border bg-white/70 p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs uppercase tracking-[0.2em] text-muted">
            Доступность дня
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-foreground">
            Управление слотами
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted">
            Здесь можно закрыть день целиком или настроить список доступных
            времён только для выбранной даты.
          </p>
        </div>

        <button
          type="button"
          className={[
            'inline-flex items-center justify-center rounded-full border px-4 py-2 text-sm font-medium',
            draftIsClosed
              ? 'border-danger/20 bg-danger-soft text-danger'
              : 'border-card-border bg-paper-strong text-foreground hover:bg-white',
          ].join(' ')}
          onClick={() => {
            setDraftIsClosed((current) => !current);
            setStatus({
              tone: 'idle',
              message: '',
            });
          }}
        >
          {draftIsClosed ? 'День закрыт' : 'Открыть / закрыть день'}
        </button>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[22px] border border-card-border bg-paper-strong p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-muted">
            Текущие доступные слоты
          </p>
          {draftIsClosed ? (
            <div className="mt-4 space-y-3">
              <div className="rounded-[18px] border border-danger/20 bg-danger-soft/70 px-4 py-3 text-sm leading-6 text-danger">
                День закрыт для новых записей. Клиент не сможет выбрать эту
                дату, но уже существующие записи сохранятся.
              </div>

              {bookings.length > 0 ? (
                <div className="rounded-[18px] border border-card-border bg-white/80 px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted">
                    Активные записи на день
                  </p>
                  <div className="mt-3 space-y-2">
                    {bookings.map((booking) => (
                      <div
                        key={booking.id}
                        className="flex items-center justify-between gap-3 rounded-[16px] bg-[#fbf5f0] px-3 py-3"
                      >
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            {booking.bookingTime}
                          </p>
                          <p className="mt-1 text-xs uppercase tracking-[0.14em] text-muted">
                            {booking.clientName}
                          </p>
                        </div>
                        <div className="text-right text-sm text-muted">
                          <p>{booking.phone}</p>
                          <p className="mt-1">{booking.telegram}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : draftTimes.length === 0 ? (
            <div className="mt-4 rounded-[18px] border border-dashed border-card-border bg-white/70 px-4 py-3 text-sm leading-6 text-muted">
              На эту дату сейчас нет доступных слотов. День будет неактивен для
              клиента.
            </div>
          ) : (
            <div className="mt-4 flex flex-wrap gap-2">
              {draftTimes.map((time) => {
                const isBooked = bookedTimes.has(time);

                return (
                  <div
                    key={time}
                    className={[
                      'inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm',
                      isBooked
                        ? 'border-success/20 bg-success-soft text-success'
                        : 'border-card-border bg-white text-foreground',
                    ].join(' ')}
                  >
                    <span>{time}</span>
                    {isBooked ? (
                      <span className="text-xs uppercase tracking-[0.14em] text-success/80">
                        есть запись
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="text-muted hover:text-danger"
                        onClick={() => removeTime(time)}
                        aria-label={`Убрать время ${time}`}
                      >
                        x
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-[22px] border border-card-border bg-paper-strong p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-muted">
            Быстрое редактирование
          </p>

          <div className="mt-4">
            <label className="block">
              <span className="text-sm font-medium text-foreground">
                Добавить своё время
              </span>
              <div className="mt-2 flex gap-2">
                <input
                  type="time"
                  step={1800}
                  className="w-full rounded-[16px] border border-card-border bg-white px-4 py-3 text-foreground outline-none focus:border-accent"
                  value={customTime}
                  onChange={(event) => setCustomTime(event.target.value)}
                  disabled={draftIsClosed}
                />
                <button
                  type="button"
                  className="rounded-[16px] bg-[#2d1d19] px-4 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-[#8b746d]"
                  onClick={() => {
                    if (customTime) {
                      addTime(customTime);
                      setCustomTime('');
                    }
                  }}
                  disabled={draftIsClosed || !customTime}
                >
                  Добавить
                </button>
              </div>
            </label>
          </div>

          <div className="mt-5">
            <p className="text-sm font-medium text-foreground">
              Быстро добавить из стандартного графика
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {quickAddTimes.length === 0 ? (
                <p className="text-sm text-muted">
                  Все базовые слоты уже добавлены.
                </p>
              ) : (
                quickAddTimes.map((time) => (
                  <button
                    key={time}
                    type="button"
                    className="rounded-full border border-card-border bg-white px-3 py-2 text-sm text-foreground hover:bg-[#fff8f1] disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={() => addTime(time)}
                    disabled={draftIsClosed}
                  >
                    {time}
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-full border border-card-border bg-white px-4 py-2 text-sm font-medium text-foreground hover:bg-[#fff8f1]"
              onClick={() => {
                setDraftIsClosed(false);
                setDraftTimes([...WORKING_HOURS]);
                setStatus({
                  tone: 'idle',
                  message: '',
                });
              }}
            >
              Сбросить к стандарту
            </button>

            <button
              type="button"
              className="rounded-full bg-[#2d1d19] px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-[#8b746d]"
              onClick={() => void handleSave()}
              disabled={isSaving || !hasUnsavedChanges}
            >
              {isSaving
                ? 'Сохраняю...'
                : hasUnsavedChanges
                  ? 'Сохранить доступность'
                  : 'Нет изменений'}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-[20px] border border-card-border bg-paper-strong px-4 py-3">
          <p className="text-xs uppercase tracking-[0.16em] text-muted">
            Записей на день
          </p>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {bookings.length}
          </p>
        </div>
        <div className="rounded-[20px] border border-card-border bg-paper-strong px-4 py-3">
          <p className="text-xs uppercase tracking-[0.16em] text-muted">
            Выбрано слотов
          </p>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {draftIsClosed ? 0 : draftTimes.length}
          </p>
        </div>
      </div>

      {status.message ? (
        <div
          role={status.tone === 'error' ? 'alert' : 'status'}
          aria-live={status.tone === 'error' ? 'assertive' : 'polite'}
          aria-atomic="true"
          className={`mt-5 rounded-[18px] border px-4 py-3 text-sm leading-6 ${statusClassName}`}
        >
          {status.message}
        </div>
      ) : null}
    </section>
  );
}
