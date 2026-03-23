import {
  getSupabaseHeaders,
  getSupabaseTableUrl,
  hasSupabaseServerConfig,
} from "@/lib/supabase";
import type { BookingPayload, BookingRecord, StorageMode } from "@/types/booking";

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

declare global {
  var __demoBookings: BookingRecord[] | undefined;
}

function getDemoBookings() {
  if (!globalThis.__demoBookings) {
    globalThis.__demoBookings = [];
  }

  return globalThis.__demoBookings;
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

async function readResponseError(response: Response) {
  const text = await response.text();
  return text || `HTTP ${response.status}`;
}

function getStorageMode(): StorageMode {
  return hasSupabaseServerConfig() ? "supabase" : "demo";
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
    throw new Error(
      `Не удалось получить записи из Supabase: ${await readResponseError(response)}`,
    );
  }

  const rows = (await response.json()) as SupabaseBookingRow[];

  return {
    bookings: rows.map(mapSupabaseRow),
    storageMode,
  };
}

export async function createBooking(payload: BookingPayload) {
  const storageMode = getStorageMode();

  if (storageMode === "demo") {
    const demoBookings = getDemoBookings();
    const hasConflict = demoBookings.some(
      (booking) =>
        booking.bookingDate === payload.bookingDate &&
        booking.bookingTime === payload.bookingTime,
    );

    if (hasConflict) {
      throw new Error("Этот слот уже занят. Обнови список и выбери другое время.");
    }

    const booking: BookingRecord = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      ...payload,
    };

    demoBookings.push(booking);

    return {
      booking,
      storageMode,
    };
  }

  const query = new URLSearchParams({
    select: "id",
    booking_date: `eq.${payload.bookingDate}`,
    booking_time: `eq.${payload.bookingTime}`,
    limit: "1",
  });

  const existingResponse = await fetch(getSupabaseTableUrl(query.toString()), {
    headers: getSupabaseHeaders(),
    cache: "no-store",
  });

  if (!existingResponse.ok) {
    throw new Error(
      `Не удалось проверить слот: ${await readResponseError(existingResponse)}`,
    );
  }

  const existingRows = (await existingResponse.json()) as Array<{ id: string }>;
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
    throw new Error(
      `Не удалось сохранить запись в Supabase: ${await readResponseError(insertResponse)}`,
    );
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
