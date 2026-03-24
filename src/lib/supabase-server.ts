import { AVAILABILITY_OVERRIDES_TABLE, WORKING_HOURS } from "@/constants";
import {
  areTimeSetsEqual,
  buildSlots,
  addDaysToISODate,
  normalizeAvailableTimes,
} from "@/lib/utils";
import {
  getSupabaseHeaders,
  getSupabaseResourceUrl,
  getSupabaseTableUrl,
  hasSupabaseServerConfig,
} from "@/lib/supabase";
import type {
  BookingPayload,
  BookingRecord,
  DayAvailabilityConfig,
  DayAvailabilityState,
  StorageMode,
} from "@/types/booking";

type SupabaseBookingRow = {
  id: string;
  client_name: string;
  phone: string;
  telegram: string;
  note: string | null;
  booking_date: string;
  booking_time: string;
  created_at: string;
};

type SupabaseAvailabilityRow = {
  availability_date: string;
  is_closed: boolean;
  available_times: string[] | null;
};

type AvailabilityOverrideRecord = {
  date: string;
  isClosed: boolean;
  availableTimes: string[];
};

type UpdateDayAvailabilityInput = {
  date: string;
  isClosed: boolean;
  availableTimes: string[];
};

declare global {
  var __demoBookings: BookingRecord[] | undefined;
  var __demoAvailabilityOverrides: AvailabilityOverrideRecord[] | undefined;
}

function getDemoBookings() {
  if (!globalThis.__demoBookings) {
    globalThis.__demoBookings = [];
  }

  return globalThis.__demoBookings;
}

function getDemoAvailabilityOverrides() {
  if (!globalThis.__demoAvailabilityOverrides) {
    globalThis.__demoAvailabilityOverrides = [];
  }

  return globalThis.__demoAvailabilityOverrides;
}

function mapSupabaseRow(row: SupabaseBookingRow): BookingRecord {
  return {
    id: row.id,
    clientName: row.client_name,
    phone: row.phone,
    telegram: row.telegram,
    bookingDate: row.booking_date,
    bookingTime: row.booking_time,
    createdAt: row.created_at,
    ...(row.note ? { note: row.note } : {}),
  };
}

function mapAvailabilityRow(row: SupabaseAvailabilityRow): AvailabilityOverrideRecord {
  return {
    date: row.availability_date,
    isClosed: row.is_closed,
    availableTimes: normalizeAvailableTimes(row.available_times ?? []),
  };
}

async function readResponseError(response: Response) {
  const text = await response.text();
  return text || `HTTP ${response.status}`;
}

function isMissingAvailabilityTableError(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes(AVAILABILITY_OVERRIDES_TABLE) &&
    (normalized.includes("does not exist") ||
      normalized.includes("could not find the table") ||
      normalized.includes("relation"))
  );
}

function getStorageMode(): StorageMode {
  return hasSupabaseServerConfig() ? "supabase" : "demo";
}

function getDefaultAvailableTimes() {
  return [...WORKING_HOURS];
}

function getResolvedAvailableTimes(override?: AvailabilityOverrideRecord | null) {
  if (!override) {
    return getDefaultAvailableTimes();
  }

  if (override.isClosed) {
    return [];
  }

  return normalizeAvailableTimes(override.availableTimes);
}

function usesDefaultSchedule(override?: AvailabilityOverrideRecord | null) {
  if (!override) {
    return true;
  }

  return !override.isClosed && areTimeSetsEqual(override.availableTimes, getDefaultAvailableTimes());
}

function buildAvailabilityConfig(
  date: string,
  bookings: BookingRecord[],
  override?: AvailabilityOverrideRecord | null,
): DayAvailabilityConfig {
  return {
    date,
    isClosed: override?.isClosed ?? false,
    usesDefaultSchedule: usesDefaultSchedule(override),
    availableTimes: getResolvedAvailableTimes(override),
    bookedTimes: normalizeAvailableTimes(bookings.map((booking) => booking.bookingTime)),
  };
}

function toDayAvailabilityState(
  date: string,
  bookings: BookingRecord[],
  override?: AvailabilityOverrideRecord | null,
): DayAvailabilityState {
  const availableTimes = getResolvedAvailableTimes(override);
  const slots = buildSlots(date, bookings, availableTimes);
  const freeSlotsCount = slots.filter((slot) => slot.status === "free").length;

  return {
    date,
    isClosed: override?.isClosed ?? false,
    isDisabled: freeSlotsCount === 0,
    freeSlotsCount,
    totalSlotsCount: availableTimes.length,
  };
}

async function listAvailabilityOverridesInRange(startDate: string, endDate: string) {
  const storageMode = getStorageMode();

  if (storageMode === "demo") {
    return getDemoAvailabilityOverrides().filter(
      (override) => override.date >= startDate && override.date <= endDate,
    );
  }

  const query = new URLSearchParams({
    select: "availability_date,is_closed,available_times",
    order: "availability_date.asc",
  });
  query.append("availability_date", `gte.${startDate}`);
  query.append("availability_date", `lte.${endDate}`);

  const response = await fetch(
    getSupabaseResourceUrl(AVAILABILITY_OVERRIDES_TABLE, query.toString()),
    {
      headers: getSupabaseHeaders(),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const message = await readResponseError(response);

    if (isMissingAvailabilityTableError(message)) {
      return [];
    }

    throw new Error(`Не удалось получить доступность дней: ${message}`);
  }

  const rows = (await response.json()) as SupabaseAvailabilityRow[];
  return rows.map(mapAvailabilityRow);
}

async function getAvailabilityOverrideByDate(date: string) {
  const storageMode = getStorageMode();

  if (storageMode === "demo") {
    return (
      getDemoAvailabilityOverrides().find((override) => override.date === date) ?? null
    );
  }

  const query = new URLSearchParams({
    select: "availability_date,is_closed,available_times",
    order: "availability_date.asc",
    limit: "1",
  });
  query.append("availability_date", `eq.${date}`);

  const response = await fetch(
    getSupabaseResourceUrl(AVAILABILITY_OVERRIDES_TABLE, query.toString()),
    {
      headers: getSupabaseHeaders(),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const message = await readResponseError(response);

    if (isMissingAvailabilityTableError(message)) {
      return null;
    }

    throw new Error(`Не удалось получить доступность дня: ${message}`);
  }

  const [row] = (await response.json()) as SupabaseAvailabilityRow[];
  return row ? mapAvailabilityRow(row) : null;
}

export async function listBookingsByDate(date: string) {
  const storageMode = getStorageMode();

  if (storageMode === "demo") {
    const bookings = getDemoBookings()
      .filter((booking) => booking.bookingDate === date)
      .sort((left, right) => left.bookingTime.localeCompare(right.bookingTime));

    return {
      bookings,
      storageMode,
    };
  }

  const query = new URLSearchParams({
    select: "id,client_name,phone,telegram,note,booking_date,booking_time,created_at",
    booking_date: `eq.${date}`,
    order: "booking_time.asc",
  });

  const response = await fetch(getSupabaseTableUrl(query.toString()), {
    headers: getSupabaseHeaders(),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Не удалось получить записи из Supabase: ${await readResponseError(response)}`);
  }

  const rows = (await response.json()) as SupabaseBookingRow[];

  return {
    bookings: rows.map(mapSupabaseRow),
    storageMode,
  };
}

export async function listBookingsInRange(startDate: string, endDate: string) {
  const storageMode = getStorageMode();

  if (storageMode === "demo") {
    const bookings = getDemoBookings()
      .filter(
        (booking) =>
          booking.bookingDate >= startDate && booking.bookingDate <= endDate,
      )
      .sort((left, right) => {
        if (left.bookingDate === right.bookingDate) {
          return left.bookingTime.localeCompare(right.bookingTime);
        }

        return left.bookingDate.localeCompare(right.bookingDate);
      });

    return {
      bookings,
      storageMode,
    };
  }

  const query = new URLSearchParams({
    select: "id,client_name,phone,telegram,note,booking_date,booking_time,created_at",
    order: "booking_date.asc,booking_time.asc",
  });

  query.append("booking_date", `gte.${startDate}`);
  query.append("booking_date", `lte.${endDate}`);

  const response = await fetch(getSupabaseTableUrl(query.toString()), {
    headers: getSupabaseHeaders(),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Не удалось получить записи из Supabase: ${await readResponseError(response)}`);
  }

  const rows = (await response.json()) as SupabaseBookingRow[];

  return {
    bookings: rows.map(mapSupabaseRow),
    storageMode,
  };
}

export async function getDayAvailabilityConfig(
  date: string,
  existingBookings?: BookingRecord[],
) {
  const [{ bookings, storageMode }, override] = await Promise.all([
    existingBookings
      ? Promise.resolve({
          bookings: existingBookings,
          storageMode: getStorageMode(),
        })
      : listBookingsByDate(date),
    getAvailabilityOverrideByDate(date),
  ]);

  return {
    availability: buildAvailabilityConfig(date, bookings, override),
    storageMode,
  };
}

export async function listAvailabilityWindow(startDate: string, count: number) {
  const endDate = addDaysToISODate(startDate, count - 1);
  const [{ bookings, storageMode }, overrides] = await Promise.all([
    listBookingsInRange(startDate, endDate),
    listAvailabilityOverridesInRange(startDate, endDate),
  ]);

  const bookingsByDate = new Map<string, BookingRecord[]>();
  const overridesByDate = new Map<string, AvailabilityOverrideRecord>();

  for (const booking of bookings) {
    const currentBookings = bookingsByDate.get(booking.bookingDate) ?? [];
    currentBookings.push(booking);
    bookingsByDate.set(booking.bookingDate, currentBookings);
  }

  for (const override of overrides) {
    overridesByDate.set(override.date, override);
  }

  const days: DayAvailabilityState[] = [];

  for (let offset = 0; offset < count; offset += 1) {
    const date = addDaysToISODate(startDate, offset);
    days.push(
      toDayAvailabilityState(
        date,
        bookingsByDate.get(date) ?? [],
        overridesByDate.get(date),
      ),
    );
  }

  return {
    days,
    storageMode,
  };
}

async function persistAvailabilityOverride(input: UpdateDayAvailabilityInput) {
  const normalizedAvailableTimes = normalizeAvailableTimes(input.availableTimes);
  const shouldDeleteOverride =
    !input.isClosed && areTimeSetsEqual(normalizedAvailableTimes, getDefaultAvailableTimes());

  const storageMode = getStorageMode();

  if (storageMode === "demo") {
    const overrides = getDemoAvailabilityOverrides();
    const existingIndex = overrides.findIndex((override) => override.date === input.date);

    if (shouldDeleteOverride) {
      if (existingIndex !== -1) {
        overrides.splice(existingIndex, 1);
      }

      return;
    }

    const nextOverride: AvailabilityOverrideRecord = {
      date: input.date,
      isClosed: input.isClosed,
      availableTimes: normalizedAvailableTimes,
    };

    if (existingIndex === -1) {
      overrides.push(nextOverride);
    } else {
      overrides[existingIndex] = nextOverride;
    }

    return;
  }

  if (shouldDeleteOverride) {
    const deleteQuery = new URLSearchParams({
      availability_date: `eq.${input.date}`,
    });

    const response = await fetch(
      getSupabaseResourceUrl(AVAILABILITY_OVERRIDES_TABLE, deleteQuery.toString()),
      {
        method: "DELETE",
        headers: getSupabaseHeaders(),
        cache: "no-store",
      },
    );

    if (!response.ok) {
      const message = await readResponseError(response);

      if (isMissingAvailabilityTableError(message)) {
        throw new Error(
          "Таблица availability_overrides ещё не создана. Выполни SQL из supabase/availability-overrides.sql.",
        );
      }

      throw new Error(`Не удалось сбросить доступность дня: ${message}`);
    }

    return;
  }

  const upsertQuery = new URLSearchParams({
    on_conflict: "availability_date",
  });

  const response = await fetch(
    getSupabaseResourceUrl(AVAILABILITY_OVERRIDES_TABLE, upsertQuery.toString()),
    {
      method: "POST",
      headers: {
        ...getSupabaseHeaders(true),
        Prefer: "resolution=merge-duplicates,return=representation",
      },
      body: JSON.stringify([
        {
          availability_date: input.date,
          is_closed: input.isClosed,
          available_times: normalizedAvailableTimes,
        },
      ]),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const message = await readResponseError(response);

    if (isMissingAvailabilityTableError(message)) {
      throw new Error(
        "Таблица availability_overrides ещё не создана. Выполни SQL из supabase/availability-overrides.sql.",
      );
    }

    throw new Error(`Не удалось сохранить доступность дня: ${message}`);
  }
}

export async function updateDayAvailability(input: UpdateDayAvailabilityInput) {
  const normalizedAvailableTimes = normalizeAvailableTimes(input.availableTimes);
  const { bookings } = await listBookingsByDate(input.date);
  const bookedTimes = normalizeAvailableTimes(bookings.map((booking) => booking.bookingTime));

  const removedBookedTimes = bookedTimes.filter(
    (time) => !input.isClosed && !normalizedAvailableTimes.includes(time),
  );

  if (removedBookedTimes.length > 0) {
    throw new Error(
      `Нельзя убрать время ${removedBookedTimes.join(", ")}: на нём уже есть запись.`,
    );
  }

  await persistAvailabilityOverride({
    ...input,
    availableTimes: normalizedAvailableTimes,
  });

  return getDayAvailabilityConfig(input.date, bookings);
}

export async function createBooking(payload: BookingPayload) {
  const storageMode = getStorageMode();
  const { bookings } = await listBookingsByDate(payload.bookingDate);
  const { availability } = await getDayAvailabilityConfig(payload.bookingDate, bookings);

  if (availability.isClosed || availability.availableTimes.length === 0) {
    throw new Error("На выбранный день запись сейчас закрыта. Выбери другую дату.");
  }

  if (!availability.availableTimes.includes(payload.bookingTime)) {
    throw new Error("Это время больше недоступно для записи. Обнови список и выбери другой слот.");
  }

  if (storageMode === "demo") {
    const hasConflict = bookings.some(
      (booking) => booking.bookingTime === payload.bookingTime,
    );

    if (hasConflict) {
      throw new Error("Этот слот уже занят. Обнови список и выбери другое время.");
    }

    const booking: BookingRecord = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      ...payload,
    };

    getDemoBookings().push(booking);

    return {
      booking,
      storageMode,
    };
  }

  const existingRows = bookings.filter(
    (booking) => booking.bookingTime === payload.bookingTime,
  );

  if (existingRows.length > 0) {
    throw new Error("Этот слот уже занят. Обнови список и выбери другое время.");
  }

  const insertResponse = await fetch(getSupabaseTableUrl(), {
    method: "POST",
    headers: getSupabaseHeaders(true),
    body: JSON.stringify([
      {
        client_name: payload.clientName,
        phone: payload.phone,
        telegram: payload.telegram,
        note: payload.note ?? null,
        booking_date: payload.bookingDate,
        booking_time: payload.bookingTime,
      },
    ]),
    cache: "no-store",
  });

  if (!insertResponse.ok) {
    throw new Error(`Не удалось сохранить запись в Supabase: ${await readResponseError(insertResponse)}`);
  }

  const [insertedRow] = (await insertResponse.json()) as SupabaseBookingRow[];

  if (!insertedRow) {
    throw new Error("Supabase не вернул созданную запись.");
  }

  return {
    booking: mapSupabaseRow(insertedRow),
    storageMode,
  };
}

export async function deleteBooking(bookingId: string) {
  const storageMode = getStorageMode();

  if (storageMode === "demo") {
    const demoBookings = getDemoBookings();
    const index = demoBookings.findIndex((booking) => booking.id === bookingId);

    if (index === -1) {
      throw new Error("Запись для удаления не найдена.");
    }

    const [deletedBooking] = demoBookings.splice(index, 1);

    return {
      booking: deletedBooking,
      storageMode,
    };
  }

  const query = new URLSearchParams({
    id: `eq.${bookingId}`,
    select: "id,client_name,phone,telegram,note,booking_date,booking_time,created_at",
  });

  const response = await fetch(getSupabaseTableUrl(query.toString()), {
    method: "DELETE",
    headers: getSupabaseHeaders(true),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Не удалось удалить запись в Supabase: ${await readResponseError(response)}`);
  }

  const [deletedRow] = (await response.json()) as SupabaseBookingRow[];

  if (!deletedRow) {
    throw new Error("Запись для удаления не найдена.");
  }

  return {
    booking: mapSupabaseRow(deletedRow),
    storageMode,
  };
}
